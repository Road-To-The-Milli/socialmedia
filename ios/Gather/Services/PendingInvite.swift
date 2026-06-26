import Foundation

/// Stores an invite code captured before sign-in (deep link or signup field),
/// to be consumed once the user is authenticated. Mirrors lib/pendingInvite.ts.
nonisolated enum PendingInvite {
    private static let key = "gather.pendingInvite"

    static func set(_ code: String) {
        UserDefaults.standard.set(code.trimmed, forKey: key)
    }

    static func get() -> String? {
        let value = UserDefaults.standard.string(forKey: key)?.trimmed
        return (value?.isEmpty == false) ? value : nil
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}
