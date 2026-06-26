import Foundation
import Supabase

/// Connects to the existing Gather Supabase backend.
/// Credentials come from build-time public env vars (Config.*) so nothing is
/// hardcoded in source. The anon key is a public client key by design — it ships
/// inside the app and is guarded server-side by Row Level Security.
@MainActor
final class SupabaseManager {
    static let shared = SupabaseManager()

    let client: SupabaseClient
    let isConfigured: Bool

    static let mediaBucket = "episode-media"

    private init() {
        let urlString = Config.EXPO_PUBLIC_SUPABASE_URL
        let key = Config.EXPO_PUBLIC_SUPABASE_ANON_KEY
        isConfigured = !urlString.isEmpty && !key.isEmpty

        // Harmless placeholders keep the client from crashing at init when config
        // is missing (the UI gates on `isConfigured` and shows a setup screen).
        let url = URL(string: urlString.isEmpty ? "https://placeholder.supabase.co" : urlString)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase

        client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: key.isEmpty ? "public-anon-placeholder" : key,
            options: SupabaseClientOptions(
                db: SupabaseClientOptions.DatabaseOptions(encoder: encoder, decoder: decoder)
            )
        )
    }
}

/// Shared convenience accessor for the configured client.
@MainActor
var supabase: SupabaseClient { SupabaseManager.shared.client }
