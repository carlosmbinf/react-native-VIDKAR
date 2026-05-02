import SwiftUI

private func shouldHideCarlosFromWatchUsersList(currentUsername: String?) -> Bool {
    (currentUsername ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased() != "carlosmbinf"
}

private func isCarlosPrincipalWatchUser(_ user: WatchUserProfile) -> Bool {
    if (user.username ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == "carlosmbinf" {
        return true
    }

    let displayName = (user.displayName ?? "")
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .lowercased()
    return displayName == "carlos medina"
}

private func buildVisibleWatchUsersForList(
    users: [WatchUserProfile],
    currentUsername: String?
) -> [WatchUserProfile] {
    guard shouldHideCarlosFromWatchUsersList(currentUsername: currentUsername) else {
        return users
    }

    return users.filter { !isCarlosPrincipalWatchUser($0) }
}

struct ContentView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager

    private var visibleUsers: [WatchUserProfile] {
        sessionManager.context?.users ?? []
    }

    private var currentUsername: String? {
        sessionManager.context?.currentUser?.username?.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var visibleUsersForList: [WatchUserProfile] {
        buildVisibleWatchUsersForList(
            users: visibleUsers,
            currentUsername: currentUsername
        )
    }

    private var visibleApprovals: [WatchApprovalSummary] {
        sessionManager.context?.pendingApprovals ?? []
    }

    private var visibleDebtors: [WatchDebtorSummary] {
        sessionManager.context?.debtors ?? []
    }

    private var pendingEvidenceCount: Int {
        sessionManager.context?.pendingEvidence?.count ?? 0
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    header
                        .padding(.horizontal, 10)

                    if let currentUser = sessionManager.context?.currentUser {
                        NavigationLink {
                            WatchUserDetailView(userId: currentUser.safeId)
                                .environmentObject(sessionManager)
                        } label: {
                            WatchHeroCard(
                                stats: sessionManager.context?.stats,
                                user: currentUser
                            )
                        }
                        .buttonStyle(.plain)

                        if clean(currentUser.username)?.lowercased() == "carlosmbinf",
                           let rechargeBalance = sessionManager.context?.rechargeBalance,
                           rechargeBalance.amount != nil {
                            WatchRechargeBalanceCard(
                                balance: rechargeBalance,
                                onRefresh: {
                                    sessionManager.requestUserSnapshot()
                                }
                            )
                        }

                        if currentUser.username == "carlosmbinf" && !visibleDebtors.isEmpty {
                            WatchDebtOverviewCard(
                                debtors: visibleDebtors,
                                salesCount: sessionManager.context?.stats?.debtorsSalesCount ?? 0,
                                totalLabel: clean(sessionManager.context?.stats?.pendingDebtLabel) ?? "0 CUP"
                            )
                        }

                        if currentUser.isAdmin == true && !visibleApprovals.isEmpty {
                            NavigationLink {
                                WatchApprovalsListView()
                                    .environmentObject(sessionManager)
                            } label: {
                                WatchApprovalsOverviewCard(approvals: visibleApprovals)
                            }
                            .buttonStyle(.plain)
                        }

                        if pendingEvidenceCount > 0 {
                            WatchPendingEvidenceOverviewCard(
                                summary: sessionManager.context?.pendingEvidence
                            )
                        }

                        if currentUser.isAdmin == true && !visibleUsersForList.isEmpty {
                            NavigationLink {
                                WatchUsersListView()
                                    .environmentObject(sessionManager)
                            } label: {
                                WatchShortcutCard(
                                    badge: "\(visibleUsersForList.count)",
                                    icon: "person.3.fill",
                                    subtitle: "Listado resumido con acceso directo a cada perfil",
                                    title: "Usuarios"
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    } else {
                        emptyState
                    }
                }
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .refreshable {
                await sessionManager.refreshUserSnapshot()
            }
            .background(Color.black.opacity(0.96))
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .center, spacing: 6) {
                Image(systemName: "applewatch.radiowaves.left.and.right")
                    .foregroundStyle(.cyan)

                Text("VIDKAR")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 8)
            }

            Text(sessionManager.statusText)
                .font(.caption2)
                .foregroundStyle(.secondary)

            // Text(sessionManager.lastSyncText)
            //     .font(.caption2)
            //     .foregroundStyle(.secondary)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "iphone.gen3.radiowaves.left.and.right")
                .font(.title3)
                .foregroundStyle(.blue)

            Text("Debes iniciar sesión en el iPhone.")
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .padding(.horizontal, 10)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct WatchUsersListView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager
    @State private var selectedFilter: WatchUserListFilter = .all

    private var currentUsername: String? {
        sessionManager.context?.currentUser?.username?.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var filteredUsers: [WatchUserProfile] {
        buildVisibleWatchUsersForList(
            users: sessionManager.context?.users ?? [],
            currentUsername: currentUsername
        )
            .filter { selectedFilter.matches($0) }
    }

    private var admins: [WatchUserProfile] {
        filteredUsers.filter { $0.isAdmin == true }
    }

    private var normalUsers: [WatchUserProfile] {
        filteredUsers.filter { $0.isAdmin != true }
    }

    private var filteredCount: Int {
        filteredUsers.count
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                WatchUserFilterStrip(
                    count: filteredCount,
                    selectedFilter: selectedFilter,
                    onSelect: { selectedFilter = $0 }
                )

                if !admins.isEmpty {
                    WatchSectionHeader(title: "Administradores", count: admins.count)
                    ForEach(admins, id: \.safeId) { user in
                        NavigationLink {
                            WatchUserDetailView(userId: user.safeId)
                                .environmentObject(sessionManager)
                        } label: {
                            WatchUserRowCard(user: user)
                        }
                        .buttonStyle(.plain)
                    }
                }

                if !normalUsers.isEmpty {
                    WatchSectionHeader(title: "Usuarios", count: normalUsers.count)
                    ForEach(normalUsers, id: \.safeId) { user in
                        NavigationLink {
                            WatchUserDetailView(userId: user.safeId)
                                .environmentObject(sessionManager)
                        } label: {
                            WatchUserRowCard(user: user)
                        }
                        .buttonStyle(.plain)
                    }
                }

                if admins.isEmpty && normalUsers.isEmpty {
                    WatchStatusBanner(text: "No hay usuarios para el filtro seleccionado.")
                }
            }
            .padding(.top, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .refreshable {
            await sessionManager.refreshUserSnapshot()
        }
        .background(Color.black.opacity(0.96))
        .navigationTitle("Usuarios")
    }
}

private enum WatchUserListFilter: String, CaseIterable, Identifiable {
    case all
    case vpn
    case proxy
    case debt

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all:
            return "Todos"
        case .vpn:
            return "VPN"
        case .proxy:
            return "Proxy"
        case .debt:
            return "Deuda"
        }
    }

    var icon: String {
        switch self {
        case .all:
            return "person.2.fill"
        case .vpn:
            return "shield.fill"
        case .proxy:
            return "network"
        case .debt:
            return "banknote.fill"
        }
    }

    func matches(_ user: WatchUserProfile) -> Bool {
        switch self {
        case .all:
            return true
        case .vpn:
            return user.usage?.vpn?.enabled == true || user.usage?.vpn?.active == true
        case .proxy:
            return user.usage?.proxy?.enabled == true || user.usage?.proxy?.active == true
        case .debt:
            return (user.debtAmount ?? 0) > 0
        }
    }
}

private struct WatchUserFilterStrip: View {
    let count: Int
    let selectedFilter: WatchUserListFilter
    let onSelect: (WatchUserListFilter) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 6) {
                Image(systemName: "line.3.horizontal.decrease.circle.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.cyan)

                Text("Filtrar usuarios")
                    .font(.system(size: 9.6, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Spacer(minLength: 4)

                WatchPill(text: "\(count)", tone: .blue)
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 5) {
                    filterButtons
                }

                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 5) {
                        WatchUserFilterButton(
                            filter: .all,
                            isSelected: selectedFilter == .all,
                            onSelect: onSelect
                        )
                        WatchUserFilterButton(
                            filter: .vpn,
                            isSelected: selectedFilter == .vpn,
                            onSelect: onSelect
                        )
                    }

                    HStack(spacing: 5) {
                        WatchUserFilterButton(
                            filter: .proxy,
                            isSelected: selectedFilter == .proxy,
                            onSelect: onSelect
                        )
                        WatchUserFilterButton(
                            filter: .debt,
                            isSelected: selectedFilter == .debt,
                            onSelect: onSelect
                        )
                    }
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.055), lineWidth: 1)
        )
    }

    @ViewBuilder
    private var filterButtons: some View {
        ForEach(WatchUserListFilter.allCases) { filter in
            WatchUserFilterButton(
                filter: filter,
                isSelected: selectedFilter == filter,
                onSelect: onSelect
            )
        }
    }
}

private struct WatchUserFilterButton: View {
    let filter: WatchUserListFilter
    let isSelected: Bool
    let onSelect: (WatchUserListFilter) -> Void

    var body: some View {
        Button {
            onSelect(filter)
        } label: {
            HStack(spacing: 4) {
                Image(systemName: filter.icon)
                    .font(.system(size: 7.8, weight: .bold))

                Text(filter.title)
                    .font(.system(size: 8.2, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
            }
            .foregroundStyle(isSelected ? .black : .white.opacity(0.82))
            .padding(.horizontal, 7)
            .padding(.vertical, 5)
            .background(
                isSelected ? Color.cyan : Color.white.opacity(0.07),
                in: Capsule()
            )
        }
        .buttonStyle(.plain)
    }
}

struct WatchUserDetailView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager
    let userId: String

    private var user: WatchUserProfile? {
        if sessionManager.context?.currentUser?.safeId == userId {
            return sessionManager.context?.currentUser
        }

        return sessionManager.context?.users?.first(where: { $0.safeId == userId })
    }

    var body: some View {
        ScrollView {
            if let user {
                VStack(alignment: .leading, spacing: 10) {
                    WatchHeroCard(
                        stats: sessionManager.context?.stats,
                        user: user,
                        showsOpenProfileCTA: false
                    )

                    WatchContactCard(user: user)

                    WatchInfoCard(title: "Consumo") {
                        if let proxy = user.usage?.proxy {
                            WatchUsageMetricCard(title: "Proxy", usage: proxy)
                        }

                        if let vpn = user.usage?.vpn {
                            WatchUsageMetricCard(title: "VPN", usage: vpn)
                        }

                        if let saldoRecargas = user.saldoRecargas, saldoRecargas > 0 {
                            WatchInfoRow(
                                label: "Saldo recargas",
                                value: String(format: "%.2f", saldoRecargas)
                            )
                        }
                    }

                    if let options = user.options, !options.isEmpty {
                        WatchInfoCard(title: "Opciones") {
                            ForEach(options) { option in
                                WatchOptionRow(
                                    user: user,
                                    option: option,
                                    onToggle: { nextValue in
                                        sessionManager.toggleOption(
                                            userId: user.safeId,
                                            option: option,
                                            value: nextValue
                                        )
                                    }
                                )
                            }
                        }
                    }
                }
                .padding(.top, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .refreshable {
            await sessionManager.refreshUserSnapshot()
        }
        .background(Color.black.opacity(0.96))
        .navigationTitle(clean(user?.displayName) ?? "Perfil")
    }
}

struct WatchApprovalsListView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager

    private var approvals: [WatchApprovalSummary] {
        sessionManager.context?.pendingApprovals ?? []
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                WatchSectionHeader(title: "Pendientes", count: approvals.count)

                ForEach(approvals, id: \.safeId) { approval in
                    NavigationLink {
                        WatchApprovalDetailView(approvalId: approval.safeId)
                            .environmentObject(sessionManager)
                    } label: {
                        WatchApprovalRowCard(approval: approval)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .refreshable {
            await sessionManager.refreshUserSnapshot()
        }
        .background(Color.black.opacity(0.96))
        .navigationTitle("Pendientes")
    }
}

struct WatchApprovalDetailView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager
    @Environment(\.dismiss) private var dismiss
    let approvalId: String
    @State private var pendingSaleAction: PendingSaleAction?
    @State private var hasLoadedApproval = false

    private enum PendingSaleAction: Identifiable {
        case approve(String)
        case reject(String)

        var id: String {
            switch self {
            case .approve(let saleId):
                return "approve-\(saleId)"
            case .reject(let saleId):
                return "reject-\(saleId)"
            }
        }

        var title: String {
            switch self {
            case .approve:
                return "¿Aprobar venta?"
            case .reject:
                return "¿Rechazar venta?"
            }
        }

        var message: String {
            switch self {
            case .approve:
                return "Se confirmará la venta completa en este momento."
            case .reject:
                return "La venta se marcará como rechazada."
            }
        }

        var confirmLabel: String {
            switch self {
            case .approve:
                return "Aprobar"
            case .reject:
                return "Rechazar"
            }
        }
    }

    private var approval: WatchApprovalSummary? {
        sessionManager.context?.pendingApprovals?.first(where: { $0.safeId == approvalId })
    }

    private var evidences: [WatchEvidenceSummary] {
        approval?.evidences ?? []
    }

    var body: some View {
        ScrollView {
            if let approval {
                VStack(alignment: .leading, spacing: 10) {
                    WatchApprovalSaleSummaryCard(approval: approval)

                    WatchPlainSection(title: "Evidencias") {
                        WatchEvidenceMetricsStrip(
                            approved: approval.approvedEvidenceCount ?? 0,
                            rejected: approval.rejectedEvidenceCount ?? 0,
                            total: approval.evidenceCount ?? 0
                        )

                        if evidences.isEmpty {
                            WatchStatusBanner(text: "Esta venta todavía no tiene evidencias disponibles para validar.")
                        } else {
                            ForEach(evidences, id: \.safeId) { evidence in
                                NavigationLink {
                                    WatchEvidenceReviewView(
                                        approvalId: approval.safeId,
                                        evidence: evidence
                                    )
                                    .environmentObject(sessionManager)
                                } label: {
                                    WatchEvidenceValidationRow(evidence: evidence)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if let types = approval.types, !types.isEmpty {
                        WatchApprovalTypesCard(types: types)
                    }

                    WatchPlainSection(title: "Venta general") {
                        WatchStatusBanner(
                            text: approval.canApproveSale == true
                                ? "Ya existe evidencia aprobada. Puedes aprobar la venta completa."
                                : "Aprueba al menos una evidencia antes de completar la venta."
                        )

                        HStack(spacing: 8) {
                            Button {
                                pendingSaleAction = .reject(approval.safeId)
                            } label: {
                                Text("Rechazar venta")
                                    .font(.system(size: 10, weight: .bold, design: .rounded))
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .tint(.red)

                            Button {
                                pendingSaleAction = .approve(approval.safeId)
                            } label: {
                                Text("Aprobar venta")
                                    .font(.system(size: 10, weight: .bold, design: .rounded))
                                    .frame(maxWidth: .infinity)
                            }
                            .disabled(approval.canApproveSale != true)
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                        }
                    }
                }
                .padding(.top, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .onAppear {
            if approval != nil {
                hasLoadedApproval = true
            }
        }
        .onChange(of: approval?.safeId) { nextApprovalId in
            if nextApprovalId != nil {
                hasLoadedApproval = true
                return
            }

            guard hasLoadedApproval else {
                return
            }

            dismiss()
        }
        .refreshable {
            await sessionManager.refreshUserSnapshot()
        }
        .alert(item: $pendingSaleAction) { action in
            switch action {
            case .approve(let saleId):
                return Alert(
                    title: Text(action.title),
                    message: Text(action.message),
                    primaryButton: .default(Text(action.confirmLabel)) {
                        sessionManager.approveSale(saleId: saleId)
                    },
                    secondaryButton: .cancel(Text("Cancelar"))
                )
            case .reject(let saleId):
                return Alert(
                    title: Text(action.title),
                    message: Text(action.message),
                    primaryButton: .destructive(Text(action.confirmLabel)) {
                        sessionManager.rejectSale(saleId: saleId)
                    },
                    secondaryButton: .cancel(Text("Cancelar"))
                )
            }
        }
        .background(Color.black.opacity(0.96))
        .navigationTitle("Aprobación")
    }
}

private struct WatchApprovalSaleSummaryCard: View {
    let approval: WatchApprovalSummary

    private var createdAtText: String? {
        formatWatchDate(approval.createdAt)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .top, spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.cyan.opacity(0.16))
                        .frame(width: 30, height: 30)

                    Image(systemName: "receipt.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.cyan)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(clean(approval.title) ?? "Venta pendiente")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .minimumScaleFactor(0.76)

                    Text(clean(approval.userDisplayName) ?? "Usuario pendiente")
                        .font(.system(size: 9, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                }
                .layoutPriority(1)
            }

            HStack(spacing: 6) {
                WatchApprovalMetaPill(
                    icon: "banknote.fill",
                    text: clean(approval.amountLabel) ?? "Sin monto",
                    tint: .green
                )

                if let createdAtText {
                    WatchApprovalMetaPill(
                        icon: "calendar",
                        text: createdAtText,
                        tint: .orange
                    )
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.cyan.opacity(0.12), Color.white.opacity(0.045)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
    }
}

private struct WatchApprovalMetaPill: View {
    let icon: String
    let text: String
    let tint: Color

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 8.4, weight: .semibold))
                .foregroundStyle(tint)

            Text(text)
                .font(.system(size: 8.4, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.9))
                .lineLimit(1)
                .minimumScaleFactor(0.68)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.065), in: Capsule())
    }
}

private struct WatchPlainSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.85)

            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct WatchEvidenceMetricsStrip: View {
    let approved: Int
    let rejected: Int
    let total: Int

    var body: some View {
        VStack(spacing: 6) {
            WatchEvidenceMetricTile(
                icon: "checkmark.seal.fill",
                label: "Aprobadas",
                value: approved,
                tint: .green
            )
            WatchEvidenceMetricTile(
                icon: "xmark.seal.fill",
                label: "Rechazadas",
                value: rejected,
                tint: .red
            )
            WatchEvidenceMetricTile(
                icon: "tray.full.fill",
                label: "Total",
                value: total,
                tint: .cyan
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct WatchEvidenceMetricTile: View {
    let icon: String
    let label: String
    let value: Int
    let tint: Color

    var body: some View {
        HStack(spacing: 8) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(tint)

                Text(label)
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.86))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }

            Spacer(minLength: 6)

            Text("\(value)")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.13), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(tint.opacity(0.16), lineWidth: 1)
        )
    }
}

private struct WatchApprovalTypesCard: View {
    let types: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 6) {
                Image(systemName: "tag.fill")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.purple)

                Text("Tipos")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)

                Spacer(minLength: 4)
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 5) {
                    typePills
                }

                VStack(alignment: .leading, spacing: 5) {
                    typePills
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.purple.opacity(0.1), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.purple.opacity(0.16), lineWidth: 1)
        )
    }

    @ViewBuilder
    private var typePills: some View {
        ForEach(types, id: \.self) { type in
            WatchPill(text: type, tone: .purple)
        }
    }
}

struct WatchEvidenceValidationRow: View {
    let evidence: WatchEvidenceSummary

    private var isApproved: Bool {
        evidence.approved == true
    }

    private var isRejected: Bool {
        evidence.rejected == true
    }

    private var statusText: String {
        clean(evidence.statusLabel) ?? "Pendiente"
    }

    private var statusColor: Color {
        if isApproved {
            return .green
        }

        if isRejected {
            return .red
        }

        return .orange
    }

    private var iconName: String {
        if isApproved {
            return "checkmark.seal.fill"
        }

        if isRejected {
            return "xmark.seal.fill"
        }

        return "photo.fill"
    }

    private var iconBackground: Color {
        statusColor.opacity(isRejected ? 0.22 : 0.18)
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 7) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(iconBackground)
                            .frame(width: 26, height: 26)

                        Image(systemName: iconName)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(statusColor)
                    }
                    .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 3) {
                        Text(clean(evidence.description) ?? "Evidencia de pago")
                            .font(.system(size: 9.6, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(3)
                            .minimumScaleFactor(0.76)
                            .fixedSize(horizontal: false, vertical: true)

                        if let createdAt = formatWatchDate(evidence.createdAt) {
                            Text(createdAt)
                                .font(.system(size: 8.1, weight: .medium, design: .rounded))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.72)
                        }

                        if evidence.hasPreview != true {
                            HStack(spacing: 4) {
                                Image(systemName: "photo.slash")
                                    .font(.system(size: 8, weight: .semibold))
                                Text("Sin imagen")
                                    .font(.system(size: 8, weight: .semibold, design: .rounded))
                            }
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.white.opacity(0.06), in: Capsule())
                        }
                    }
                    .padding(.trailing, 42)
                    .layoutPriority(1)
                }

                HStack(spacing: 6) {
                    Text("Ver evidencia")
                        .font(.system(size: 9, weight: .semibold, design: .rounded))
                        .foregroundStyle(.cyan)

                    Spacer(minLength: 4)

                    Image(systemName: "chevron.right")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(9)

            WatchEvidenceStatusRibbon(text: statusText, color: statusColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.white.opacity(0.06), statusColor.opacity(0.06)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 14, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(statusColor.opacity(isRejected ? 0.3 : 0.16), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct WatchEvidenceStatusRibbon: View {
    let text: String
    let color: Color

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.clear

            Text(text)
                .font(.system(size: 6.8, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .lineLimit(1)
                .minimumScaleFactor(0.62)
                .allowsTightening(true)
                .padding(.horizontal, 4)
                .padding(.vertical, 3)
                .frame(width: 82, height: 17)
                .background(
                    LinearGradient(
                        colors: [color.opacity(0.98), color.opacity(0.78)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .rotationEffect(.degrees(39))
                .offset(x: 14, y: 4)
                .shadow(color: color.opacity(0.24), radius: 4, x: 0, y: 2)
        }
        .frame(width: 58, height: 40, alignment: .topTrailing)
        .clipped()
            .accessibilityLabel(text)
    }
}

private enum WatchEvidenceDecisionAction: Identifiable {
    case approve
    case reject

    var id: String {
        switch self {
        case .approve:
            return "approve"
        case .reject:
            return "reject"
        }
    }

    var title: String {
        switch self {
        case .approve:
            return "Aprobar evidencia"
        case .reject:
            return "Rechazar evidencia"
        }
    }

    var message: String {
        switch self {
        case .approve:
            return "Confirma que deseas aprobar esta evidencia."
        case .reject:
            return "Confirma que deseas rechazar esta evidencia."
        }
    }
}

struct WatchEvidenceReviewView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager

    let approvalId: String
    let evidence: WatchEvidenceSummary

    @State private var confirmationAction: WatchEvidenceDecisionAction?
    @State private var requestedPreview = false

    private var currentEvidence: WatchEvidenceSummary {
        sessionManager.context?.pendingApprovals?
            .first(where: { $0.safeId == approvalId })?
            .evidences?
            .first(where: { $0.safeId == evidence.safeId }) ?? evidence
    }

    private var isApproved: Bool {
        currentEvidence.approved == true
    }

    private var isRejected: Bool {
        currentEvidence.rejected == true
    }

    private var imageUrl: String? {
        clean(currentEvidence.imageUrl) ?? sessionManager.evidenceImageUrl(for: currentEvidence.safeId)
    }

    private var previewError: String? {
        sessionManager.evidencePreviewError(for: currentEvidence.safeId)
    }

    private var isPreviewLoading: Bool {
        imageUrl == nil && sessionManager.isEvidencePreviewLoading(currentEvidence.safeId)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                WatchInfoCard(title: "Comprobante") {
                    if let createdAt = formatWatchDate(currentEvidence.createdAt) {
                        WatchInfoRow(label: "Fecha", value: createdAt)
                    }
                    WatchInfoRow(
                        label: "Estado",
                        value: clean(currentEvidence.statusLabel) ?? "Pendiente"
                    )
                }

                WatchInfoCard(title: "Vista previa") {
                    WatchEvidencePreviewSurface(
                        hasPreview: currentEvidence.hasPreview == true,
                        isLoading: isPreviewLoading,
                        errorText: previewError,
                        imageUrl: imageUrl
                    )
                }

                if !isApproved && !isRejected {
                    HStack(spacing: 8) {
                        Button {
                            confirmationAction = .reject
                        } label: {
                            Text("Rechazar")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .tint(.red)

                        Button {
                            confirmationAction = .approve
                        } label: {
                            Text("Aprobar")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                    }
                } else {
                    WatchStatusBanner(
                        text: isApproved
                            ? "La evidencia ya fue aprobada."
                            : "La evidencia está rechazada y no puede aprobarse desde Watch."
                    )
                }
            }
            .padding(.top, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .onAppear {
            guard !requestedPreview else {
                return
            }

            requestedPreview = true
            if let imageUrl {
                print("[VidkarWatch] evidence snapshot imageUrl=\(imageUrl)")
            } else {
                sessionManager.requestEvidencePreview(evidenceId: currentEvidence.safeId)
            }
        }
        .alert(item: $confirmationAction) { action in
            Alert(
                title: Text(action.title),
                message: Text(action.message),
                primaryButton: .cancel(Text("Cancelar")),
                secondaryButton: .destructive(Text(action == .approve ? "Aprobar" : "Rechazar")) {
                    switch action {
                    case .approve:
                        sessionManager.approveEvidence(
                            evidenceId: currentEvidence.safeId,
                            saleId: approvalId
                        )
                    case .reject:
                        sessionManager.rejectEvidence(
                            evidenceId: currentEvidence.safeId,
                            saleId: approvalId
                        )
                    }
                }
            )
        }
        .background(Color.black.opacity(0.96))
        .navigationTitle("Evidencia")
    }
}

struct WatchEvidencePreviewSurface: View {
    let hasPreview: Bool
    let isLoading: Bool
    let errorText: String?
    let imageUrl: String?

    var body: some View {
        Group {
            if !hasPreview {
                WatchStatusBanner(text: "Esta evidencia no contiene imagen disponible en el servidor.")
            } else if isLoading {
                HStack(spacing: 8) {
                    ProgressView()
                    Text("Cargando imagen...")
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(8)
            } else if let imageUrl,
                      let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        let _ = print("[VidkarWatch] AsyncImage loading url=\(imageUrl)")
                        VStack(spacing: 8) {
                            ProgressView()
                            Text("Abriendo evidencia...")
                                .font(.system(size: 10, weight: .medium, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 120)
                    case .success(let image):
                        let _ = print("[VidkarWatch] AsyncImage success url=\(imageUrl)")
                        image
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 110, maxHeight: 220)
                    case .failure(let error):
                        let _ = print("[VidkarWatch] AsyncImage failure url=\(imageUrl) error=\(error.localizedDescription)")
                        WatchStatusBanner(text: "No se pudo abrir la imagen desde el iPhone.")
                    @unknown default:
                        let _ = print("[VidkarWatch] AsyncImage unknown failure url=\(imageUrl)")
                        WatchStatusBanner(text: "No se pudo abrir la imagen.")
                    }
                }
                .onAppear {
                    print("[VidkarWatch] WatchEvidencePreviewSurface imageUrl=\(imageUrl)")
                }
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
            } else {
                if let imageUrl {
                    let _ = print("[VidkarWatch] Invalid image URL string=\(imageUrl)")
                }
                WatchStatusBanner(
                    text: errorText ?? "No se pudo preparar la imagen en el Watch."
                )
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(WatchSessionManager())
}
