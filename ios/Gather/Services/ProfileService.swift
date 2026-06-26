import Foundation
import Supabase

@MainActor
enum ProfileService {
    /// Fetches profiles for a set of user ids, keyed by id. Mirrors lib/profiles.ts.
    static func profilesMap(_ ids: [String?]) async throws -> [String: Profile] {
        let unique = Array(Set(ids.compactMap { $0 }))
        guard !unique.isEmpty else { return [:] }
        let rows: [Profile] = try await supabase
            .from("profiles")
            .select()
            .in("id", values: unique)
            .execute()
            .value
        var map: [String: Profile] = [:]
        for p in rows { map[p.id] = p }
        return map
    }

    static func updateProfile(userId: String, name: String, bio: String?) async throws -> Profile {
        try await updateProfile(userId: userId, patch: [
            "name": .string(name),
            "bio": bio.map { AnyJSON.string($0) } ?? .null,
        ])
    }

    static func updateAvatar(userId: String, url: String) async throws -> Profile {
        try await updateProfile(userId: userId, patch: ["avatar_url": .string(url)])
    }

    static func updateProfile(userId: String, patch: [String: AnyJSON]) async throws -> Profile {
        var body = patch
        body["updated_at"] = .string(ISO8601DateFormatter().string(from: Date()))
        let updated: Profile = try await supabase
            .from("profiles")
            .update(body)
            .eq("id", value: userId)
            .select()
            .single()
            .execute()
            .value
        return updated
    }

    /// Latest season synthèse (AI summary + memory video) for a space, if generated.
    static func synthese(spaceId: String) async -> Synthese? {
        do {
            let rows: [Synthese] = try await supabase
                .from("synthese")
                .select()
                .eq("space_id", value: spaceId)
                .order("created_at", ascending: false)
                .limit(1)
                .execute()
                .value
            return rows.first
        } catch {
            return nil
        }
    }
}
