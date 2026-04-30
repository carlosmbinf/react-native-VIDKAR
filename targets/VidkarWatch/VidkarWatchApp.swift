import SwiftUI

@main
struct VidkarWatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "applewatch")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(.blue)

            Text("Hola mundo")
                .font(.headline)
                .multilineTextAlignment(.center)

            Text("VIDKAR en Apple Watch")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}