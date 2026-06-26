import SwiftUI

let reactionEmojis = ["❤️", "😂", "😮", "🔥", "🥹", "👏"]

struct CommentItem: View {
    var comment: EpisodeComment
    var meId: String?
    var canDelete: Bool
    var onReact: (String, Bool) -> Void
    var onDelete: () -> Void

    @State private var showPicker = false

    private struct Grouped { var count: Int; var mine: Bool }

    private var grouped: [(emoji: String, info: Grouped)] {
        var map: [String: Grouped] = [:]
        for r in comment.reactions ?? [] {
            var g = map[r.emoji] ?? Grouped(count: 0, mine: false)
            g.count += 1
            if r.userId == meId { g.mine = true }
            map[r.emoji] = g
        }
        return map.sorted { $0.key < $1.key }.map { ($0.key, $0.value) }
    }

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            AvatarView(profile: comment.profile, size: 36)
            VStack(alignment: .leading, spacing: 6) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(comment.profile?.name ?? "Membre").font(.system(size: 13.5, weight: .bold)).foregroundStyle(Palette.text)
                        Spacer()
                        Text(DateParse.formatRelative(comment.createdAt)).gType(.caption)
                    }
                    Text(comment.body).gType(.body)
                }
                .padding(Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.card, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).stroke(Palette.border, lineWidth: 1))

                HStack(spacing: 6) {
                    ForEach(grouped, id: \.emoji) { item in
                        Button { onReact(item.emoji, item.info.mine) } label: {
                            HStack(spacing: 4) {
                                Text(item.emoji).font(.system(size: 13))
                                Text("\(item.info.count)").font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(item.info.mine ? Palette.primary : Palette.textMuted)
                            }
                            .padding(.horizontal, 9).padding(.vertical, 4)
                            .background(item.info.mine ? Palette.primarySoft : Palette.surface, in: Capsule())
                            .overlay(item.info.mine ? Capsule().stroke(Palette.primary, lineWidth: 1) : nil)
                        }
                        .buttonStyle(PressableStyle(scale: 0.9))
                    }
                    Button { withAnimation { showPicker.toggle() } } label: {
                        Image(systemName: "plus").font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.textFaint)
                            .padding(.horizontal, 6).padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                    if canDelete {
                        Button(action: onDelete) {
                            Image(systemName: "trash").font(.system(size: 13)).foregroundStyle(Palette.textFaint)
                        }
                        .buttonStyle(.plain)
                    }
                }

                if showPicker {
                    HStack(spacing: 4) {
                        ForEach(reactionEmojis, id: \.self) { emoji in
                            Button {
                                let mine = grouped.first { $0.emoji == emoji }?.info.mine ?? false
                                onReact(emoji, mine)
                                showPicker = false
                            } label: {
                                Text(emoji).font(.system(size: 19)).padding(4)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(6)
                    .background(Palette.cardElevated, in: Capsule())
                    .overlay(Capsule().stroke(Palette.border, lineWidth: 1))
                }
            }
        }
    }
}
