import SwiftUI

/// Fade + translateY entrance, staggered by `delay`. Mirrors the web FadeIn.
struct FloatIn: ViewModifier {
    var delay: Double = 0
    @State private var shown = false

    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown ? 0 : 12)
            .onAppear {
                withAnimation(.easeOut(duration: 0.45).delay(delay)) { shown = true }
            }
    }
}

extension View {
    func floatIn(delay: Double = 0) -> some View { modifier(FloatIn(delay: delay)) }
}

/// Subtle looping pulse for attention elements (e.g. "unlock" CTA).
struct Pulse: ViewModifier {
    @State private var animate = false
    func body(content: Content) -> some View {
        content
            .scaleEffect(animate ? 1.03 : 1)
            .opacity(animate ? 1 : 0.92)
            .animation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true), value: animate)
            .onAppear { animate = true }
    }
}

extension View {
    func pulse() -> some View { modifier(Pulse()) }
}
