import SwiftUI

/// Navigation routes pushed onto the Home stack.
enum AppRoute: Hashable {
    case space(String)
    case episode(String)
    case settings
    case notifications
}

struct RootView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        ZStack {
            ScreenBackground()

            if !app.isConfigured {
                ConfigMissingView()
            } else if app.isInitializing {
                SplashView()
            } else if app.isAuthenticated {
                HomeView()
                    .transition(.opacity)
            } else {
                AuthView()
                    .transition(.opacity)
            }

            ToastOverlay()
        }
        .animation(.easeInOut(duration: 0.35), value: app.isAuthenticated)
        .animation(.easeInOut(duration: 0.35), value: app.isInitializing)
    }
}

/// Branded splash shown while the session restores.
struct SplashView: View {
    @State private var appear = false

    var body: some View {
        VStack(spacing: Spacing.lg) {
            BrandMark(size: 88)
                .scaleEffect(appear ? 1 : 0.8)
                .opacity(appear ? 1 : 0)
            Wordmark(size: 32)
                .opacity(appear ? 1 : 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ScreenBackground())
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.6)) { appear = true }
        }
    }
}

/// Shown only if the Supabase env vars failed to load (e.g. before a rebuild).
struct ConfigMissingView: View {
    var body: some View {
        VStack(spacing: Spacing.md) {
            Text("G")
                .font(.system(size: 33, weight: .heavy))
                .foregroundStyle(Palette.primary)
                .frame(width: 72, height: 72)
                .background(Palette.primarySoft, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Palette.border, lineWidth: 1))
                .padding(.bottom, Spacing.sm)
            Text("Configuration en cours").gType(.h2).multilineTextAlignment(.center)
            Text("La connexion au serveur n'est pas encore prête. Ferme et rouvre l'application dans un instant — tout devrait fonctionner.")
                .gType(.bodyMuted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Spacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
