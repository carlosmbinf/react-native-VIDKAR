import SwiftUI
import WatchConnectivity

final class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {
    @Published var context: WatchDashboardContext?
    @Published private(set) var evidenceImageUrlById: [String: String] = [:]
    @Published private(set) var evidencePreviewErrorById: [String: String] = [:]
    @Published private(set) var evidencePreviewLoadingIds: Set<String> = []
    @Published var lastSyncText = "Sin sincronizar"
    @Published var statusText = "Esperando al iPhone"

    private let cacheKey = "vidkar.watch.dashboard.context.v2"
    private var pendingOptionChanges: [String: PendingOptionChange] = [:]

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

    func requestUserSnapshot(completion: (() -> Void)? = nil) {
        guard WCSession.isSupported() else {
            completion?()
            return
        }

        let session = WCSession.default
        guard session.activationState == .activated else {
            statusText = "Conectando con el iPhone"
            completion?()
            return
        }

        guard session.isReachable else {
            statusText = context == nil ? "Abre VIDKAR en el iPhone" : "Usando datos guardados"
            completion?()
            return
        }

        statusText = "Actualizando"
        session.sendMessage(["type": "requestUserSnapshot"], replyHandler: { [weak self] response in
            self?.handlePayload(response)
            DispatchQueue.main.async {
                completion?()
            }
        }, errorHandler: { [weak self] _ in
            DispatchQueue.main.async {
                self?.statusText = self?.context == nil ? "No se pudo conectar" : "Usando datos guardados"
                completion?()
            }
        })
    }

    func refreshUserSnapshot() async {
        await withCheckedContinuation { continuation in
            requestUserSnapshot {
                continuation.resume()
            }
        }
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
            DispatchQueue.main.async {
                self?.statusText = "Cambio enviado"
            }
        }, errorHandler: { [weak self] _ in
            DispatchQueue.main.async {
                self?.statusText = "No se pudo aplicar"
                self?.clearPendingOptionChange(userId: userId, key: key)
                self?.requestUserSnapshot()
            }
        })
    }

    func approveEvidence(evidenceId: String, saleId: String) {
        sendWatchAction(
            payload: [
                "type": "approveEvidence",
                "evidenceId": evidenceId,
                "saleId": saleId,
            ],
            optimisticUpdate: { [weak self] in
                self?.applyLocalEvidenceApproval(evidenceId: evidenceId, saleId: saleId)
            },
            successStatus: "Evidencia enviada"
        )
    }

    func rejectEvidence(evidenceId: String, saleId: String) {
        sendWatchAction(
            payload: [
                "type": "rejectEvidence",
                "evidenceId": evidenceId,
                "saleId": saleId,
            ],
            optimisticUpdate: { [weak self] in
                self?.applyLocalEvidenceRejection(evidenceId: evidenceId, saleId: saleId)
            },
            successStatus: "Rechazo enviado"
        )
    }

    func approveSale(saleId: String) {
        sendWatchAction(
            payload: [
                "type": "approveSale",
                "saleId": saleId,
            ],
            optimisticUpdate: { [weak self] in
                self?.applyLocalSaleApproval(saleId: saleId)
            },
            successStatus: "Venta enviada"
        )
    }

    func rejectSale(saleId: String) {
        sendWatchAction(
            payload: [
                "type": "rejectSale",
                "saleId": saleId,
            ],
            optimisticUpdate: { [weak self] in
                self?.applyLocalSaleRejection(saleId: saleId)
            },
            successStatus: "Venta rechazada"
        )
    }

    func requestEvidencePreview(evidenceId: String) {
        guard !evidenceId.isEmpty else {
            return
        }

        print("[VidkarWatch] requestEvidencePreview evidenceId=\(evidenceId)")

        if evidenceImageUrlById[evidenceId] != nil || evidencePreviewLoadingIds.contains(evidenceId) {
            return
        }

        guard WCSession.isSupported() else {
            evidencePreviewErrorById[evidenceId] = "WatchConnectivity no disponible"
            return
        }

        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else {
            evidencePreviewErrorById[evidenceId] = "Abre VIDKAR en el iPhone para ver la evidencia"
            return
        }

        evidencePreviewErrorById[evidenceId] = nil
        evidencePreviewLoadingIds.insert(evidenceId)
        statusText = "Cargando evidencia"

        session.sendMessage([
            "type": "requestEvidencePreview",
            "evidenceId": evidenceId,
        ], replyHandler: { _ in
            // La URL llega como mensaje nativo separado: type=evidencePreview.
        }, errorHandler: { [weak self] _ in
            DispatchQueue.main.async {
                self?.evidencePreviewLoadingIds.remove(evidenceId)
                self?.evidencePreviewErrorById[evidenceId] = "No se pudo cargar la evidencia"
                self?.statusText = "No se pudo cargar"
            }
        })
    }

    func evidenceImageUrl(for evidenceId: String) -> String? {
        evidenceImageUrlById[evidenceId]
    }

    func evidencePreviewError(for evidenceId: String) -> String? {
        evidencePreviewErrorById[evidenceId]
    }

    func isEvidencePreviewLoading(_ evidenceId: String) -> Bool {
        evidencePreviewLoadingIds.contains(evidenceId)
    }

    private func sendWatchAction(payload: [String: Any], optimisticUpdate: (() -> Void)? = nil, successStatus: String) {
        guard WCSession.isSupported() else {
            return
        }

        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else {
            statusText = "Abre VIDKAR en el iPhone para aplicar cambios"
            requestUserSnapshot()
            return
        }

        statusText = "Enviando cambio"

        session.sendMessage(payload, replyHandler: { [weak self] response in
            DispatchQueue.main.async {
                if response["ok"] as? Bool == false {
                    let message = response["message"] as? String
                    self?.statusText = message?.isEmpty == false ? message! : "No se pudo aplicar"
                    self?.requestUserSnapshot()
                    return
                }

                optimisticUpdate?()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                    self?.statusText = successStatus
                    self?.requestUserSnapshot()
                }
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

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        handleIncomingRealtimeMessage(message)
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String : Any],
        replyHandler: @escaping ([String : Any]) -> Void
    ) {
        handleIncomingRealtimeMessage(message)
        replyHandler(["ok": true, "received": true])
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            self?.statusText = session.isReachable ? "iPhone disponible" : "iPhone no disponible"
        }
    }

    private func handleIncomingRealtimeMessage(_ message: [String: Any]) {
        guard let type = message["type"] as? String else {
            return
        }

        switch type {
        case "userSnapshot":
            handlePayload(message)
        case "evidencePreview":
            guard
                let evidenceId = message["evidenceId"] as? String,
                let imageUrl = message["imageUrl"] as? String,
                !evidenceId.isEmpty,
                !imageUrl.isEmpty
            else {
                return
            }

            print("[VidkarWatch] evidencePreview evidenceId=\(evidenceId) imageUrl=\(imageUrl)")

            DispatchQueue.main.async { [weak self] in
                self?.evidenceImageUrlById[evidenceId] = imageUrl
                self?.evidencePreviewLoadingIds.remove(evidenceId)
                self?.evidencePreviewErrorById[evidenceId] = nil
                self?.statusText = "Evidencia cargada"
            }
        case "evidencePreviewUnavailable":
            guard let evidenceId = message["evidenceId"] as? String, !evidenceId.isEmpty else {
                return
            }

            let reason = (message["reason"] as? String) ?? "No disponible"
            print("[VidkarWatch] evidencePreviewUnavailable evidenceId=\(evidenceId) reason=\(reason)")
            DispatchQueue.main.async { [weak self] in
                self?.evidencePreviewLoadingIds.remove(evidenceId)
                self?.evidencePreviewErrorById[evidenceId] = reason
                self?.statusText = "Sin preview"
            }
        default:
            break
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

            let resolvedContext = self.mergePendingOptionChanges(into: nextContext)

            self.context = resolvedContext.hasContent ? resolvedContext : nil
            self.statusText = nextContext.hasContent ? "Datos actualizados" : "Sin sesión activa"
            self.lastSyncText = Self.formatSyncDate(resolvedContext.syncedAt)
            self.saveCachedContext(resolvedContext)
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
        pendingOptionChanges[Self.pendingOptionChangeKey(userId: userId, key: key)] = PendingOptionChange(
            key: key,
            userId: userId,
            value: value
        )

        guard var currentContext = context else {
            return
        }

        if var currentUser = currentContext.currentUser, currentUser.safeId == userId {
            currentUser.options = currentUser.options?.map { option in
                guard option.key == key else {
                    return option
                }

                var nextOption = option
                nextOption.value = value
                return nextOption
            }
            currentContext.currentUser = currentUser
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

    private func applyLocalEvidenceApproval(evidenceId: String, saleId: String) {
        guard var currentContext = context else {
            return
        }

        currentContext.pendingApprovals = currentContext.pendingApprovals?.map { approval in
            guard approval.safeId == saleId else {
                return approval
            }

            var nextApproval = approval
            var approvedDelta = 0
            var rejectedDelta = 0
            nextApproval.evidences = approval.evidences?.map { evidence in
                guard evidence.safeId == evidenceId else {
                    return evidence
                }

                var nextEvidence = evidence
                if nextEvidence.approved != true {
                    approvedDelta = 1
                }
                if nextEvidence.rejected == true {
                    rejectedDelta = -1
                }
                nextEvidence.approved = true
                nextEvidence.rejected = false
                nextEvidence.statusLabel = "Aprobada"
                return nextEvidence
            }
            nextApproval.approvedEvidenceCount = (approval.approvedEvidenceCount ?? 0) + approvedDelta
            nextApproval.rejectedEvidenceCount = max((approval.rejectedEvidenceCount ?? 0) + rejectedDelta, 0)
            nextApproval.canApproveSale = true
            return nextApproval
        }

        context = currentContext
        saveCachedContext(currentContext)
    }

    private func applyLocalEvidenceRejection(evidenceId: String, saleId: String) {
        guard var currentContext = context else {
            return
        }

        currentContext.pendingApprovals = currentContext.pendingApprovals?.map { approval in
            guard approval.safeId == saleId else {
                return approval
            }

            var nextApproval = approval
            var approvedDelta = 0
            var rejectedDelta = 0
            nextApproval.evidences = approval.evidences?.map { evidence in
                guard evidence.safeId == evidenceId else {
                    return evidence
                }

                var nextEvidence = evidence
                if nextEvidence.approved == true {
                    approvedDelta = -1
                }
                if nextEvidence.rejected != true {
                    rejectedDelta = 1
                }
                nextEvidence.approved = false
                nextEvidence.rejected = true
                nextEvidence.statusLabel = "Rechazada"
                return nextEvidence
            }
            nextApproval.approvedEvidenceCount = max((approval.approvedEvidenceCount ?? 0) + approvedDelta, 0)
            nextApproval.rejectedEvidenceCount = (approval.rejectedEvidenceCount ?? 0) + rejectedDelta
            let hasApprovedEvidence = nextApproval.evidences?.contains(where: { $0.approved == true }) == true
            nextApproval.canApproveSale = hasApprovedEvidence
            return nextApproval
        }

        context = currentContext
        saveCachedContext(currentContext)
    }

    private func applyLocalSaleApproval(saleId: String) {
        guard var currentContext = context else {
            return
        }

        currentContext.pendingApprovals = currentContext.pendingApprovals?.filter { approval in
            approval.safeId != saleId
        }

        if var stats = currentContext.stats {
            stats.pendingApprovalsCount = max((stats.pendingApprovalsCount ?? 1) - 1, 0)
            currentContext.stats = stats
        }

        context = currentContext
        saveCachedContext(currentContext)
    }

    private func applyLocalSaleRejection(saleId: String) {
        guard var currentContext = context else {
            return
        }

        currentContext.pendingApprovals = currentContext.pendingApprovals?.filter { approval in
            approval.safeId != saleId
        }

        if var stats = currentContext.stats {
            stats.pendingApprovalsCount = max((stats.pendingApprovalsCount ?? 1) - 1, 0)
            currentContext.stats = stats
        }

        context = currentContext
        saveCachedContext(currentContext)
    }

    private func mergePendingOptionChanges(into nextContext: WatchDashboardContext) -> WatchDashboardContext {
        pruneExpiredPendingOptionChanges()

        guard !pendingOptionChanges.isEmpty else {
            return nextContext
        }

        var resolvedContext = nextContext

        for pendingChange in pendingOptionChanges.values {
            let remoteValue = optionValue(
                in: resolvedContext,
                userId: pendingChange.userId,
                key: pendingChange.key
            )

            if remoteValue == pendingChange.value {
                clearPendingOptionChange(userId: pendingChange.userId, key: pendingChange.key)
                continue
            }

            applyPendingOptionChange(&resolvedContext, pendingChange)
        }

        return resolvedContext
    }

    private func applyPendingOptionChange(_ context: inout WatchDashboardContext, _ pendingChange: PendingOptionChange) {
        if var currentUser = context.currentUser, currentUser.safeId == pendingChange.userId {
            currentUser.options = optionsByApplying(
                key: pendingChange.key,
                value: pendingChange.value,
                options: currentUser.options
            )
            context.currentUser = currentUser
        }

        context.users = context.users?.map { user in
            guard user.safeId == pendingChange.userId else {
                return user
            }

            var nextUser = user
            nextUser.options = optionsByApplying(
                key: pendingChange.key,
                value: pendingChange.value,
                options: user.options
            )
            return nextUser
        }
    }

    private func optionsByApplying(key: String, value: Bool, options: [WatchOptionSnapshot]?) -> [WatchOptionSnapshot]? {
        options?.map { option in
            guard option.key == key else {
                return option
            }

            var nextOption = option
            nextOption.value = value
            return nextOption
        }
    }

    private func optionValue(in context: WatchDashboardContext, userId: String, key: String) -> Bool? {
        if context.currentUser?.safeId == userId,
           let value = context.currentUser?.options?.first(where: { $0.key == key })?.value {
            return value
        }

        return context.users?
            .first(where: { $0.safeId == userId })?
            .options?
            .first(where: { $0.key == key })?
            .value
    }

    private func clearPendingOptionChange(userId: String, key: String) {
        pendingOptionChanges.removeValue(forKey: Self.pendingOptionChangeKey(userId: userId, key: key))
    }

    private func pruneExpiredPendingOptionChanges() {
        let now = Date()
        pendingOptionChanges = pendingOptionChanges.filter { _, change in
            now.timeIntervalSince(change.createdAt) < 8
        }
    }

    private static func pendingOptionChangeKey(userId: String, key: String) -> String {
        "\(userId)::\(key)"
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

private struct PendingOptionChange {
    let createdAt = Date()
    let key: String
    let userId: String
    let value: Bool
}