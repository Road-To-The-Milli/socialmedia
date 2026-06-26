import SwiftUI

/// Poster-format episode card (2:3) for grids and the featured rail.
struct EpisodePoster: View {
    var episode: Episode
    var width: CGFloat = 144
    var index: Int = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                if let cover = episode.cover {
                    RemoteImage(urlString: cover) { PosterPlaceholder() }
                } else {
                    PosterPlaceholder()
                }
            }
            .frame(width: width, height: width * 1.5)
            .clipped()

            LinearGradient(colors: [.clear, Color(hex: 0x080809).opacity(0.9)],
                           startPoint: .center, endPoint: .bottom)

            VStack(alignment: .leading, spacing: 2) {
                Text(episode.title)
                    .font(.system(size: 14, weight: .bold))
                    .tracking(-0.2)
                    .foregroundStyle(.white)
                    .lineLimit(2)
                if let date = episode.date, !date.isEmpty {
                    Text(DateParse.formatDateShort(date))
                        .font(.system(size: 11.5, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.65))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
        }
        .frame(width: width, height: width * 1.5)
        .clipShape(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).stroke(Palette.border, lineWidth: 1))
        .overlay(alignment: .topTrailing) {
            if episode.mediaCount > 0 {
                HStack(spacing: 4) {
                    Image(systemName: episode.hasVideo ? "video.fill" : "photo.fill").font(.system(size: 10))
                    Text("\(episode.mediaCount)").font(.system(size: 11.5, weight: .bold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(.black.opacity(0.55), in: Capsule())
                .padding(8)
            }
        }
        .cardShadow()
        .floatIn(delay: Double(index) * 0.06)
    }
}

/// Horizontal list row for the timeline view.
struct EpisodeRowCard: View {
    var episode: Episode
    var index: Int = 0

    var body: some View {
        HStack(spacing: Spacing.md) {
            Group {
                if let cover = episode.cover {
                    RemoteImage(urlString: cover) { fallback }
                } else {
                    fallback
                }
            }
            .frame(width: 60, height: 80)
            .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(episode.title).gType(.h3).lineLimit(1)
                HStack(spacing: 8) {
                    if let date = episode.date, !date.isEmpty {
                        Text(DateParse.formatDateShort(date)).gType(.caption)
                    }
                    if let place = episode.place, !place.isEmpty {
                        HStack(spacing: 3) {
                            Image(systemName: "mappin").font(.system(size: 10)).foregroundStyle(Palette.textFaint)
                            Text(place).gType(.caption).lineLimit(1)
                        }
                    }
                }
                if let tags = episode.tags?.values, !tags.isEmpty {
                    HStack(spacing: 5) {
                        ForEach(tags.prefix(2), id: \.self) { BadgeView($0, tone: .muted) }
                    }
                    .padding(.top, 1)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.system(size: 16, weight: .semibold)).foregroundStyle(Palette.textFaint)
        }
        .padding(Spacing.sm)
        .background(Palette.card, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).stroke(Palette.border, lineWidth: 1))
        .floatIn(delay: Double(index) * 0.05)
    }

    private var fallback: some View {
        Palette.surface.overlay(Text("🎬").font(.system(size: 26)))
    }
}
