import Foundation
import Supabase

@MainActor
enum MemberService {
    private static let codeAlphabet = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

    private static func generateCode(length: Int = 7) -> String {
        String((0..<length).map { _ in codeAlphabet.randomElement()! })
    }

    static func members(spaceId: String) async throws -> [SpaceMember] {
        var members: [SpaceMember] = try await supabase
            .from("space_members")
            .select()
            .eq("space_id", value: spaceId)
            .order("joined_at", ascending: true)
            .execute()
            .value

        let profiles = try await ProfileService.profilesMap(members.map { $0.userId })
        for i in members.indices { members[i].profile = profiles[members[i].userId] }

        let rank: [MemberRole: Int] = [.owner: 0, .member: 1, .observer: 2]
        return members.sorted { (rank[$0.role] ?? 3) < (rank[$1.role] ?? 3) }
    }

    static func setParticipation(spaceId: String, userId: String, canParticipate: Bool) async throws {
        let patch: [String: AnyJSON] = canParticipate
            ? ["role": .string("member"), "can_create_episodes": .bool(true)]
            : ["can_create_episodes": .bool(false)]
        try await updateMember(spaceId: spaceId, userId: userId, patch: patch)
    }

    static func updateMember(spaceId: String, userId: String, patch: [String: AnyJSON]) async throws {
        try await supabase
            .from("space_members")
            .update(patch)
            .eq("space_id", value: spaceId)
            .eq("user_id", value: userId)
            .execute()
    }

    static func removeMember(spaceId: String, userId: String) async throws {
        try await supabase
            .from("space_members")
            .delete()
            .eq("space_id", value: spaceId)
            .eq("user_id", value: userId)
            .execute()
    }

    static func inviteCodes(spaceId: String) async throws -> [InviteCode] {
        try await supabase
            .from("invite_codes")
            .select()
            .eq("space_id", value: spaceId)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func createInvite(
        spaceId: String,
        userId: String,
        role: MemberRole,
        maxUses: Int?,
        expiresAt: String?
    ) async throws -> InviteCode {
        let payload: [String: AnyJSON] = [
            "code": .string(generateCode()),
            "space_id": .string(spaceId),
            "role": .string(role.rawValue),
            "max_uses": maxUses.map { AnyJSON.integer($0) } ?? .null,
            "use_count": .integer(0),
            "expires_at": expiresAt.map { AnyJSON.string($0) } ?? .null,
            "created_by": .string(userId),
        ]
        return try await supabase
            .from("invite_codes")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value
    }

    static func revokeInvite(id: String) async throws {
        try await supabase.from("invite_codes").delete().eq("id", value: id).execute()
    }
}
