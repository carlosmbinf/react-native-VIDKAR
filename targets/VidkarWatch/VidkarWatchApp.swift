import SwiftUI

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
