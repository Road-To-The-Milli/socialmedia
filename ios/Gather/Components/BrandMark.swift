import SwiftUI

/// The "G" logo mark on a red gradient tile, with optional glow.
struct BrandMark: View {
    var size: CGFloat = 64
    var glow: Bool = true

    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [Palette.primary, Palette.primaryDark],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: size, height: size)
            .overlay(
                Text("G")
                    .font(.system(size: size * 0.56, weight: .black))
                    .tracking(-1)
                    .foregroundStyle(.white)
            )
            .glowShadow(glow)
    }
}

/// The "Gather" wordmark.
struct Wordmark: View {
    var size: CGFloat = 26
    var body: some View {
        Text("Gather")
            .font(.system(size: size, weight: .heavy))
            .tracking(-0.8)
            .foregroundStyle(Palette.text)
    }
}
