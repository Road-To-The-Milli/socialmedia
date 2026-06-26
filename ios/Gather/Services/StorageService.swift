import Foundation
import Supabase

@MainActor
enum StorageService {
    /// Uploads bytes to the episode-media bucket and returns a public URL.
    /// Mirrors lib/media.ts uploadToBucket.
    static func upload(folder: String, data: Data, contentType: String, ext: String) async throws -> String {
        guard !data.isEmpty else { throw GatherError.message("Le fichier sélectionné est vide.") }
        let stamp = Int(Date().timeIntervalSince1970 * 1000)
        let random = String(UUID().uuidString.prefix(6)).lowercased()
        let path = "\(folder)/\(stamp)-\(random).\(ext)"

        _ = try await supabase.storage
            .from(SupabaseManager.mediaBucket)
            .upload(path, data: data, options: FileOptions(contentType: contentType, upsert: false))

        let url = try supabase.storage.from(SupabaseManager.mediaBucket).getPublicURL(path: path)
        return url.absoluteString
    }
}
