import SwiftUI
import AVKit

/// Horizontally paging media gallery with a tap-to-open full-screen viewer.
struct MediaGallery: View {
    var media: [EpisodeMedia]
    var height: CGFloat = 360
    var emoji: String = "🎬"

    @State private var index: Int = 0
    @State private var viewerIndex: Int?

    var body: some View {
        Group {
            if media.isEmpty {
                LinearGradient(colors: [Color(hex: 0x3A1418), Color(hex: 0x1A1012)],
                               startPoint: .top, endPoint: .bottom)
                    .frame(height: height)
                    .overlay(Text(emoji).font(.system(size: 74)).opacity(0.5))
            } else {
                ZStack(alignment: .bottom) {
                    TabView(selection: $index) {
                        ForEach(Array(media.enumerated()), id: \.element.id) { i, item in
                            mediaPage(item)
                                .tag(i)
                                .onTapGesture { viewerIndex = i }
                        }
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                    .frame(height: height)

                    if media.count > 1 {
                        PageDots(count: media.count, index: index)
                            .padding(.bottom, Spacing.md)
                    }
                }
                .frame(height: height)
            }
        }
        .fullScreenCover(item: Binding(
            get: { viewerIndex.map { IndexBox(value: $0) } },
            set: { viewerIndex = $0?.value }
        )) { box in
            MediaViewer(media: media, initialIndex: box.value) { viewerIndex = nil }
        }
    }

    @ViewBuilder
    private func mediaPage(_ item: EpisodeMedia) -> some View {
        if item.isVideo {
            ZStack {
                Color(hex: 0x0A0A0B)
                VStack(spacing: 10) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 26))
                        .foregroundStyle(.white)
                        .frame(width: 64, height: 64)
                        .background(Color.white.opacity(0.14), in: Circle())
                    Text("Lire la vidéo")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
        } else {
            Color.black.overlay {
                RemoteImage(urlString: item.url) { PosterPlaceholder(emoji: emoji, emojiSize: 64) }
            }
            .clipped()
        }
    }
}

private struct IndexBox: Identifiable {
    let value: Int
    var id: Int { value }
}

struct PageDots: View {
    var count: Int
    var index: Int
    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<count, id: \.self) { i in
                Capsule()
                    .fill(i == index ? Color.white : Color.white.opacity(0.45))
                    .frame(width: i == index ? 20 : 6, height: 6)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: index)
            }
        }
    }
}

/// Full-screen swipeable viewer with video controls.
struct MediaViewer: View {
    var media: [EpisodeMedia]
    var initialIndex: Int
    var onClose: () -> Void

    @State private var index: Int

    init(media: [EpisodeMedia], initialIndex: Int, onClose: @escaping () -> Void) {
        self.media = media
        self.initialIndex = initialIndex
        self.onClose = onClose
        _index = State(initialValue: initialIndex)
    }

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.ignoresSafeArea()

            TabView(selection: $index) {
                ForEach(Array(media.enumerated()), id: \.element.id) { i, item in
                    Group {
                        if item.isVideo, let url = URL(string: item.url) {
                            VideoPlayer(player: AVPlayer(url: url))
                        } else {
                            RemoteImage(urlString: item.url, contentMode: .fit) { Color.black }
                        }
                    }
                    .tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea()

            HStack {
                Spacer()
                IconButton(systemIcon: "xmark", size: 44, tint: .white,
                           background: Color.white.opacity(0.15), action: onClose)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.sm)

            if media.count > 1 {
                VStack {
                    Spacer()
                    PageDots(count: media.count, index: index).padding(.bottom, 40)
                }
            }
        }
    }
}
