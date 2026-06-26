import SwiftUI
import UIKit

/// Light haptic feedback helper.
@MainActor
enum Haptics {
    static func light() {
        let g = UIImpactFeedbackGenerator(style: .light)
        g.impactOccurred()
    }
    static func soft() {
        let g = UIImpactFeedbackGenerator(style: .soft)
        g.impactOccurred()
    }
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}

/// Button style that scales on press (≈0.97) with a light haptic — mirrors PressableScale.
struct PressableStyle: ButtonStyle {
    var scale: CGFloat = 0.97
    var haptic: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.6), value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed && haptic { Haptics.light() }
            }
    }
}

extension View {
    /// Convenience: wraps tap handling in a Button with the press-scale style.
    func pressable(scale: CGFloat = 0.97, haptic: Bool = true, action: @escaping () -> Void) -> some View {
        Button(action: action) { self }
            .buttonStyle(PressableStyle(scale: scale, haptic: haptic))
    }
}
