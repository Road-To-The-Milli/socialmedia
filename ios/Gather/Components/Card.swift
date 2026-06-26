import SwiftUI

/// Surface card — slightly lighter than the canvas, subtle border, poster-like shadow.
struct GatherCard<Content: View>: View {
    var elevated: Bool = false
    var glow: Bool = false
    var padded: Bool = true
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(padded ? Spacing.lg : 0)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(elevated ? Palette.cardElevated : Palette.card,
                        in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
                    .stroke(glow ? Palette.primary : Palette.border, lineWidth: 1)
            )
            .glowShadow(glow)
            .cardShadow()
    }
}

/// Cinematic full-screen backdrop with the deep top-to-canvas gradient.
struct ScreenBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Palette.bgDeep, Palette.bg, Palette.bg],
            startPoint: .top, endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}

struct Divider2: View {
    var body: some View {
        Rectangle().fill(Palette.border).frame(height: 1)
    }
}

struct SectionHeader<Trailing: View>: View {
    var title: String
    @ViewBuilder var trailing: () -> Trailing

    init(_ title: String, @ViewBuilder trailing: @escaping () -> Trailing) {
        self.title = title
        self.trailing = trailing
    }

    var body: some View {
        HStack {
            Text(title).gType(.overline)
            Spacer()
            trailing()
        }
    }
}

extension SectionHeader where Trailing == EmptyView {
    init(_ title: String) {
        self.init(title) { EmptyView() }
    }
}
