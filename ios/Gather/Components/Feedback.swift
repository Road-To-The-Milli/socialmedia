import SwiftUI

struct Loader: View {
    var label: String? = nil
    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView().tint(Palette.primary)
            if let label {
                Text(label).gType(.bodyMuted)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(Spacing.xl)
    }
}

struct EmptyStateView: View {
    var systemIcon: String? = nil
    var title: String
    var subtitle: String? = nil
    var actionLabel: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: Spacing.sm) {
            if let systemIcon {
                Image(systemName: systemIcon)
                    .font(.system(size: 30))
                    .foregroundStyle(Palette.primary)
                    .frame(width: 76, height: 76)
                    .background(Palette.card, in: Circle())
                    .overlay(Circle().stroke(Palette.border, lineWidth: 1))
                    .padding(.bottom, Spacing.sm)
            }
            Text(title).gType(.h3).multilineTextAlignment(.center)
            if let subtitle {
                Text(subtitle)
                    .gType(.bodyMuted)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 300)
            }
            if let actionLabel, let action {
                GatherButton(actionLabel, action: action)
                    .padding(.top, Spacing.md)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxxl)
        .padding(.horizontal, Spacing.xl)
    }
}
