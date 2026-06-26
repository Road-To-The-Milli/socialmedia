import SwiftUI

/// Gather — dark-only, Netflix-inspired theme.
/// Deep black canvas, contrasted poster cards, vivid red accent, rare gold highlights.
nonisolated enum Palette {
    // Canvas
    static let bg = Color(hex: 0x141416)
    static let bgDeep = Color(hex: 0x0B0B0C)
    static let bgElevated = Color(hex: 0x1B1B1E)

    // Surfaces
    static let card = Color(hex: 0x1C1C1F)
    static let cardElevated = Color(hex: 0x242428)
    static let surface = Color(hex: 0x2A2A2E)

    // Lines
    static let border = Color(hex: 0x303034)
    static let borderStrong = Color(hex: 0x3D3D42)

    // Text
    static let text = Color(hex: 0xF7F7F7)
    static let textMuted = Color(hex: 0x9B9BA2)
    static let textFaint = Color(hex: 0x67676E)

    // Brand
    static let primary = Color(hex: 0xEF233C)
    static let primaryDark = Color(hex: 0xC2182C)
    static let primarySoft = Color(hex: 0xEF233C).opacity(0.14)
    static let primaryFg = Color.white

    // Highlights
    static let accent = Color(hex: 0xCDBE57)
    static let accentSoft = Color(hex: 0xCDBE57).opacity(0.16)
    static let goldFg = Color(hex: 0x1A1607)

    // Status
    static let success = Color(hex: 0x3DD27E)
    static let successSoft = Color(hex: 0x3DD27E).opacity(0.14)
    static let warning = Color(hex: 0xE8A13A)
    static let destructive = Color(hex: 0xE63946)
    static let destructiveSoft = Color(hex: 0xE63946).opacity(0.16)
}

nonisolated enum Radius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 10
    static let lg: CGFloat = 12
    static let xl: CGFloat = 16
    static let xxl: CGFloat = 22
    static let pill: CGFloat = 999
}

nonisolated enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 28
    static let xxxl: CGFloat = 40
}

// MARK: - Typography

nonisolated enum TypeStyle {
    case display, title, h2, h3, body, bodyMuted, label, caption, overline

    var size: CGFloat {
        switch self {
        case .display: return 33
        case .title: return 26
        case .h2: return 20
        case .h3: return 17
        case .body, .bodyMuted: return 15
        case .label: return 13
        case .caption: return 12
        case .overline: return 11
        }
    }

    var weight: Font.Weight {
        switch self {
        case .display, .title: return .heavy
        case .h2, .h3, .overline: return .bold
        case .label, .caption: return .semibold
        case .body, .bodyMuted: return .medium
        }
    }

    var tracking: CGFloat {
        switch self {
        case .display: return -0.8
        case .title: return -0.6
        case .h2: return -0.3
        case .h3: return -0.2
        case .overline: return 1.4
        case .caption: return 0.2
        default: return 0
        }
    }

    var color: Color {
        switch self {
        case .bodyMuted, .label: return Palette.textMuted
        case .caption, .overline: return Palette.textFaint
        default: return Palette.text
        }
    }

    var uppercased: Bool { self == .overline }
}

private struct TypeModifier: ViewModifier {
    let style: TypeStyle
    func body(content: Content) -> some View {
        content
            .font(.system(size: style.size, weight: style.weight))
            .tracking(style.tracking)
            .textCase(style.uppercased ? .uppercase : nil)
            .foregroundStyle(style.color)
    }
}

extension View {
    func gType(_ style: TypeStyle) -> some View { modifier(TypeModifier(style: style)) }
}

// MARK: - Shadows

extension View {
    func posterShadow() -> some View { shadow(color: .black.opacity(0.55), radius: 22, x: 0, y: 16) }
    func cardShadow() -> some View { shadow(color: .black.opacity(0.4), radius: 13, x: 0, y: 8) }
    func glowShadow(_ active: Bool = true) -> some View {
        shadow(color: active ? Palette.primary.opacity(0.45) : .clear, radius: active ? 18 : 0)
    }
}

// MARK: - Color hex

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}
