import Foundation
import Supabase

@MainActor
enum SocialService {
    // MARK: - Comments

    static func comments(episodeId: String) async throws -> [EpisodeComment] {
        var comments: [EpisodeComment] = try await supabase
            .from("episode_comments")
            .select()
            .eq("episode_id", value: episodeId)
            .order("created_at", ascending: true)
            .execute()
            .value

        let ids = comments.map { $0.id }
        var reactions: [CommentReaction] = []
        if !ids.isEmpty {
            reactions = (try? await supabase
                .from("comment_reactions")
                .select()
                .in("comment_id", values: ids)
                .execute()
                .value) ?? []
        }

        let profiles = try await ProfileService.profilesMap(comments.map { $0.authorId })
        for i in comments.indices {
            comments[i].profile = profiles[comments[i].authorId]
            comments[i].reactions = reactions.filter { $0.commentId == comments[i].id }
        }
        return comments
    }

    static func addComment(episodeId: String, userId: String, body: String) async throws {
        let trimmed = body.trimmed
        guard !trimmed.isEmpty else { throw GatherError.message("Le commentaire est vide.") }
        try await supabase.from("episode_comments").insert([
            "episode_id": AnyJSON.string(episodeId),
            "author_id": .string(userId),
            "body": .string(trimmed),
        ]).execute()
    }

    static func deleteComment(id: String) async throws {
        try await supabase.from("episode_comments").delete().eq("id", value: id).execute()
    }

    static func toggleReaction(commentId: String, userId: String, emoji: String, active: Bool) async throws {
        if active {
            try await supabase
                .from("comment_reactions")
                .delete()
                .eq("comment_id", value: commentId)
                .eq("user_id", value: userId)
                .eq("emoji", value: emoji)
                .execute()
        } else {
            try await supabase.from("comment_reactions").insert([
                "comment_id": AnyJSON.string(commentId),
                "user_id": .string(userId),
                "emoji": .string(emoji),
            ]).execute()
        }
    }

    // MARK: - Ideas

    static func ideas(spaceId: String, userId: String?) async throws -> [Idea] {
        var ideas: [Idea] = try await supabase
            .from("ideas")
            .select()
            .eq("space_id", value: spaceId)
            .order("created_at", ascending: false)
            .execute()
            .value

        let ids = ideas.map { $0.id }
        var votes: [IdeaVote] = []
        if !ids.isEmpty {
            votes = (try? await supabase
                .from("idea_votes")
                .select()
                .in("idea_id", values: ids)
                .execute()
                .value) ?? []
        }

        let profiles = try await ProfileService.profilesMap(ideas.map { $0.proposedBy })
        for i in ideas.indices {
            let ideaVotes = votes.filter { $0.ideaId == ideas[i].id }
            ideas[i].profile = profiles[ideas[i].proposedBy ?? ""]
            ideas[i].voteCount = ideaVotes.count
            ideas[i].voted = userId.map { uid in ideaVotes.contains { $0.userId == uid } } ?? false
        }
        return ideas
    }

    static func createIdea(spaceId: String, userId: String, title: String, description: String) async throws {
        try await supabase.from("ideas").insert([
            "space_id": AnyJSON.string(spaceId),
            "title": .string(title.trimmed),
            "description": description.trimmed.isEmpty ? .null : .string(description.trimmed),
            "status": .string("open"),
            "proposed_by": .string(userId),
        ]).execute()
    }

    static func toggleIdeaVote(ideaId: String, userId: String, voted: Bool) async throws {
        if voted {
            try await supabase
                .from("idea_votes")
                .delete()
                .eq("idea_id", value: ideaId)
                .eq("user_id", value: userId)
                .execute()
        } else {
            try await supabase.from("idea_votes").insert([
                "idea_id": AnyJSON.string(ideaId),
                "user_id": .string(userId),
            ]).execute()
        }
    }

    static func deleteIdea(id: String) async throws {
        try await supabase.from("ideas").delete().eq("id", value: id).execute()
    }
}
