import SwiftUI

struct SpaceCardView: View {
    var space: SpaceWithMembership
    var index: Int = 0

    private var status: SeasonStatus { Season.status(for: space.space) }
    private var role: MemberRole { Permissions.effectiveRole(space.membership) }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Cover
            Group {
                if let cover = space.space.coverUrl, !cover.isEmpty {
                    RemoteImage(urlString: cover) { coverFallback }
                } else {
                    coverFallback
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 190)
            .clipped()

            // Scrim
            LinearGradient(
                colors: [Color(hex: 0x080809).opacity(0.05), Color(hex: 0x080809).opacity(0.45), Color(hex: 0x080809).opacity(0.92)],
                startPoint: .top, endPoint: .bottom
            )

            VStack {
                HStack(alignment: .top) {
                    topBadge
                    Spacer()
                    RoleBadge(role: role)
                }
                Spacer()
                VStack(alignment: .leading, spacing: 3) {
                    Text(space.space.name)
                        .gType(.h2)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    if let desc = space.space.description, !desc.isEmpty {
                        Text(desc)
                            .font(.system(size: 13.5, weight: .medium))
                            .foregroundStyle(.white.opacity(0.7))
                            .lineLimit(1)
                    } else {
                        HStack(spacing: 5) {
                            Image(systemName: "person.2.fill").font(.system(size: 11))
                            Text("Aventure partagée").font(.system(size: 13, weight: .medium))
                        }
                        .foregroundStyle(.white.opacity(0.6))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(Spacing.md)
        }
        .frame(height: 190)
        .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).stroke(Palette.border, lineWidth: 1))
        .posterShadow()
        .floatIn(delay: Double(index) * 0.07)
    }

    private var coverFallback: some View {
        LinearGradient(colors: [Color(hex: 0x3A1418), Color(hex: 0x1E1012)],
                       startPoint: .top, endPoint: .bottom)
            .overlay(Text("🎬").font(.system(size: 64)).opacity(0.5))
    }

    @ViewBuilder
    private var topBadge: some View {
        switch status.state {
        case .unlocked:
            BadgeView("Débloqué", tone: .gold, systemIcon: "sparkles")
        case .ended:
            BadgeView("À débloquer", tone: .primary, systemIcon: "lock.fill")
        case .ending:
            BadgeView(status.label, tone: .primary)
        default:
            BadgeView(status.label, tone: .muted)
        }
    }
}
