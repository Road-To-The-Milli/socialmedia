import SwiftUI

enum ButtonVariant {
    case primary, secondary, outline, ghost, destructive, gold, subtle

    var bg: Color {
        switch self {
        case .primary: return Palette.primary
        case .secondary: return Palette.surface
        case .outline, .ghost: return .clear
        case .destructive: return Palette.destructive
        case .gold: return Palette.accent
        case .subtle: return Palette.primarySoft
        }
    }
    var fg: Color {
        switch self {
        case .primary, .destructive: return .white
        case .secondary, .outline, .ghost: return Palette.text
        case .gold: return Palette.goldFg
        case .subtle: return Palette.primary
        }
    }
    var border: Color? { self == .outline ? Palette.borderStrong : nil }
}

enum ButtonSize {
    case sm, md, lg
    var height: CGFloat { self == .sm ? 38 : self == .md ? 48 : 54 }
    var font: CGFloat { self == .sm ? 14 : self == .md ? 15 : 16 }
    var padding: CGFloat { self == .sm ? 14 : self == .md ? 18 : 22 }
}

struct GatherButton: View {
    var title: String?
    var systemIcon: String?
    var iconTrailing: String?
    var variant: ButtonVariant = .primary
    var size: ButtonSize = .md
    var loading: Bool = false
    var disabled: Bool = false
    var fullWidth: Bool = false
    var action: () -> Void

    init(
        _ title: String? = nil,
        systemIcon: String? = nil,
        iconTrailing: String? = nil,
        variant: ButtonVariant = .primary,
        size: ButtonSize = .md,
        loading: Bool = false,
        disabled: Bool = false,
        fullWidth: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.systemIcon = systemIcon
        self.iconTrailing = iconTrailing
        self.variant = variant
        self.size = size
        self.loading = loading
        self.disabled = disabled
        self.fullWidth = fullWidth
        self.action = action
    }

    private var isDisabled: Bool { disabled || loading }

    var body: some View {
        Button {
            if !isDisabled { action() }
        } label: {
            HStack(spacing: size == .sm ? 7 : 9) {
                if loading {
                    ProgressView().tint(variant.fg).scaleEffect(0.85)
                } else {
                    if let systemIcon {
                        Image(systemName: systemIcon).font(.system(size: size.font + 2, weight: .semibold))
                    }
                    if let title {
                        Text(title).font(.system(size: size.font, weight: .bold)).tracking(-0.2)
                    }
                    if let iconTrailing {
                        Image(systemName: iconTrailing).font(.system(size: size.font + 1, weight: .semibold))
                    }
                }
            }
            .foregroundStyle(variant.fg)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(height: size.height)
            .padding(.horizontal, size.padding)
            .background(variant.bg, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
            .overlay(
                variant.border.map {
                    RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke($0, lineWidth: 1.5)
                }
            )
            .opacity(isDisabled ? 0.5 : 1)
        }
        .buttonStyle(PressableStyle(scale: 0.97))
        .disabled(isDisabled)
    }
}

/// Compact circular icon button.
struct IconButton: View {
    var systemIcon: String
    var variant: ButtonVariant = .secondary
    var size: CGFloat = 42
    var tint: Color? = nil
    var background: Color? = nil
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemIcon)
                .font(.system(size: size * 0.42, weight: .semibold))
                .foregroundStyle(tint ?? variant.fg)
                .frame(width: size, height: size)
                .background(background ?? variant.bg, in: Circle())
                .overlay(
                    variant.border.map { Circle().stroke($0, lineWidth: 1.5) }
                )
        }
        .buttonStyle(PressableStyle(scale: 0.9))
    }
}
