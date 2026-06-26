import Foundation
import Observation

/// Shared state for a single space's tabs (dashboard, episodes, ideas, recap, members).
@MainActor
@Observable
final class SpaceStore {
    let spaceId: String

    var detail: SpaceDetail?
    var episodes: [Episode] = []
    var members: [SpaceMember] = []
    var ideas: [Idea] = []
    var synthese: Synthese?

    var loadingSpace = true
    var loadingEpisodes = true
    var loadingIdeas = true
    var loadingMembers = true

    init(spaceId: String) {
        self.spaceId = spaceId
    }

    var space: Space? { detail?.space }
    var membership: SpaceMember? { detail?.membership }
    var canParticipate: Bool { Permissions.canParticipate(membership) }
    var isOwner: Bool { Permissions.isOwner(membership) }

    func loadAll(userId: String) async {
        async let s: Void = reloadSpace(userId: userId)
        async let e: Void = reloadEpisodes()
        async let m: Void = reloadMembers()
        async let i: Void = reloadIdeas(userId: userId)
        _ = await (s, e, m, i)
    }

    func reloadSpace(userId: String) async {
        if let detail = try? await SpaceService.space(id: spaceId, userId: userId) {
            self.detail = detail
            if detail.space.unlocked {
                self.synthese = await ProfileService.synthese(spaceId: spaceId)
            }
        }
        loadingSpace = false
    }

    func reloadEpisodes() async {
        episodes = (try? await EpisodeService.episodes(spaceId: spaceId)) ?? []
        loadingEpisodes = false
    }

    func reloadMembers() async {
        members = (try? await MemberService.members(spaceId: spaceId)) ?? []
        loadingMembers = false
    }

    func reloadIdeas(userId: String?) async {
        ideas = (try? await SocialService.ideas(spaceId: spaceId, userId: userId)) ?? []
        loadingIdeas = false
    }
}
