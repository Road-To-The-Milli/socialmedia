import Foundation
import Observation

@MainActor
@Observable
final class HomeViewModel {
    var spaces: [SpaceWithMembership] = []
    var unreadCount: Int = 0
    var isLoading = true
    var loaded = false

    func load(userId: String) async {
        if !loaded { isLoading = true }
        async let spacesResult = (try? await SpaceService.mySpaces(userId: userId)) ?? []
        async let notifsResult = (try? await NotificationService.notifications(userId: userId)) ?? []
        let (spaces, notifs) = await (spacesResult, notifsResult)
        self.spaces = spaces
        self.unreadCount = notifs.filter { $0.isUnread }.count
        self.isLoading = false
        self.loaded = true
    }
}
