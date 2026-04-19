import ExpoModulesCore

public final class CadeteBackgroundTrackingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CadeteBackgroundTracking")

    AsyncFunction("startTracking") { (userId: String, meteorUrl: String?) -> [String: Any?] in
      return CadeteNativeLocationService.shared.startTracking(userId: userId, meteorUrl: meteorUrl)
    }

    AsyncFunction("stopTracking") { () -> [String: Any?] in
      return CadeteNativeLocationService.shared.stopTracking(clearConfig: true)
    }

    AsyncFunction("syncTracking") { (enabled: Bool, userId: String?, meteorUrl: String?) -> [String: Any?] in
      return CadeteNativeLocationService.shared.syncTracking(enabled: enabled, userId: userId, meteorUrl: meteorUrl)
    }

    AsyncFunction("getStatus") { () -> [String: Any?] in
      return CadeteNativeLocationService.shared.currentStatus()
    }
  }
}
