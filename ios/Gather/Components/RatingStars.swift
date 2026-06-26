import SwiftUI

/// Five-star rating. Read-only when `onChange` is nil.
struct RatingStars: View {
    var value: Int
    var size: CGFloat = 22
    var spacing: CGFloat = 4
    var onChange: ((Int) -> Void)? = nil

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(1...5, id: \.self) { star in
                let filled = star <= value
                let icon = Image(systemName: filled ? "star.fill" : "star")
                    .font(.system(size: size))
                    .foregroundStyle(filled ? Palette.accent : Palette.borderStrong)
                if let onChange {
                    Button {
                        onChange(star == value ? 0 : star)
                    } label: { icon }
                    .buttonStyle(PressableStyle(scale: 0.85))
                } else {
                    icon
                }
            }
        }
    }
}
