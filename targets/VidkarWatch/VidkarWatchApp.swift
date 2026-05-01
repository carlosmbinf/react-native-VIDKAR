import SwiftUI
import WatchConnectivity

@main
struct VidkarWatchApp: App {
    @StateObject private var sessionManager = WatchSessionManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(sessionManager)
                .onAppear {
                    sessionManager.activate()
                }
        }
    }
}

struct WatchUsageSnapshot: Codable, Equatable {
    var active: Bool?
    var enabled: Bool?
    var progress: Double?
    var statusLabel: String?
    var totalLabel: String?
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
    var id: String?
    var rejectedEvidenceCount: Int?
    var title: String?
    var types: [String]?
    var userDisplayName: String?

    var safeId: String {
        clean(id) ?? UUID().uuidString
    }
}

struct WatchDashboardStats: Codable, Equatable {
    var adminCount: Int?
    var pendingApprovalsCount: Int?
    var userCount: Int?
}

struct WatchDashboardContext: Codable, Equatable {
    var currentUser: WatchUserProfile?
    var pendingApprovals: [WatchApprovalSummary]?
    var stats: WatchDashboardStats?
    var syncedAt: String?
    var users: [WatchUserProfile]?

    var hasContent: Bool {
        currentUser != nil || !(users ?? []).isEmpty || !(pendingApprovals ?? []).isEmpty
    }
}

private func clean(_ value: String?) -> String? {
    guard let value else {
        return nil
    }

    let trimmedValue = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmedValue.isEmpty ? nil : trimmedValue
}

private func formatWatchDate(_ value: String?) -> String? {
    guard let value,
          let date = ISO8601DateFormatter().date(from: value) else {
        return clean(value)
    }

    let formatter = DateFormatter()
    formatter.dateStyle = .short
    formatter.timeStyle = .short
    return formatter.string(from: date)
}

private extension Color {
    init(hex: String?) {
        let fallback = Color.blue
        guard let rawHex = clean(hex)?.replacingOccurrences(of: "#", with: "") else {
            self = fallback
            return
        }

        var sanitizedHex = rawHex
        if sanitizedHex.count == 3 {
            sanitizedHex = sanitizedHex.map { "\($0)\($0)" }.joined()
        }

        guard sanitizedHex.count == 6, let value = Int(sanitizedHex, radix: 16) else {
            self = fallback
            return
        }

        self = Color(
            red: Double((value >> 16) & 0xFF) / 255.0,
            green: Double((value >> 8) & 0xFF) / 255.0,
            blue: Double(value & 0xFF) / 255.0
        )
    }
}

final class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {
    @Published var context: WatchDashboardContext?
    @Published var lastSyncText = "Sin sincronizar"
    @Published var statusText = "Esperando al iPhone"

    private let cacheKey = "vidkar.watch.dashboard.context.v2"

    override init() {
        super.init()
        loadCachedContext()
    }

    func activate() {
        guard WCSession.isSupported() else {
            statusText = "WatchConnectivity no disponible"
            return
        }

        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func requestUserSnapshot() {
        guard WCSession.isSupported() else {
            return
        }

        let session = WCSession.default
        guard session.activationState == .activated else {
            statusText = "Conectando con el iPhone"
            return
        }

        guard session.isReachable else {
            statusText = context == nil ? "Abre VIDKAR en el iPhone" : "Usando datos guardados"
            return
        }

        statusText = "Actualizando"
        session.sendMessage(["type": "requestUserSnapshot"], replyHandler: { [weak self] response in
            self?.handlePayload(response)
        }, errorHandler: { [weak self] _ in
            DispatchQueue.main.async {
                self?.statusText = self?.context == nil ? "No se pudo conectar" : "Usando datos guardados"
            }
        })
    }

    func toggleOption(userId: String, option: WatchOptionSnapshot, value: Bool) {
        guard let key = clean(option.key) else {
            return
        }

        guard WCSession.isSupported() else {
            return
        }

        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else {
            statusText = "Abre VIDKAR en el iPhone para aplicar cambios"
            requestUserSnapshot()
            return
        }

        applyLocalToggle(userId: userId, key: key, value: value)
        statusText = "Aplicando cambio"

        session.sendMessage([
            "type": "toggleUserOption",
            "userId": userId,
            "key": key,
            "value": value,
        ], replyHandler: { [weak self] _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                self?.statusText = "Cambio enviado"
                self?.requestUserSnapshot()
            }
        }, errorHandler: { [weak self] _ in
            DispatchQueue.main.async {
                self?.statusText = "No se pudo aplicar"
                self?.requestUserSnapshot()
            }
        })
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { [weak self] in
            if let error {
                self?.statusText = error.localizedDescription
                return
            }

            self?.statusText = activationState == .activated ? "Conectado al iPhone" : "Esperando al iPhone"
            self?.requestUserSnapshot()
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        handlePayload(applicationContext)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        handlePayload(userInfo)
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            self?.statusText = session.isReachable ? "iPhone disponible" : "iPhone no disponible"
        }
    }

    private func handlePayload(_ payload: [String: Any]) {
        let rawContext = payload["user"] as? [String: Any] ?? payload

        guard JSONSerialization.isValidJSONObject(rawContext),
              let data = try? JSONSerialization.data(withJSONObject: rawContext),
              let nextContext = try? JSONDecoder().decode(WatchDashboardContext.self, from: data) else {
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                return
            }

            self.context = nextContext.hasContent ? nextContext : nil
            self.statusText = nextContext.hasContent ? "Datos actualizados" : "Sin sesión activa"
            self.lastSyncText = Self.formatSyncDate(nextContext.syncedAt)
            self.saveCachedContext(nextContext)
        }
    }

    private func loadCachedContext() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let cachedContext = try? JSONDecoder().decode(WatchDashboardContext.self, from: data),
              cachedContext.hasContent else {
            return
        }

        context = cachedContext
        statusText = "Datos guardados"
        lastSyncText = Self.formatSyncDate(cachedContext.syncedAt)
    }

    private func saveCachedContext(_ context: WatchDashboardContext) {
        guard context.hasContent else {
            UserDefaults.standard.removeObject(forKey: cacheKey)
            return
        }

        guard let data = try? JSONEncoder().encode(context) else {
            return
        }

        UserDefaults.standard.set(data, forKey: cacheKey)
    }

    private func applyLocalToggle(userId: String, key: String, value: Bool) {
        guard var currentContext = context else {
            return
        }

        if currentContext.currentUser?.safeId == userId {
            currentContext.currentUser?.options = currentContext.currentUser?.options?.map { option in
                guard option.key == key else {
                    return option
                }

                var nextOption = option
                nextOption.value = value
                return nextOption
            }
        }

        currentContext.users = currentContext.users?.map { user in
            guard user.safeId == userId else {
                return user
            }

            var nextUser = user
            nextUser.options = user.options?.map { option in
                guard option.key == key else {
                    return option
                }

                var nextOption = option
                nextOption.value = value
                return nextOption
            }
            return nextUser
        }

        context = currentContext
    }

    private static func formatSyncDate(_ value: String?) -> String {
        guard let value,
              let date = ISO8601DateFormatter().date(from: value) else {
            return "Sin sincronizar"
        }

        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none

        return "Actualizado " + formatter.string(from: date)
    }
}

struct ContentView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager

    private var visibleUsers: [WatchUserProfile] {
        sessionManager.context?.users ?? []
    }

    private var visibleApprovals: [WatchApprovalSummary] {
        sessionManager.context?.pendingApprovals ?? []
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    header

                    if let currentUser = sessionManager.context?.currentUser {
                        WatchHeroCard(
                            stats: sessionManager.context?.stats,
                            user: currentUser
                        )

                        QuickStatsStrip(
                            approvalsCount: sessionManager.context?.stats?.pendingApprovalsCount ?? visibleApprovals.count,
                            userCount: sessionManager.context?.stats?.userCount ?? visibleUsers.count
                        )

                        NavigationLink {
                            WatchUserDetailView(userId: currentUser.safeId)
                                .environmentObject(sessionManager)
                        } label: {
                            WatchShortcutCard(
                                icon: "person.text.rectangle.fill",
                                subtitle: "Resumen operativo, consumo y permisos",
                                title: "Tu perfil"
                            )
                        }
                        .buttonStyle(.plain)

                        if !visibleUsers.isEmpty {
                            NavigationLink {
                                WatchUsersListView()
                                    .environmentObject(sessionManager)
                            } label: {
                                WatchShortcutCard(
                                    badge: "\(visibleUsers.count)",
                                    icon: "person.3.fill",
                                    subtitle: "Listado resumido con acceso directo a cada perfil",
                                    title: "Usuarios"
                                )
                            }
                            .buttonStyle(.plain)
                        }

                        if !visibleApprovals.isEmpty {
                            NavigationLink {
                                WatchApprovalsListView()
                                    .environmentObject(sessionManager)
                            } label: {
                                WatchShortcutCard(
                                    badge: "\(visibleApprovals.count)",
                                    icon: "checkmark.seal.fill",
                                    subtitle: "Ventas en efectivo pendientes con estado de evidencia",
                                    title: "Pendientes"
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    } else {
                        emptyState
                    }
                }
                .padding()
            }
            .background(Color.black.opacity(0.96))
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .center, spacing: 6) {
                Image(systemName: "applewatch.radiowaves.left.and.right")
                    .foregroundStyle(.cyan)

                Text("VIDKAR Watch")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)

                Spacer(minLength: 8)

                Button {
                    sessionManager.requestUserSnapshot()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.caption.weight(.semibold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
            }

            Text(sessionManager.statusText)
                .font(.caption2)
                .foregroundStyle(.secondary)

            Text(sessionManager.lastSyncText)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "iphone.gen3.radiowaves.left.and.right")
                .font(.title3)
                .foregroundStyle(.blue)

            Text("Abre VIDKAR en el iPhone para sincronizar el tablero del Watch.")
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct WatchHeroCard: View {
    let stats: WatchDashboardStats?
    let user: WatchUserProfile

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 10) {
                WatchAvatarView(
                    name: user.safeDisplayName,
                    picture: user.picture
                )

                VStack(alignment: .leading, spacing: 2) {
                    Text(user.safeDisplayName)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(2)

                    Text(user.safeSubtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            HStack(spacing: 6) {
                WatchPill(text: clean(user.modeLabel) ?? "Modo normal", tone: .blue)
                WatchPill(text: clean(user.roleLabel) ?? "Usuario", tone: .purple)
            }

            HStack(spacing: 8) {
                WatchMetricMini(
                    title: "Deuda",
                    value: clean(user.debtLabel) ?? "Sin deuda"
                )

                WatchMetricMini(
                    title: "Usuarios",
                    value: "\(stats?.userCount ?? 0)"
                )
            }
        }
        .padding(12)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: "#12203B"),
                    Color.black.opacity(0.86)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
    }
}

struct QuickStatsStrip: View {
    let approvalsCount: Int
    let userCount: Int

    var body: some View {
        HStack(spacing: 8) {
            WatchStatCard(icon: "person.2.fill", title: "Usuarios", value: "\(userCount)")
            WatchStatCard(icon: "tray.full.fill", title: "Pendientes", value: "\(approvalsCount)")
        }
    }
}

struct WatchUsersListView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager

    private var admins: [WatchUserProfile] {
        (sessionManager.context?.users ?? []).filter { $0.isAdmin == true }
    }

    private var normalUsers: [WatchUserProfile] {
        (sessionManager.context?.users ?? []).filter { $0.isAdmin != true }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
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
            }
            .padding(.horizontal)
            .padding(.top, 8)
        }
        .background(Color.black.opacity(0.96))
        .navigationTitle("Usuarios")
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
                    WatchHeroCard(stats: sessionManager.context?.stats, user: user)

                    WatchInfoCard(title: "Contacto") {
                        WatchInfoRow(label: "Correo", value: clean(user.email) ?? "No disponible")
                        WatchInfoRow(label: "Teléfono", value: clean(user.phone) ?? "No disponible")
                        WatchInfoRow(label: "Rol", value: clean(user.roleLabel) ?? "Usuario")
                    }

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
                .padding(.horizontal)
                .padding(.top, 8)
            }
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
            .padding(.horizontal)
            .padding(.top, 8)
        }
        .background(Color.black.opacity(0.96))
        .navigationTitle("Pendientes")
    }
}

struct WatchApprovalDetailView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager
    let approvalId: String

    private var approval: WatchApprovalSummary? {
        sessionManager.context?.pendingApprovals?.first(where: { $0.safeId == approvalId })
    }

    var body: some View {
        ScrollView {
            if let approval {
                VStack(alignment: .leading, spacing: 10) {
                    WatchInfoCard(title: "Venta") {
                        Text(clean(approval.title) ?? "Venta pendiente")
                            .font(.headline)
                            .foregroundStyle(.white)

                        WatchInfoRow(label: "Usuario", value: clean(approval.userDisplayName) ?? "Usuario pendiente")
                        WatchInfoRow(label: "Monto", value: clean(approval.amountLabel) ?? "Sin monto")

                        if let createdAt = formatWatchDate(approval.createdAt) {
                            WatchInfoRow(label: "Fecha", value: createdAt)
                        }
                    }

                    WatchInfoCard(title: "Evidencias") {
                        WatchInfoRow(
                            label: "Aprobadas",
                            value: "\(approval.approvedEvidenceCount ?? 0)"
                        )
                        WatchInfoRow(
                            label: "Rechazadas",
                            value: "\(approval.rejectedEvidenceCount ?? 0)"
                        )
                        WatchInfoRow(
                            label: "Total",
                            value: "\(approval.evidenceCount ?? 0)"
                        )
                    }

                    if let types = approval.types, !types.isEmpty {
                        WatchInfoCard(title: "Tipos") {
                            ForEach(types, id: \.self) { type in
                                WatchPill(text: type, tone: .purple)
                            }
                        }
                    }

                    WatchStatusBanner(
                        text: approval.canApproveSale == true
                            ? "Hay evidencia aprobada. En el iPhone ya debería quedar lista para aprobar la venta."
                            : "Todavía falta una evidencia aprobada antes de completar la venta."
                    )
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
        }
        .background(Color.black.opacity(0.96))
        .navigationTitle("Aprobación")
    }
}

struct WatchSectionHeader: View {
    let title: String
    let count: Int

    var body: some View {
        HStack {
            Text(title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)

            Spacer(minLength: 8)

            WatchPill(text: "\(count)", tone: .blue)
        }
        .padding(.top, 4)
    }
}

struct WatchShortcutCard: View {
    var badge: String? = nil
    let icon: String
    let subtitle: String
    let title: String

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.12))
                    .frame(width: 32, height: 32)

                Image(systemName: icon)
                    .foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(title)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)

                    if let badge {
                        WatchPill(text: badge, tone: .blue)
                    }
                }

                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer(minLength: 4)
            Image(systemName: "chevron.right")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
        }
        .padding(10)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct WatchUserRowCard: View {
    let user: WatchUserProfile

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            WatchAvatarView(
                name: user.safeDisplayName,
                picture: user.picture,
                size: 34
            )

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(user.safeDisplayName)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    if user.isAdmin == true {
                        WatchPill(text: "Admin", tone: .purple)
                    }
                }

                Text(user.safeSubtitle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    WatchMiniUsageBadge(
                        active: user.usage?.proxy?.active == true,
                        title: "Proxy"
                    )
                    WatchMiniUsageBadge(
                        active: user.usage?.vpn?.active == true,
                        title: "VPN"
                    )
                }

                Text(clean(user.debtLabel) ?? "Sin deuda")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(Color(hex: "#9fd5ff"))
            }

            Spacer(minLength: 4)
        }
        .padding(10)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct WatchApprovalRowCard: View {
    let approval: WatchApprovalSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(clean(approval.title) ?? "Venta pendiente")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(2)

                Spacer(minLength: 4)

                WatchPill(
                    text: approval.canApproveSale == true ? "Lista" : "Pendiente",
                    tone: approval.canApproveSale == true ? .green : .orange
                )
            }

            Text(clean(approval.userDisplayName) ?? "Usuario pendiente")
                .font(.caption2)
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                Text(clean(approval.amountLabel) ?? "Sin monto")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.white)

                if let createdAt = formatWatchDate(approval.createdAt) {
                    Text("•")
                        .foregroundStyle(.secondary)

                    Text(createdAt)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
        }
        .padding(10)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct WatchInfoCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)

            content
        }
        .padding(10)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct WatchInfoRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)

            Text(value)
                .font(.caption)
                .foregroundStyle(.white)
                .lineLimit(2)
        }
    }
}

struct WatchUsageMetricCard: View {
    let title: String
    let usage: WatchUsageSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)

                Spacer(minLength: 6)

                WatchPill(
                    text: usage.active == true ? "Activo" : (usage.enabled == true ? "Listo" : "Off"),
                    tone: usage.active == true ? .green : (usage.enabled == true ? .blue : .gray)
                )
            }

            ProgressView(value: usage.progress ?? 0)
                .tint(usage.active == true ? .green : .cyan)

            Text(clean(usage.statusLabel) ?? "Sin datos")
                .font(.caption2)
                .foregroundStyle(.white)

            HStack {
                Text(clean(usage.usedLabel) ?? "0 MB")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Spacer(minLength: 6)

                Text(clean(usage.totalLabel) ?? "0 MB")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(8)
        .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct WatchOptionRow: View {
    let option: WatchOptionSnapshot
    let onToggle: (Bool) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(clean(option.label) ?? "Opción")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)

                    if let description = clean(option.description) {
                        Text(description)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }

                Spacer(minLength: 8)

                Toggle("", isOn: Binding(
                    get: { option.value ?? false },
                    set: { nextValue in
                        onToggle(nextValue)
                    }
                ))
                .labelsHidden()
                .disabled(option.editable != true)
            }

            if option.editable != true {
                Text("Solo informativo desde el Watch")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

struct WatchStatusBanner: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(.cyan)

            Text(text)
                .font(.caption)
                .foregroundStyle(.white)
        }
        .padding(10)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct WatchMetricMini: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)

            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(2)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct WatchStatCard: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: icon)
                .foregroundStyle(.cyan)

            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)

            Text(value)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct WatchMiniUsageBadge: View {
    let active: Bool
    let title: String

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(active ? Color.green : Color.gray.opacity(0.6))
                .frame(width: 6, height: 6)

            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(Color.white.opacity(0.06), in: Capsule())
    }
}

struct WatchPill: View {
    enum Tone {
        case blue
        case gray
        case green
        case orange
        case purple
    }

    let text: String
    let tone: Tone

    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(foregroundColor)
            .padding(.horizontal, 7)
            .padding(.vertical, 4)
            .background(backgroundColor, in: Capsule())
    }

    private var backgroundColor: Color {
        switch tone {
        case .blue:
            return Color.blue.opacity(0.18)
        case .gray:
            return Color.white.opacity(0.08)
        case .green:
            return Color.green.opacity(0.18)
        case .orange:
            return Color.orange.opacity(0.18)
        case .purple:
            return Color.purple.opacity(0.18)
        }
    }

    private var foregroundColor: Color {
        switch tone {
        case .blue:
            return .cyan
        case .gray:
            return .secondary
        case .green:
            return .green
        case .orange:
            return .orange
        case .purple:
            return .purple
        }
    }
}

struct WatchAvatarView: View {
    let name: String
    let picture: String?
    var size: CGFloat = 42

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.white.opacity(0.08))
                .frame(width: size, height: size)

            if let pictureURL = clean(picture), let url = URL(string: pictureURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        initialsView
                    }
                }
                .frame(width: size, height: size)
                .clipShape(Circle())
            } else {
                initialsView
            }
        }
    }

    private var initialsView: some View {
        Text(initials(from: name))
            .font(.system(size: size * 0.38, weight: .bold, design: .rounded))
            .foregroundStyle(.cyan)
    }

    private func initials(from name: String) -> String {
        let parts = name
            .split(separator: " ")
            .map(String.init)
            .filter { !$0.isEmpty }

        let initials = parts
            .prefix(2)
            .compactMap { $0.first }
            .map { String($0) }
            .joined()
            .uppercased()

        return initials.isEmpty ? "V" : initials
    }
}

#Preview {
    ContentView()
        .environmentObject(WatchSessionManager())
}
