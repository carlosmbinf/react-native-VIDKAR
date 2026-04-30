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

struct WatchUserSnapshot: Codable, Equatable {
    var id: String?
    var email: String?
    var firstName: String?
    var fullName: String?
    var lastName: String?
    var mode: String?
    var picture: String?
    var role: String?
    var roleComercio: [String]?
    var syncedAt: String?
    var username: String?
    var createdAt: String?

    var displayName: String {
        clean(fullName) ?? clean(username) ?? "Usuario VIDKAR"
    }

    var subtitle: String {
        if let username = clean(username) {
            return "@\(username)"
        }

        return clean(email) ?? "Sesion activa"
    }

    var modeLabel: String {
        switch mode {
        case "cadete":
            return "Modo cadete"
        case "empresa":
            return "Modo empresa"
        default:
            return "Modo normal"
        }
    }

    var roleLabel: String {
        if let role = clean(role) {
            return role.capitalized
        }

        if let firstRole = roleComercio?.first, !firstRole.isEmpty {
            return firstRole.capitalized
        }

        return "Usuario"
    }

    private func clean(_ value: String?) -> String? {
        guard let value else {
            return nil
        }

        let trimmedValue = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmedValue.isEmpty ? nil : trimmedValue
    }
}

final class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {
    @Published var user: WatchUserSnapshot?
    @Published var statusText = "Esperando al iPhone"
    @Published var lastSyncText = "Sin sincronizar"

    private let cacheKey = "vidkar.watch.user.snapshot.v1"

    override init() {
        super.init()
        loadCachedUser()
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
            statusText = user == nil ? "Abre VIDKAR en el iPhone" : "Usando datos guardados"
            return
        }

        statusText = "Actualizando"
        session.sendMessage(["type": "requestUserSnapshot"], replyHandler: { [weak self] response in
            self?.handlePayload(response)
        }, errorHandler: { [weak self] _ in
            DispatchQueue.main.async {
                self?.statusText = self?.user == nil ? "No se pudo conectar" : "Usando datos guardados"
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

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        handlePayload(applicationContext)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        handlePayload(userInfo)
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            self?.statusText = session.isReachable ? "iPhone disponible" : "iPhone no disponible"
        }
    }

    private func handlePayload(_ payload: [String: Any]) {
        let userPayload = payload["user"] as? [String: Any] ?? payload

        guard JSONSerialization.isValidJSONObject(userPayload),
              let data = try? JSONSerialization.data(withJSONObject: userPayload),
              let snapshot = try? JSONDecoder().decode(WatchUserSnapshot.self, from: data) else {
            return
        }

        DispatchQueue.main.async { [weak self] in
            self?.user = snapshot.id == nil ? nil : snapshot
            self?.statusText = snapshot.id == nil ? "Sin sesion activa" : "Datos actualizados"
            self?.lastSyncText = Self.formatSyncDate(snapshot.syncedAt)
            self?.saveCachedUser(snapshot)
        }
    }

    private func loadCachedUser() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let snapshot = try? JSONDecoder().decode(WatchUserSnapshot.self, from: data),
              snapshot.id != nil else {
            return
        }

        user = snapshot
        lastSyncText = Self.formatSyncDate(snapshot.syncedAt)
        statusText = "Datos guardados"
    }

    private func saveCachedUser(_ snapshot: WatchUserSnapshot) {
        if snapshot.id == nil {
            UserDefaults.standard.removeObject(forKey: cacheKey)
            return
        }

        guard let data = try? JSONEncoder().encode(snapshot) else {
            return
        }

        UserDefaults.standard.set(data, forKey: cacheKey)
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

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                header

                if let user = sessionManager.user {
                    userCard(user)
                    metadataCard(user)
                } else {
                    emptyState
                }

                Button("Actualizar") {
                    sessionManager.requestUserSnapshot()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
            .padding()
        }
        .background(Color.black.opacity(0.92))
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .foregroundStyle(.blue)

                Text("VIDKAR")
                    .font(.headline)
                    .fontWeight(.semibold)
            }

            Text(sessionManager.statusText)
                .font(.caption2)
                .foregroundStyle(.secondary)

            Text(sessionManager.lastSyncText)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private func userCard(_ user: WatchUserSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                ZStack {
                    Circle()
                        .fill(.blue.opacity(0.24))
                        .frame(width: 42, height: 42)

                    Text(String(user.displayName.prefix(1)).uppercased())
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundStyle(.blue)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(user.displayName)
                        .font(.headline)
                        .lineLimit(2)

                    Text(user.subtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            HStack(spacing: 6) {
                Label(user.modeLabel, systemImage: "person.crop.circle.badge.checkmark")
                    .font(.caption2)

                Spacer(minLength: 0)
            }
            .padding(8)
            .background(.blue.opacity(0.16), in: RoundedRectangle(cornerRadius: 10))
        }
        .padding(10)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
    }

    private func metadataCard(_ user: WatchUserSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            infoRow(label: "Rol", value: user.roleLabel)

            if let email = user.email, !email.isEmpty {
                infoRow(label: "Correo", value: email)
            }

            if let firstRole = user.roleComercio?.first, !firstRole.isEmpty {
                infoRow(label: "Comercio", value: firstRole)
            }
        }
        .padding(10)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
    }

    private func infoRow(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)

            Text(value)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(2)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "iphone.gen3.radiowaves.left.and.right")
                .font(.title3)
                .foregroundStyle(.blue)

            Text("Abre VIDKAR en el iPhone para sincronizar el usuario logueado.")
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    ContentView()
        .environmentObject(WatchSessionManager())
}