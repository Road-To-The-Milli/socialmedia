import SwiftUI

struct SpaceDashboardView: View {
    var selectTab: (SpaceTab) -> Void

    @Environment(SpaceStore.self) private var store
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss

    @State private var showCreateEpisode = false
    @State private var showSettings = false

    var body: some View {
        ZStack {
            ScreenBackground()
            if store.loadingSpace, store.space == nil {
                Loader(label: "Ouverture de l'espace…")
            } else if let space = store.space {
                content(space: space)
            }
        }
        .sheet(isPresented: $showCreateEpisode) {
            CreateEpisodeView(spaceId: store.spaceId) {
                Task { await store.reloadEpisodes() }
            }
        }
        .sheet(isPresented: $showSettings) {
            SpaceSettingsView(
                onSaved: { Task { await store.reloadSpace(userId: app.userId ?? "") } },
                onDeleted: { showSettings = false; dismiss() }
            )
            .environment(store)
        }
    }

    @ViewBuilder
    private func content(space: Space) -> some View {
        let status = Season.status(for: space)
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                hero(space: space, status: status)

                VStack(spacing: Spacing.xxl) {
                    seasonCard(space: space, status: status).floatIn()
                    statsRow.floatIn(delay: 0.08)
                    featured.floatIn(delay: 0.14)
                    membersPreview.floatIn(delay: 0.2)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
        }
        .ignoresSafeArea(edges: .top)
    }

    // MARK: - Hero

    private func hero(space: Space, status: SeasonStatus) -> some View {
        ZStack(alignment: .bottom) {
            Group {
                if let cover = space.coverUrl, !cover.isEmpty {
                    RemoteImage(urlString: cover) { heroFallback }
                } else {
                    heroFallback
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 300)
            .clipped()

            LinearGradient(
                colors: [Color(hex: 0x080809).opacity(0.4), Color(hex: 0x080809).opacity(0.1), Palette.bg],
                startPoint: .top, endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: Spacing.sm) {
                if status.state == .unlocked {
                    BadgeView("Saison débloquée", tone: .gold, systemIcon: "sparkles")
                } else {
                    BadgeView(status.label, tone: (status.state == .ending || status.state == .ended) ? .primary : .muted)
                }
                Text(space.name)
                    .font(.system(size: 30, weight: .heavy)).tracking(-0.8)
                    .foregroundStyle(.white).lineLimit(2)
                if let desc = space.description, !desc.isEmpty {
                    Text(desc).font(.system(size: 14.5, weight: .medium))
                        .foregroundStyle(.white.opacity(0.75)).lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Spacing.lg)
        }
        .frame(height: 300)
        .overlay(alignment: .top) {
            HStack {
                IconButton(systemIcon: "chevron.left", size: 42, tint: .white, background: .black.opacity(0.4)) { dismiss() }
                Spacer()
                if store.isOwner {
                    IconButton(systemIcon: "gearshape.fill", size: 42, tint: .white, background: .black.opacity(0.4)) { showSettings = true }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, 54)
        }
    }

    private var heroFallback: some View {
        LinearGradient(colors: [Color(hex: 0x3A1418), Color(hex: 0x1A1012)], startPoint: .top, endPoint: .bottom)
    }

    // MARK: - Season card

    private func seasonCard(space: Space, status: SeasonStatus) -> some View {
        GatherCard(elevated: true) {
            VStack(spacing: Spacing.md) {
                HStack {
                    Text("Saison").gType(.overline)
                    Spacer()
                    Text("\(space.seasonStart.map(DateParse.formatDate) ?? "—") → \(space.seasonEnd.map(DateParse.formatDate) ?? "—")")
                        .gType(.caption)
                }
                ProgressBar(progress: status.progress)

                seasonCTA(space: space, status: status)
            }
        }
    }

    @ViewBuilder
    private func seasonCTA(space: Space, status: SeasonStatus) -> some View {
        switch status.state {
        case .unlocked:
            GatherButton("Voir le bilan de la saison", systemIcon: "sparkles", variant: .gold, fullWidth: true) { selectTab(.recap) }
        case .ended:
            if store.isOwner {
                GatherButton("Débloquer la saison", systemIcon: "lock.fill", fullWidth: true) { selectTab(.recap) }
                    .pulse()
            } else {
                HStack(spacing: 8) {
                    Image(systemName: "lock.fill").font(.system(size: 14)).foregroundStyle(Palette.textMuted)
                    Text("En attente du déverrouillage par le propriétaire").gType(.bodyMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
            }
        default:
            HStack {
                Text(status.daysLeft != nil ? "\(status.daysLeft!) j avant la révélation" : "Saison en cours").gType(.bodyMuted)
                Spacer()
                GatherButton("Aperçu du bilan", variant: .ghost, size: .sm) { selectTab(.recap) }
            }
        }
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: Spacing.md) {
            StatTile(label: "Épisodes", value: store.episodes.count, icon: "sparkles", tint: Palette.primary) { selectTab(.episodes) }
            StatTile(label: "Membres", value: store.members.count, icon: "person.2.fill", tint: Palette.accent) { selectTab(.members) }
            StatTile(label: "Idées", value: store.ideas.count, icon: "lightbulb.fill", tint: Color(hex: 0x5B8DEF)) { selectTab(.ideas) }
        }
    }

    // MARK: - Featured episodes

    private var featured: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader("À la une") {
                Button { selectTab(.episodes) } label: {
                    Text("Tout voir").font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.primary)
                }
                .buttonStyle(.plain)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.md) {
                    if store.canParticipate {
                        Button { showCreateEpisode = true } label: { newEpisodeCard }
                            .buttonStyle(PressableStyle(scale: 0.96))
                    }
                    ForEach(Array(store.episodes.prefix(8).enumerated()), id: \.element.id) { i, ep in
                        NavigationLink(value: AppRoute.episode(ep.id)) {
                            EpisodePoster(episode: ep, index: i)
                        }
                        .buttonStyle(PressableStyle(scale: 0.97))
                    }
                    if store.episodes.isEmpty && !store.canParticipate {
                        Text("Aucun épisode pour l'instant.")
                            .gType(.bodyMuted)
                            .frame(width: 240, height: 216)
                            .background(Palette.card, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
                    }
                }
                .padding(.trailing, Spacing.sm)
            }
        }
    }

    private var newEpisodeCard: some View {
        VStack(spacing: 10) {
            Image(systemName: "plus").font(.system(size: 24, weight: .semibold)).foregroundStyle(Palette.primary)
                .frame(width: 46, height: 46).background(Palette.primarySoft, in: Circle())
            Text("Nouvel épisode").font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.textMuted)
        }
        .frame(width: 144, height: 216)
        .background(Palette.card, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [6]))
                .foregroundStyle(Palette.borderStrong)
        )
    }

    // MARK: - Members preview

    private var membersPreview: some View {
        Button { selectTab(.members) } label: {
            HStack(spacing: Spacing.md) {
                AvatarStack(profiles: store.members.map { $0.profile }, size: 34)
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(store.members.count) membre\(store.members.count > 1 ? "s" : "")").gType(.h3)
                    Text(store.isOwner ? "Gère les rôles et les invitations" : "Voir qui partage l'aventure").gType(.caption)
                }
                Spacer()
                Text(store.isOwner ? "Gérer" : "Voir").font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.primary)
            }
            .padding(Spacing.md)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).stroke(Palette.border, lineWidth: 1))
            .cardShadow()
        }
        .buttonStyle(PressableStyle(scale: 0.98))
    }
}

private struct StatTile: View {
    var label: String
    var value: Int
    var icon: String
    var tint: Color
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon).font(.system(size: 18)).foregroundStyle(tint)
                Text("\(value)").font(.system(size: 22, weight: .heavy)).foregroundStyle(Palette.text)
                Text(label).gType(.caption)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).stroke(Palette.border, lineWidth: 1))
        }
        .buttonStyle(PressableStyle(scale: 0.95))
    }
}

struct ProgressBar: View {
    var progress: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.surface)
                Capsule()
                    .fill(LinearGradient(colors: [Palette.primary, Palette.primaryDark], startPoint: .leading, endPoint: .trailing))
                    .frame(width: max(geo.size.width * 0.04, geo.size.width * progress))
            }
        }
        .frame(height: 7)
    }
}
