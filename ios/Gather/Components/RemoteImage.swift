import SwiftUI

/// Async remote image with a cinematic placeholder. Backed by URLSession's shared
/// URLCache so posters aren't re-fetched while scrolling.
struct RemoteImage<Placeholder: View>: View {
    let urlString: String?
    var contentMode: ContentMode = .fill
    @ViewBuilder var placeholder: () -> Placeholder

    var body: some View {
        if let urlString, let url = URL(string: urlString) {
            AsyncImage(url: url, transaction: Transaction(animation: .easeOut(duration: 0.25))) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().aspectRatio(contentMode: contentMode)
                case .failure:
                    placeholder()
                case .empty:
                    ZStack {
                        placeholder()
                        ProgressView().tint(Palette.textFaint)
                    }
                @unknown default:
                    placeholder()
                }
            }
        } else {
            placeholder()
        }
    }
}

/// Default poster placeholder: a dark red gradient with a film emoji.
struct PosterPlaceholder: View {
    var emoji: String = "🎬"
    var emojiSize: CGFloat = 44
    var body: some View {
        LinearGradient(colors: [Color(hex: 0x2A1518), Color(hex: 0x171012)],
                       startPoint: .top, endPoint: .bottom)
            .overlay(Text(emoji).font(.system(size: emojiSize)).opacity(0.55))
    }
}
