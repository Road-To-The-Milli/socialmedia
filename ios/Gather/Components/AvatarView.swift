import SwiftUI

private let avatarColors: [Color] = [
    Color(hex: 0xEF233C), Color(hex: 0xCDBE57), Color(hex: 0x3DD27E),
    Color(hex: 0x5B8DEF), Color(hex: 0xB05BEF), Color(hex: 0xEF8C5B), Color(hex: 0x3DC9D2),
]

private func hashString(_ s: String) -> Int {
    var h = 0
    for scalar in s.unicodeScalars { h = (h &* 31) &+ Int(scalar.value) }
    return abs(h)
}

private func initials(_ name: String?) -> String {
    guard let name, !name.trimmed.isEmpty else { return "?" }
    let parts = name.trimmed.split(separator: " ").map(String.init).filter { !$0.isEmpty }
    if parts.isEmpty { return "?" }
    if parts.count == 1 { return String(parts[0].prefix(2)).uppercased() }
    return (String(parts.first!.prefix(1)) + String(parts.last!.prefix(1))).uppercased()
}

struct AvatarView: View {
    var profile: Profile? = nil
    var name: String? = nil
    var size: CGFloat = 44
    var ring: Bool = false

    private var displayName: String? { profile?.name ?? name }
    private var imageURL: String? { profile?.avatarUrl }

    var body: some View {
        let bg = avatarColors[hashString(displayName ?? "?") % avatarColors.count]
        Circle()
            .fill(bg)
            .frame(width: size, height: size)
            .overlay {
                if let imageURL, !imageURL.isEmpty {
                    RemoteImage(urlString: imageURL) { Color.clear }
                } else {
                    Text(initials(displayName))
                        .font(.system(size: size * 0.38, weight: .heavy))
                        .foregroundStyle(.white)
                }
            }
            .clipShape(Circle())
            .overlay(ring ? Circle().stroke(Palette.bg, lineWidth: 2) : nil)
    }
}

/// Overlapping avatar row.
struct AvatarStack: View {
    var profiles: [Profile?]
    var size: CGFloat = 30
    var max: Int = 4

    var body: some View {
        let shown = Array(profiles.prefix(max))
        let extra = profiles.count - shown.count
        HStack(spacing: -size * 0.34) {
            ForEach(Array(shown.enumerated()), id: \.offset) { _, p in
                AvatarView(profile: p, size: size, ring: true)
            }
            if extra > 0 {
                Circle()
                    .fill(Palette.surface)
                    .frame(width: size, height: size)
                    .overlay(
                        Text("+\(extra)")
                            .font(.system(size: size * 0.34, weight: .bold))
                            .foregroundStyle(Palette.textMuted)
                    )
                    .overlay(Circle().stroke(Palette.bg, lineWidth: 2))
            }
        }
    }
}
