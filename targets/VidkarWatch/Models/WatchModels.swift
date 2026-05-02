import Foundation

struct WatchUsageSnapshot: Codable, Equatable {
    var active: Bool?
    var enabled: Bool?
    var isUnlimited: Bool?
    var progress: Double?
    var statusLabel: String?
    var totalLabel: String?
    var unlimitedUsageLabel: String?
    var usedLabel: String?
}

struct WatchOptionSnapshot: Codable, Equatable, Identifiable {
    var description: String?
    var editable: Bool?
    var key: String?
    var label: String?
    var value: Bool?

    var id: String {
        clean(key) ?? UUID().uuidString
    }
}

struct WatchUserProfile: Codable, Equatable, Identifiable {
    var createdAt: String?
    var debtAmount: Double?
    var debtLabel: String?
    var displayName: String?
    var email: String?
    var id: String?
    var isAdmin: Bool?
    var modeLabel: String?
    var options: [WatchOptionSnapshot]?
    var phone: String?
    var picture: String?
    var roleLabel: String?
    var saldoRecargas: Double?
    var usage: WatchUsageSummary?
    var username: String?

    var safeId: String {
        clean(id) ?? clean(username) ?? UUID().uuidString
    }

    var safeDisplayName: String {
        clean(displayName) ?? clean(username) ?? "Usuario VIDKAR"
    }

    var safeSubtitle: String {
        if let username = clean(username) {
            return "@\(username)"
        }

        if let email = clean(email) {
            return email
        }

        return "Sin contacto"
    }
}

struct WatchUsageSummary: Codable, Equatable {
    var proxy: WatchUsageSnapshot?
    var vpn: WatchUsageSnapshot?
}

struct WatchApprovalSummary: Codable, Equatable, Identifiable {
    var amountLabel: String?
    var approvedEvidenceCount: Int?
    var canApproveSale: Bool?
    var createdAt: String?
    var evidenceCount: Int?
    var evidences: [WatchEvidenceSummary]?
    var id: String?
    var rejectedEvidenceCount: Int?
    var title: String?
    var types: [String]?
    var userDisplayName: String?

    var safeId: String {
        clean(id) ?? UUID().uuidString
    }
}

struct WatchEvidenceSummary: Codable, Equatable, Identifiable {
    var approved: Bool?
    var createdAt: String?
    var description: String?
    var hasPreview: Bool?
    var id: String?
    var imageUrl: String?
    var rejected: Bool?
    var statusLabel: String?

    var safeId: String {
        clean(id) ?? UUID().uuidString
    }
}

struct WatchDebtorSummary: Codable, Equatable, Identifiable {
    var amount: Double?
    var amountLabel: String?
    var displayName: String?
    var id: String?
    var salesCount: Int?
    var username: String?

    var safeId: String {
        clean(id) ?? clean(username) ?? UUID().uuidString
    }

    var safeDisplayName: String {
        clean(displayName) ?? clean(username) ?? "Usuario pendiente"
    }
}

struct WatchPendingEvidenceTypeSummary: Codable, Equatable, Identifiable {
    var count: Int?
    var key: String?
    var label: String?

    var id: String {
        clean(key) ?? clean(label) ?? UUID().uuidString
    }
}

struct WatchPendingEvidenceSummary: Codable, Equatable {
    var count: Int?
    var types: [WatchPendingEvidenceTypeSummary]?
}

struct WatchRechargeBalanceSnapshot: Codable, Equatable {
    var amount: Double?
    var currency: String?
    var updatedAt: String?
}

struct WatchDashboardStats: Codable, Equatable {
    var adminCount: Int?
    var debtorsCount: Int?
    var debtorsSalesCount: Int?
    var pendingApprovalsCount: Int?
    var pendingDebtAmount: Double?
    var pendingDebtLabel: String?
    var userCount: Int?
}

struct WatchDashboardContext: Codable, Equatable {
    var currentUser: WatchUserProfile?
    var debtors: [WatchDebtorSummary]?
    var pendingEvidence: WatchPendingEvidenceSummary?
    var pendingApprovals: [WatchApprovalSummary]?
    var rechargeBalance: WatchRechargeBalanceSnapshot?
    var stats: WatchDashboardStats?
    var syncedAt: String?
    var users: [WatchUserProfile]?

    var hasContent: Bool {
        currentUser != nil || !(users ?? []).isEmpty || !(pendingApprovals ?? []).isEmpty || !(debtors ?? []).isEmpty
    }
}