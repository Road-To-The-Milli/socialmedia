import SwiftUI
import Observation

enum ToastStyle {
    case success, error, info
    var icon: String {
        switch self {
        case .success: return "checkmark.circle.fill"
        case .error: return "exclamationmark.triangle.fill"
        case .info: return "info.circle.fill"
        }
    }
    var tint: Color {
        switch self {
        case .success: return Palette.success
        case .error: return Palette.destructive
        case .info: return Palette.accent
        }
    }
}

@MainActor
@Observable
final class ToastCenter {
    struct Item: Identifiable, Equatable {
        let id = UUID()
        var message: String
        var style: ToastStyle
        static func == (a: Item, b: Item) -> Bool { a.id == b.id }
    }

    private(set) var current: Item?
    private var dismissTask: Task<Void, Never>?

    func success(_ message: String) { show(message, .success) }
    func error(_ message: String) { show(message, .error) }
    func info(_ message: String) { show(message, .info) }

    func show(_ message: String, _ style: ToastStyle) {
        current = Item(message: message, style: style)
        if style == .success { Haptics.success() } else { Haptics.light() }
        dismissTask?.cancel()
        dismissTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(3))
            if !Task.isCancelled { self?.current = nil }
        }
    }

    func dismiss() {
        dismissTask?.cancel()
        current = nil
    }
}

/// Top-anchored toast overlay placed once at the app root.
struct ToastOverlay: View {
    @Environment(ToastCenter.self) private var toasts

    var body: some View {
        VStack {
            if let item = toasts.current {
                HStack(spacing: 10) {
                    Image(systemName: item.style.icon)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(item.style.tint)
                    Text(item.message)
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, 14)
                .background(Palette.cardElevated, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                        .stroke(Palette.borderStrong, lineWidth: 1)
                )
                .cardShadow()
                .padding(.horizontal, Spacing.lg)
                .transition(.move(edge: .top).combined(with: .opacity))
                .onTapGesture { toasts.dismiss() }
            }
            Spacer()
        }
        .padding(.top, Spacing.sm)
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: toasts.current)
    }
}
