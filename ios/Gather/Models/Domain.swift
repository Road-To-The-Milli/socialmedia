import Foundation

// MARK: - Permissions (mirrors lib/types.ts)

nonisolated enum Permissions {
    /// Whether the current user can actively participate (write) in a space.
    static func canParticipate(_ member: SpaceMember?) -> Bool {
        guard let member else { return false }
        if member.role == .owner { return true }
        if member.role == .member && member.canCreateEpisodes { return true }
        return false
    }

    static func isOwner(_ member: SpaceMember?) -> Bool {
        member?.role == .owner
    }

    /// Display role accounting for un-promoted members being treated as observers.
    static func effectiveRole(_ member: SpaceMember?) -> MemberRole {
        guard let member else { return .observer }
        if member.role == .member && !member.canCreateEpisodes { return .observer }
        return member.role
    }
}

// MARK: - Season status (mirrors lib/format.ts getSeasonStatus)

nonisolated enum SeasonState: Sendable {
    case upcoming, live, ending, ended, unlocked
}

nonisolated struct SeasonStatus: Sendable {
    var state: SeasonState
    var label: String
    var daysLeft: Int?
    var progress: Double // 0...1
}

nonisolated enum Season {
    static func status(for space: Space) -> SeasonStatus {
        let now = Date()
        let start = DateParse.iso(space.seasonStart)
        let end = DateParse.iso(space.seasonEnd)

        if space.unlocked {
            return SeasonStatus(state: .unlocked, label: "Saison débloquée", daysLeft: 0, progress: 1)
        }

        if let start, now < start {
            let d = DateParse.daysBetween(now, start)
            return SeasonStatus(
                state: .upcoming,
                label: d <= 1 ? "Commence bientôt" : "Démarre dans \(d) j",
                daysLeft: d,
                progress: 0
            )
        }

        if let end {
            let d = DateParse.daysBetween(now, end)
            if d < 0 {
                return SeasonStatus(state: .ended, label: "Saison terminée", daysLeft: 0, progress: 1)
            }
            var progress = 0.5
            if let start {
                let total = max(1, DateParse.daysBetween(start, end))
                let elapsed = DateParse.daysBetween(start, now)
                progress = min(1, max(0, Double(elapsed) / Double(total)))
            }
            let label: String
            if d == 0 { label = "Dernier jour" }
            else if d <= 7 { label = "Plus que \(d) j" }
            else { label = "\(d) jours restants" }
            return SeasonStatus(state: d <= 7 ? .ending : .live, label: label, daysLeft: d, progress: progress)
        }

        return SeasonStatus(state: .live, label: "Saison en cours", daysLeft: nil, progress: 0.5)
    }
}

// MARK: - Date parsing & French formatting (mirrors lib/format.ts)

nonisolated enum DateParse {
    private static let months = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ]

    private static let isoFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let isoPlain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static let dateOnly: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func iso(_ value: String?) -> Date? {
        guard let value, !value.isEmpty else { return nil }
        if let d = isoFractional.date(from: value) { return d }
        if let d = isoPlain.date(from: value) { return d }
        if let d = dateOnly.date(from: String(value.prefix(10))) { return d }
        return nil
    }

    static func daysBetween(_ from: Date, _ to: Date) -> Int {
        let cal = Calendar.current
        let a = cal.startOfDay(for: from)
        let b = cal.startOfDay(for: to)
        return cal.dateComponents([.day], from: a, to: b).day ?? 0
    }

    static func formatDate(_ value: String?) -> String {
        guard let d = iso(value) else { return "" }
        let c = Calendar.current.dateComponents([.day, .month, .year], from: d)
        guard let day = c.day, let m = c.month, let y = c.year else { return "" }
        return "\(day) \(months[m - 1]) \(y)"
    }

    static func formatDateShort(_ value: String?) -> String {
        guard let d = iso(value) else { return "" }
        let c = Calendar.current.dateComponents([.day, .month], from: d)
        guard let day = c.day, let m = c.month else { return "" }
        return "\(day) \(months[m - 1])"
    }

    static func formatRelative(_ value: String?) -> String {
        guard let d = iso(value) else { return "" }
        let diff = Date().timeIntervalSince(d)
        let sec = Int(diff.rounded())
        let min = Int((diff / 60).rounded())
        let hr = Int((diff / 3600).rounded())
        let day = Int((diff / 86400).rounded())
        if sec < 45 { return "à l'instant" }
        if min < 60 { return "il y a \(min) min" }
        if hr < 24 { return "il y a \(hr) h" }
        if day == 1 { return "hier" }
        if day < 7 { return "il y a \(day) j" }
        return formatDateShort(value)
    }

    static func formatDuration(_ value: FlexibleNumber?) -> String {
        guard let value else { return "" }
        let minutes: Int
        switch value {
        case .text(let s):
            if let n = Double(s) { minutes = Int(n) }
            else { return s }
        case .number(let d):
            minutes = Int(d)
        }
        if minutes <= 0 { return "" }
        if minutes < 60 { return "\(minutes) min" }
        let h = minutes / 60
        let m = minutes % 60
        return m == 0 ? "\(h) h" : "\(h) h \(m)"
    }
}

// MARK: - Friendly error mapping (mirrors lib/errors.ts)

nonisolated enum FriendlyError {
    static func message(_ error: Error) -> String {
        let msg = (error as NSError).localizedDescription + " " + String(describing: error)
        func has(_ pattern: String) -> Bool {
            msg.range(of: pattern, options: [.caseInsensitive, .regularExpression]) != nil
        }
        if has("Email not confirmed") { return "Ton email n'est pas encore confirmé. Vérifie ta boîte mail." }
        if has("Invalid login credentials") { return "Email ou mot de passe incorrect." }
        if has("already registered|already been registered") { return "Un compte existe déjà avec cet email." }
        if has("at least 6|Password should be at least") { return "Le mot de passe doit faire au moins 6 caractères." }
        if has("valid email|invalid format|Unable to validate email") { return "Adresse email invalide." }
        if has("rate limit|too many") { return "Trop de tentatives. Réessaie dans un instant." }
        if has("row-level security|not authorized|permission denied") { return "Tu n'as pas les droits pour cette action." }
        if has("duplicate key|already exists") { return "Cet élément existe déjà." }
        if has("network|offline|timed out|connection") { return "Problème de connexion. Vérifie ton réseau." }
        let clean = (error as NSError).localizedDescription
        return clean.isEmpty ? "Une erreur est survenue." : clean
    }
}
