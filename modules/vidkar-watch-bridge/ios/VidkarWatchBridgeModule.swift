import ExpoModulesCore
import Foundation
import WatchConnectivity

private final class VidkarWatchBridgeSession: NSObject, WCSessionDelegate {
  static let shared = VidkarWatchBridgeSession()

  private var lastUserContext: [String: Any] = [:]
  private var pendingReplyHandlers: [String: ([String: Any]) -> Void] = [:]
  var onMessage: (([String: Any]) -> Void)?

  private override init() {
    super.init()
  }

  private var isSupported: Bool {
    WCSession.isSupported()
  }

  private var session: WCSession? {
    isSupported ? WCSession.default : nil
  }

  func activate() -> [String: Any] {
    guard let session else {
      return status(extra: ["supported": false])
    }

    session.delegate = self
    session.activate()

    return status(extra: ["supported": true])
  }

  func status(extra: [String: Any] = [:]) -> [String: Any] {
    guard let session else {
      return [
        "activated": false,
        "paired": false,
        "reachable": false,
        "supported": false,
        "watchAppInstalled": false,
      ].merging(extra) { _, new in new }
    }

    return [
      "activated": session.activationState == .activated,
      "paired": session.isPaired,
      "reachable": session.isReachable,
      "supported": true,
      "watchAppInstalled": session.isWatchAppInstalled,
    ].merging(extra) { _, new in new }
  }

  func updateUserContext(_ userContext: [String: Any]) throws -> [String: Any] {
    guard let session else {
      return status(extra: ["sent": false])
    }

    lastUserContext = userContext
    try session.updateApplicationContext(["type": "userSnapshot", "user": userContext])

    return status(extra: ["sent": true])
  }

  func clearUserContext() throws -> [String: Any] {
    try updateUserContext([:])
  }

  func transferUserInfo(_ payload: [String: Any]) -> [String: Any] {
    guard let session else {
      return status(extra: ["queued": false])
    }

    session.transferUserInfo(["type": "userSnapshot", "user": payload])
    return status(extra: ["queued": true])
  }

  func sendMessage(_ payload: [String: Any], reply: @escaping ([String: Any]) -> Void, reject: @escaping (String, String) -> Void) {
    guard let session else {
      reject("watch_unavailable", "WatchConnectivity no esta disponible en este dispositivo.")
      return
    }

    guard session.isReachable else {
      reject("watch_unreachable", "El Apple Watch no esta alcanzable ahora mismo.")
      return
    }

    session.sendMessage(payload, replyHandler: { response in
      reply(response)
    }, errorHandler: { error in
      reject("watch_message_failed", error.localizedDescription)
    })
  }

  func replyToMessage(_ replyId: String, response: [String: Any]) -> [String: Any] {
    guard let replyHandler = pendingReplyHandlers.removeValue(forKey: replyId) else {
      return status(extra: ["replied": false, "reason": "reply_not_found"])
    }

    replyHandler(response)
    return status(extra: ["replied": true])
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    if message["type"] as? String == "requestUserSnapshot" {
      replyHandler(["type": "userSnapshot", "user": lastUserContext])
      return
    }

    guard let onMessage else {
      replyHandler([
        "ok": false,
        "error": "iphone_listener_unavailable",
        "message": "Abre VIDKAR en el iPhone para aplicar cambios.",
      ])
      return
    }

    let replyId = UUID().uuidString
    pendingReplyHandlers[replyId] = replyHandler

    var enrichedMessage = message
    enrichedMessage["_replyId"] = replyId

    DispatchQueue.main.async { [weak self] in
      self?.onMessage?(enrichedMessage)
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 25) { [weak self] in
      guard let pendingReplyHandler = self?.pendingReplyHandlers.removeValue(forKey: replyId) else {
        return
      }

      pendingReplyHandler([
        "ok": false,
        "error": "iphone_handler_timeout",
        "message": "VIDKAR no respondio a tiempo.",
      ])
    }
  }
}

public final class VidkarWatchBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VidkarWatchBridge")
    Events("onWatchMessage")

    OnStartObserving {
      VidkarWatchBridgeSession.shared.onMessage = { [weak self] payload in
        self?.sendEvent("onWatchMessage", payload)
      }
    }

    OnStopObserving {
      VidkarWatchBridgeSession.shared.onMessage = nil
    }

    AsyncFunction("activate") { () -> [String: Any] in
      VidkarWatchBridgeSession.shared.activate()
    }

    AsyncFunction("status") { () -> [String: Any] in
      VidkarWatchBridgeSession.shared.status()
    }

    AsyncFunction("updateUserContext") { (userContext: [String: Any]) -> [String: Any] in
      try VidkarWatchBridgeSession.shared.updateUserContext(userContext)
    }

    AsyncFunction("clearUserContext") { () -> [String: Any] in
      try VidkarWatchBridgeSession.shared.clearUserContext()
    }

    AsyncFunction("transferUserInfo") { (payload: [String: Any]) -> [String: Any] in
      VidkarWatchBridgeSession.shared.transferUserInfo(payload)
    }

    AsyncFunction("sendMessage") { (payload: [String: Any], promise: Promise) in
      VidkarWatchBridgeSession.shared.sendMessage(payload, reply: { response in
        promise.resolve(response)
      }, reject: { code, message in
        promise.reject(code, message)
      })
    }

    AsyncFunction("replyToMessage") { (replyId: String, response: [String: Any]) -> [String: Any] in
      VidkarWatchBridgeSession.shared.replyToMessage(replyId, response: response)
    }
  }
}
