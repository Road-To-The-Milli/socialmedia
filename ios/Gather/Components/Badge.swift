import SwiftUI

enum BadgeTone {
    case primary, gold, muted, success, destructive, outline

    var bg: Color {
        switch self {
        case .primary: return Palette.primarySoft
        case .gold: return Palette.accentSoft
        case .success: return Palette.successSoft
        case .destructive: return Palette.destructiveSoft
        case .outline: return .clear
        case .muted: return Palette.surface
        }
    }
    var fg: Color {
        switch self {
        case .primary: return Palette.primary
        case .gold: return Palette.accent
        case .success: return Palette.success
        case .destructive: return Palette.destructive
        case .outline, .muted: return Palette.textMuted
        }
    }
    var border: Color? { self == .outline ? Palette.borderStrong : nil }
}

struct BadgeView: View {
    var label: String
    var tone: BadgeTone = .muted
    var systemIcon: String?

    init(_ label: String, tone: BadgeTone = .muted, systemIcon: String? = nil) {
        self.label = label
        self.tone = tone
        self.systemIcon = systemIcon
    }

    var body: some View {
        HStack(spacing: 4) {
            if let systemIcon {
                Image(systemName: systemIcon).font(.system(size: 10, weight: .bold))
            }
            Text(label)
                .font(.system(size: 11.5, weight: .bold))
                .tracking(0.2)
        }
        .foregroundStyle(tone.fg)
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(tone.bg, in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
        .overlay(
            tone.border.map {
                RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).stroke($0, lineWidth: 1)
            }
        )
    }
}

struct RoleBadge: View {
    var role: MemberRole

    var body: some View {
        switch role {
        case .owner: BadgeView("Propriétaire", tone: .gold)
        case .member: BadgeView("Membre", tone: .primary)
        case .observer: BadgeView("Observateur", tone: .muted)
        }
    }
}
