import SwiftUI

struct NotificationsView: View {
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss

    @State private var notifications: [AppNotification] = []
    @State private var isLoading = true

    private var hasUnread: Bool { notifications.contains { $0.isUnread } }

    var body: some View {
        ZStack {
            ScreenBackground()
            ScrollView(showsIndicators: false) {
                VStack(spacing: Spacing.sm) {
                    if isLoading {
                        Loader(label: "Chargement…").frame(height: 240)
                    } else if notifications.isEmpty {
                        EmptyStateView(
                            systemIcon: "tray",
                            title: "Rien de neuf",
                            subtitle: "Les nouveautés de tes espaces (épisodes, commentaires, idées, déverrouillages) apparaîtront ici."
                        )
                    } else {
                        ForEach(Array(notifications.enumerated()), id: \.element.id) { i, n in
                            row(n, index: i)
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.sm)
                .padding(.bottom, Spacing.xxxl)
            }
            .refreshable { await load() }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { dismiss() } label: { Image(systemName: "chevron.left").foregroundStyle(Palette.text) }
            }
            if hasUnread {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { markAll() } label: {
                        HStack(spacing: 5) {
                            Image(systemName: "checkmark.circle").font(.system(size: 14))
                            Text("Tout lu").font(.system(size: 13, weight: .bold))
                        }
                        .foregroundStyle(Palette.primary)
                    }
                }
            }
        }
        .toolbarBackground(Palette.bgDeep, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .task { await load() }
    }

    private func row(_ n: AppNotification, index: Int) -> some View {
        let unread = n.isUnread
        return Button {
            if unread { markRead(n) }
        } label: {
            HStack(alignment: .top, spacing: Spacing.md) {
                Image(systemName: "bell.badge.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(unread ? Palette.primary : Palette.textMuted)
                    .frame(width: 40, height: 40)
                    .background(unread ? Palette.primarySoft : Palette.surface, in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    if let title = n.title, !title.isEmpty {
                        Text(title).font(.system(size: 14.5, weight: .bold)).foregroundStyle(Palette.text).lineLimit(1)
                    }
                    if let body = n.body, !body.isEmpty {
                        Text(body).gType(.bodyMuted).lineLimit(2)
                    }
                    Text(DateParse.formatRelative(n.createdAt)).gType(.caption).padding(.top, 2)
                }
                Spacer(minLength: 0)
                if unread {
                    Circle().fill(Palette.primary).frame(width: 9, height: 9).padding(.top, 4)
                }
            }
            .padding(Spacing.md)
            .background(unread ? Palette.cardElevated : Palette.card, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).stroke(unread ? Palette.borderStrong : Palette.border, lineWidth: 1))
        }
        .buttonStyle(PressableStyle(scale: 0.98, haptic: false))
        .floatIn(delay: Double(index) * 0.035)
    }

    private func load() async {
        guard let uid = app.userId else { return }
        notifications = (try? await NotificationService.notifications(userId: uid)) ?? []
        isLoading = false
    }

    private func markRead(_ n: AppNotification) {
        Task {
            try? await NotificationService.markRead(id: n.id)
            await load()
        }
    }

    private func markAll() {
        guard let uid = app.userId else { return }
        Task {
            try? await NotificationService.markAllRead(userId: uid)
            await load()
        }
    }
}
