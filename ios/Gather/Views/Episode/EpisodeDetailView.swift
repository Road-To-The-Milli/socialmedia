import SwiftUI
import PhotosUI

struct EpisodeDetailView: View {
    let episodeId: String

    @Environment(AppState.self) private var app
    @Environment(ToastCenter.self) private var toasts
    @Environment(\.dismiss) private var dismiss

    @State private var model: EpisodeDetailViewModel
    @State private var draft = ""
    @State private var showReview = false
    @State private var mediaItems: [PhotosPickerItem] = []
    @FocusState private var commentFocused: Bool

    init(episodeId: String) {
        self.episodeId = episodeId
        _model = State(initialValue: EpisodeDetailViewModel(episodeId: episodeId))
    }

    var body: some View {
        ZStack {
            ScreenBackground()
            if model.isLoading, model.episode == nil {
                Loader(label: "Chargement de l'épisode…")
            } else if let episode = model.episode {
                content(episode: episode)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationBarBackButtonHidden(true)
        .task(id: episodeId) { await model.load(userId: app.userId) }
        .sheet(isPresented: $showReview) {
            ReviewView(episodeId: episodeId, spaceId: model.spaceId) {
                Task { await model.reloadReviews(userId: app.userId) }
            }
        }
        .onChange(of: mediaItems) { _, items in
            guard !items.isEmpty else { return }
            Task {
                let media = await MediaLoader.load(items)
                mediaItems = []
                do { try await model.addMedia(media); toasts.success("Médias ajoutés") }
                catch { toasts.error(FriendlyError.message(error)) }
            }
        }
    }

    private func content(episode: Episode) -> some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                // Hero gallery
                MediaGallery(media: episode.media, height: 380)
                    .overlay(alignment: .top) {
                        HStack {
                            IconButton(systemIcon: "chevron.left", size: 42, tint: .white, background: .black.opacity(0.45)) { dismiss() }
                            Spacer()
                            if model.canParticipate {
                                PhotosPicker(selection: $mediaItems, maxSelectionCount: 10, matching: .any(of: [.images, .videos])) {
                                    Image(systemName: "photo.badge.plus")
                                        .font(.system(size: 18, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .frame(width: 42, height: 42)
                                        .background(.black.opacity(0.45), in: Circle())
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                        .padding(.top, 50)
                    }

                VStack(alignment: .leading, spacing: Spacing.xxl) {
                    meta(episode: episode).floatIn()
                    countsRow
                    Divider2()
                    reviewsSection
                    Divider2()
                    commentsSection
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xl)
                .padding(.bottom, Spacing.xxxl)
            }
        }
        .ignoresSafeArea(edges: .top)
        .scrollDismissesKeyboard(.interactively)
    }

    // MARK: - Meta

    private func meta(episode: Episode) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(episode.title).gType(.title)
            HStack(spacing: Spacing.md) {
                if let date = episode.date, !date.isEmpty {
                    Text(DateParse.formatDate(date)).gType(.bodyMuted)
                }
                if let place = episode.place, !place.isEmpty {
                    Label(place, systemImage: "mappin").gType(.bodyMuted).labelStyle(.titleAndIcon)
                }
                if !DateParse.formatDuration(episode.duration).isEmpty {
                    Label(DateParse.formatDuration(episode.duration), systemImage: "clock").gType(.bodyMuted).labelStyle(.titleAndIcon)
                }
            }
            if let tags = episode.tags?.values, !tags.isEmpty {
                FlowTags(tags: tags)
            }
        }
    }

    private var countsRow: some View {
        HStack(spacing: Spacing.xl) {
            Button {
                guard let uid = app.userId else { return }
                Task { await model.toggleLike(userId: uid) }
            } label: {
                HStack(spacing: 7) {
                    Image(systemName: model.likeState.liked ? "heart.fill" : "heart")
                        .font(.system(size: 22))
                    Text("\(model.likeState.count)").font(.system(size: 15, weight: .bold))
                }
                .foregroundStyle(model.likeState.liked ? Palette.primary : Palette.textMuted)
            }
            .buttonStyle(PressableStyle(scale: 0.9))

            HStack(spacing: 7) {
                Image(systemName: "bubble.left").font(.system(size: 21))
                Text("\(model.comments.count)").font(.system(size: 15, weight: .bold))
            }
            .foregroundStyle(Palette.textMuted)
        }
    }

    // MARK: - Reviews

    @ViewBuilder
    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(model.unlocked ? "Les reviews révélées" : "Reviews")

            if model.unlocked {
                if model.reviewers.isEmpty {
                    Text("Personne n'a participé à cet épisode.").gType(.bodyMuted)
                } else {
                    ForEach(model.reviewers) { member in
                        revealedReviewCard(member: member)
                    }
                }
            } else {
                if model.canParticipate {
                    myReviewCard
                } else {
                    GatherCard {
                        HStack(spacing: 10) {
                            Image(systemName: "lock.fill").font(.system(size: 18)).foregroundStyle(Palette.textMuted)
                            Text(model.isObserver
                                ? "En tant qu'observateur, tu ne rédiges pas de review — mais tu peux réagir et commenter."
                                : "Tu pourras écrire ta review une fois promu.")
                                .gType(.bodyMuted)
                        }
                    }
                }
                if !model.reviewers.isEmpty {
                    whoAnsweredCard
                }
            }
        }
    }

    private func revealedReviewCard(member: SpaceMember) -> some View {
        let review = model.reviews.first { $0.authorId == member.userId }
        return GatherCard {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    HStack(spacing: 10) {
                        AvatarView(profile: member.profile, size: 36)
                        Text(member.profile?.name ?? "Membre").gType(.h3)
                    }
                    Spacer()
                    if let rating = review?.rating, rating > 0 {
                        RatingStars(value: rating, size: 16)
                    }
                }
                if let review {
                    ReviewContentRows(review: review)
                } else {
                    Text("N'a pas rédigé de review.").gType(.bodyMuted)
                }
            }
        }
    }

    @ViewBuilder
    private var myReviewCard: some View {
        if let mine = model.myReview {
            GatherCard(glow: true) {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        Label("Ta review est scellée", systemImage: "lock.fill")
                            .gType(.h3).labelStyle(.titleAndIcon)
                        Spacer()
                        if let r = mine.rating, r > 0 { RatingStars(value: r, size: 15) }
                    }
                    Text("Elle sera révélée à tous au déverrouillage de la saison. Toi seul(e) peux la voir d'ici là.").gType(.bodyMuted)
                    GatherButton("Modifier ma review", systemIcon: "pencil", variant: .secondary, fullWidth: true) { showReview = true }
                }
            }
        } else {
            GatherCard(glow: true) {
                VStack(spacing: Spacing.md) {
                    Image(systemName: "pencil").font(.system(size: 24)).foregroundStyle(Palette.primary)
                        .frame(width: 52, height: 52).background(Palette.primarySoft, in: Circle())
                    Text("Écris ta review en privé").gType(.h3).multilineTextAlignment(.center)
                    Text("Ce que tu ressens, ta note, ta citation préférée. Personne ne la verra avant la fin de saison.")
                        .gType(.bodyMuted).multilineTextAlignment(.center)
                    GatherButton("Écrire ma review", fullWidth: true) { showReview = true }
                }
                .frame(maxWidth: .infinity)
            }
            .pulse()
        }
    }

    private var whoAnsweredCard: some View {
        GatherCard {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Qui a déjà répondu").gType(.overline)
                ForEach(model.reviewers) { member in
                    let answered = model.answeredIds.contains(member.userId)
                    HStack(spacing: 10) {
                        AvatarView(profile: member.profile, size: 30)
                        Text(member.profile?.name ?? "Membre").font(.system(size: 15, weight: .semibold)).foregroundStyle(Palette.text)
                        Spacer()
                        HStack(spacing: 5) {
                            Image(systemName: answered ? "checkmark.circle.fill" : "hourglass").font(.system(size: answered ? 16 : 15))
                            Text(answered ? "A répondu" : "En attente").font(.system(size: 12.5, weight: .semibold))
                        }
                        .foregroundStyle(answered ? Palette.success : Palette.textFaint)
                    }
                }
            }
        }
    }

    // MARK: - Comments

    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            SectionHeader("Commentaires\(model.comments.isEmpty ? "" : " · \(model.comments.count)")")

            if model.comments.isEmpty {
                Text("Sois le premier à réagir à ce moment.").gType(.bodyMuted)
            } else {
                ForEach(model.comments) { comment in
                    CommentItem(
                        comment: comment,
                        meId: app.userId,
                        canDelete: comment.authorId == app.userId,
                        onReact: { emoji, active in
                            guard let uid = app.userId else { return }
                            Task { await model.toggleReaction(commentId: comment.id, userId: uid, emoji: emoji, active: active) }
                        },
                        onDelete: { Task { await model.deleteComment(id: comment.id) } }
                    )
                }
            }

            if model.canParticipate {
                HStack(alignment: .bottom, spacing: Spacing.sm) {
                    TextField("", text: $draft, prompt: Text("Ajouter un commentaire…").foregroundColor(Palette.textFaint), axis: .vertical)
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.text)
                        .tint(Palette.primary)
                        .lineLimit(1...4)
                        .focused($commentFocused)
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, 12)
                        .background(Palette.bgElevated, in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).stroke(Palette.border, lineWidth: 1.5))
                    IconButton(systemIcon: "paperplane.fill", variant: .primary, tint: .white, action: sendComment)
                }
                .padding(.top, Spacing.sm)
            } else if model.isObserver {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles").font(.system(size: 14)).foregroundStyle(Palette.textFaint)
                    Text("Les observateurs peuvent réagir aux commentaires existants.").gType(.caption)
                }
                .padding(.vertical, Spacing.sm)
            }
        }
    }

    private func sendComment() {
        guard !draft.trimmed.isEmpty, let uid = app.userId else { return }
        let body = draft
        draft = ""
        commentFocused = false
        Task {
            do { try await model.addComment(userId: uid, body: body) }
            catch { toasts.error(FriendlyError.message(error)); draft = body }
        }
    }
}

// MARK: - Review content rows

struct ReviewContentRows: View {
    var review: Review
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            row("Moment préféré", review.favoriteMoment)
            row("Moment gênant", review.awkwardMoment)
            row("Citation drôle", review.funnyQuote)
            row("Résumé", review.summary)
            if let song = review.song, !song.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "music.note").font(.system(size: 15)).foregroundStyle(Palette.accent)
                    Text(song).font(.system(size: 14, weight: .semibold)).foregroundStyle(Palette.accent).lineLimit(1)
                }
            }
        }
    }

    @ViewBuilder
    private func row(_ label: String, _ value: String?) -> some View {
        if let value, !value.isEmpty {
            VStack(alignment: .leading, spacing: 3) {
                Text(label).gType(.overline)
                Text(value).gType(.body)
            }
        }
    }
}
