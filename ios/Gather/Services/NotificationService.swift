import Foundation
import Supabase

@MainActor
enum NotificationService {
    static func notifications(userId: String) async throws -> [AppNotification] {
        try await supabase
            .from("notifications")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .limit(100)
            .execute()
            .value
    }

    static func markRead(id: String) async throws {
        try await supabase
            .from("notifications")
            .update(["read_at": AnyJSON.string(ISO8601DateFormatter().string(from: Date()))])
            .eq("id", value: id)
            .execute()
    }

    static func markAllRead(userId: String) async throws {
        try await supabase
            .from("notifications")
            .update(["read_at": AnyJSON.string(ISO8601DateFormatter().string(from: Date()))])
            .eq("user_id", value: userId)
            .is("read_at", value: nil)
            .execute()
    }
}
