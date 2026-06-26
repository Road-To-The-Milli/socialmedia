import Foundation
import Supabase

nonisolated struct ReviewValues: Sendable {
    var rating: Int?
    var favoriteMoment: String?
    var awkwardMoment: String?
    var funnyQuote: String?
    var summary: String?
    var song: String?
}

@MainActor
enum ReviewService {
    /// All reviews the backend exposes (own review always; others only after unlock).
    static func reviews(episodeId: String) async throws -> [Review] {
        var reviews: [Review] = try await supabase
            .from("reviews")
            .select()
            .eq("episode_id", value: episodeId)
            .order("created_at", ascending: true)
            .execute()
            .value
        let profiles = try await ProfileService.profilesMap(reviews.map { $0.authorId })
        for i in reviews.indices { reviews[i].profile = profiles[reviews[i].authorId] }
        return reviews
    }

    static func myReview(episodeId: String, userId: String) async throws -> Review? {
        let rows: [Review] = try await supabase
            .from("reviews")
            .select()
            .eq("episode_id", value: episodeId)
            .eq("author_id", value: userId)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    static func upsertReview(
        episodeId: String,
        spaceId: String,
        userId: String,
        values: ReviewValues
    ) async throws {
        func str(_ s: String?) -> AnyJSON {
            guard let s, !s.trimmed.isEmpty else { return .null }
            return .string(s.trimmed)
        }
        var fields: [String: AnyJSON] = [
            "rating": values.rating.map { AnyJSON.integer($0) } ?? .null,
            "favorite_moment": str(values.favoriteMoment),
            "awkward_moment": str(values.awkwardMoment),
            "funny_quote": str(values.funnyQuote),
            "summary": str(values.summary),
            "song": str(values.song),
        ]

        if let existing = try await myReview(episodeId: episodeId, userId: userId) {
            fields["updated_at"] = .string(ISO8601DateFormatter().string(from: Date()))
            try await supabase
                .from("reviews")
                .update(fields)
                .eq("id", value: existing.id)
                .execute()
        } else {
            fields["episode_id"] = .string(episodeId)
            fields["author_id"] = .string(userId)
            fields["space_id"] = .string(spaceId)
            try await supabase.from("reviews").insert(fields).execute()
        }
    }
}
