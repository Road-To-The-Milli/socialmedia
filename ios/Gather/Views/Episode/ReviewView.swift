import SwiftUI

struct ReviewView: View {
    let episodeId: String
    let spaceId: String
    var onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var app
    @Environment(ToastCenter.self) private var toasts

    @State private var episodeTitle: String?
    @State private var rating = 0
    @State private var favorite = ""
    @State private var awkward = ""
    @State private var quote = ""
    @State private var summary = ""
    @State private var song = ""
    @State private var loading = false
    @State private var hydrated = false

    var body: some View {
        ZStack {
            ScreenBackground()
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Ma review").gType(.title)
                            if let title = episodeTitle { Text(title).gType(.caption).lineLimit(1) }
                        }
                        Spacer()
                        IconButton(systemIcon: "xmark", size: 40) { dismiss() }
                    }

                    GatherCard(glow: true) {
                        HStack(spacing: 10) {
                            Image(systemName: "lock.fill").font(.system(size: 16)).foregroundStyle(Palette.accent)
                            Text("Privée jusqu'au déverrouillage. Toi seul(e) la vois pour l'instant.")
                                .gType(.caption).foregroundStyle(Palette.textMuted)
                        }
                    }
                    .floatIn()

                    VStack(alignment: .leading, spacing: Spacing.xl) {
                        VStack(spacing: Spacing.sm) {
                            Text("Ta note").gType(.overline)
                            RatingStars(value: rating, size: 34, spacing: 8) { rating = $0 }
                        }
                        .frame(maxWidth: .infinity)

                        Field(label: "🤩 Ton moment préféré") {
                            GatherTextField(placeholder: "Quand on a…", text: $favorite, multiline: true)
                        }
                        Field(label: "😬 Le moment gênant") {
                            GatherTextField(placeholder: "Un petit malaise mémorable ?", text: $awkward, multiline: true)
                        }
                        Field(label: "😂 La citation drôle") {
                            GatherTextField(placeholder: "« … »", text: $quote, multiline: true)
                        }
                        Field(label: "📝 Ton résumé") {
                            GatherTextField(placeholder: "En quelques mots, ce que tu retiens…", text: $summary, multiline: true)
                        }
                        Field(label: "Le son de ce moment") {
                            GatherTextField(placeholder: "Titre ou lien musique", text: $song,
                                            systemIcon: "music.note", autocapitalization: .never)
                        }
                        GatherButton("Enregistrer ma review", size: .lg, loading: loading, fullWidth: true, action: submit)
                    }
                    .floatIn(delay: 0.08)
                }
                .padding(Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
        }
        .presentationBackground(Palette.bg)
        .task { await hydrate() }
    }

    private func hydrate() async {
        if let episode = try? await EpisodeService.episode(id: episodeId) { episodeTitle = episode.title }
        guard !hydrated, let uid = app.userId,
              let mine = try? await ReviewService.myReview(episodeId: episodeId, userId: uid) else { return }
        rating = mine.rating ?? 0
        favorite = mine.favoriteMoment ?? ""
        awkward = mine.awkwardMoment ?? ""
        quote = mine.funnyQuote ?? ""
        summary = mine.summary ?? ""
        song = mine.song ?? ""
        hydrated = true
    }

    private func submit() {
        if rating == 0 && favorite.trimmed.isEmpty && summary.trimmed.isEmpty {
            toasts.error("Mets au moins une note ou quelques mots."); return
        }
        guard let uid = app.userId else { return }
        loading = true
        Task {
            do {
                let values = ReviewValues(
                    rating: rating == 0 ? nil : rating,
                    favoriteMoment: favorite, awkwardMoment: awkward,
                    funnyQuote: quote, summary: summary, song: song
                )
                try await ReviewService.upsertReview(episodeId: episodeId, spaceId: spaceId, userId: uid, values: values)
                toasts.success("Review enregistrée 🔒")
                onSaved()
                dismiss()
            } catch {
                toasts.error(FriendlyError.message(error))
            }
            loading = false
        }
    }
}
