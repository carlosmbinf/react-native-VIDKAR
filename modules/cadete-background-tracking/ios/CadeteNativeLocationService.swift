import CoreLocation
import Foundation

public final class CadeteNativeLocationService: NSObject, CLLocationManagerDelegate {
  public static let shared = CadeteNativeLocationService()

  private let manager = CLLocationManager()
  private let queue = DispatchQueue(label: "com.vidkar.cadete-native-location")

  private var lastKnownLocation: CLLocation?
  private var lastSentLocation: CLLocation?
  private var lastSentAt: TimeInterval = 0
  private var lastActiveCheckAt: TimeInterval = 0
  private var cachedIsActive = true
  private var heartbeatTimer: DispatchSourceTimer?
  private var trackingActive = false
  private var lastError = ""

  private override init() {
    super.init()
    manager.delegate = self
    manager.activityType = .otherNavigation
    manager.allowsBackgroundLocationUpdates = false
    manager.showsBackgroundLocationIndicator = false
    manager.pausesLocationUpdatesAutomatically = false
    manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
    manager.distanceFilter = 5
  }

  public func startTracking(userId: String, meteorUrl: String?) -> [String: Any?] {
    persistConfig(enabled: true, userId: userId, meteorUrl: meteorUrl)
    startTrackingInternal(requestPermissions: true)
    return currentStatus()
  }

  public func stopTracking(clearConfig: Bool) -> [String: Any?] {
    heartbeatTimer?.cancel()
    heartbeatTimer = nil
    performLocationManagerWork {
      self.manager.allowsBackgroundLocationUpdates = false
      self.manager.showsBackgroundLocationIndicator = false
      self.manager.stopUpdatingLocation()
      self.manager.stopMonitoringSignificantLocationChanges()
    }
    trackingActive = false
    cachedIsActive = true
    lastActiveCheckAt = 0
    lastError = ""
    if clearConfig {
      persistConfig(enabled: false, userId: nil, meteorUrl: nil)
    }
    return currentStatus()
  }

  public func syncTracking(enabled: Bool, userId: String?, meteorUrl: String?) -> [String: Any?] {
    guard enabled, let userId, !userId.isEmpty else {
      return stopTracking(clearConfig: true)
    }

    return startTracking(userId: userId, meteorUrl: meteorUrl)
  }

  public func restoreTrackingIfNeeded() {
    let config = readConfig()
    guard config.enabled, let userId = config.userId, !userId.isEmpty else {
      return
    }

    guard shouldCadeteRemainActive() else {
      _ = stopTracking(clearConfig: true)
      return
    }

    if trackingActive {
      performLocationManagerWork {
        self.manager.allowsBackgroundLocationUpdates = true
        self.manager.showsBackgroundLocationIndicator = true
        if self.manager.authorizationStatus == .authorizedAlways {
          self.manager.startUpdatingLocation()
          self.manager.startMonitoringSignificantLocationChanges()
        }
      }
      scheduleHeartbeatTimer()
      return
    }

    startTrackingInternal(requestPermissions: false)
  }

  public func currentStatus() -> [String: Any?] {
    return [
      "lastError": lastError,
      "lastSentAt": lastSentAt > 0 ? Int(lastSentAt * 1000) : nil,
      "trackingActive": trackingActive,
      "trackingMode": "native",
      "userId": readConfig().userId,
    ]
  }

  private func startTrackingInternal(requestPermissions: Bool) {
    let status = manager.authorizationStatus
    if requestPermissions {
      switch status {
      case .notDetermined:
        manager.requestAlwaysAuthorization()
        return
      case .authorizedAlways:
        break
      default:
        lastError = "Debes permitir la ubicación siempre para mantener activo el tracking nativo del cadete."
        trackingActive = false
        return
      }
    } else if status != .authorizedAlways {
      lastError = "El tracking nativo del cadete encontró la configuración guardada, pero falta autorización Always."
      trackingActive = false
      return
    }

    trackingActive = true
    lastError = ""
    performLocationManagerWork {
      self.manager.allowsBackgroundLocationUpdates = true
      self.manager.showsBackgroundLocationIndicator = true
      self.manager.startUpdatingLocation()
      self.manager.startMonitoringSignificantLocationChanges()
    }
    scheduleHeartbeatTimer()
  }

  private func performLocationManagerWork(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
      return
    }

    DispatchQueue.main.sync(execute: work)
  }

  private func scheduleHeartbeatTimer() {
    heartbeatTimer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(deadline: .now(), repeating: .milliseconds(Int(heartbeatMs)))
    timer.setEventHandler { [weak self] in
      guard let self else { return }
      guard self.readConfig().enabled else { return }
      guard let location = self.lastKnownLocation else { return }
      self.handleLocation(location, force: true)
    }
    heartbeatTimer = timer
    timer.resume()
  }

  public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if manager.authorizationStatus == .authorizedAlways,
       readConfig().enabled,
       shouldCadeteRemainActive() {
      startTrackingInternal(requestPermissions: false)
    }
  }

  public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    lastError = error.localizedDescription
  }

  public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else {
      return
    }

    handleLocation(location, force: false)
  }

  private func handleLocation(_ location: CLLocation, force: Bool) {
    lastKnownLocation = location

    queue.async {
      guard force || self.shouldSend(location) else {
        return
      }

      guard self.shouldCadeteRemainActive() else {
        _ = self.stopTracking(clearConfig: true)
        return
      }

      if self.postLocation(location) {
        self.lastSentLocation = location
        self.lastSentAt = Date().timeIntervalSince1970
        self.lastError = ""
      }
    }
  }

  private func shouldSend(_ location: CLLocation) -> Bool {
    guard let previous = lastSentLocation else {
      return true
    }

    let now = location.timestamp.timeIntervalSince1970
    if now - lastSentAt >= heartbeatMs / 1000 {
      return true
    }

    return location.distance(from: previous) >= distanceIntervalMeters
  }

  private func shouldCadeteRemainActive() -> Bool {
    let now = Date().timeIntervalSince1970
    if now - lastActiveCheckAt < activeCheckIntervalMs / 1000 {
      return cachedIsActive
    }

    guard let apiBaseUrl = resolveHttpOrigin(readConfig().meteorUrl) else {
      return true
    }

    do {
      var request = URLRequest(url: URL(string: "\(apiBaseUrl)/api/cadete/isActive")!)
      request.httpMethod = "POST"
      request.timeoutInterval = networkTimeoutMs / 1000
      request.setValue("application/json", forHTTPHeaderField: "Accept")
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONSerialization.data(withJSONObject: ["userId": readConfig().userId as Any])

      let semaphore = DispatchSemaphore(value: 0)
      var active = true
      URLSession.shared.dataTask(with: request) { data, _, _ in
        defer { semaphore.signal() }
        guard
          let data,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
          return
        }
        active = (json["active"] as? Bool) ?? true
      }.resume()
      semaphore.wait()
      cachedIsActive = active
      lastActiveCheckAt = now
      return active
    } catch {
      return true
    }
  }

  private func postLocation(_ location: CLLocation) -> Bool {
    guard let apiBaseUrl = resolveHttpOrigin(readConfig().meteorUrl) else {
      return false
    }

    do {
      var request = URLRequest(url: URL(string: "\(apiBaseUrl)/api/location")!)
      request.httpMethod = "POST"
      request.timeoutInterval = networkTimeoutMs / 1000
      request.setValue("application/json", forHTTPHeaderField: "Accept")
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONSerialization.data(withJSONObject: [
        "accuracy": location.horizontalAccuracy,
        "lat": location.coordinate.latitude,
        "lng": location.coordinate.longitude,
        "speed": location.speed,
        "timestamp": Int(location.timestamp.timeIntervalSince1970 * 1000),
        "userId": readConfig().userId as Any,
      ])

      let semaphore = DispatchSemaphore(value: 0)
      var success = false
      URLSession.shared.dataTask(with: request) { data, response, error in
        defer { semaphore.signal() }
        if let error {
          self.lastError = error.localizedDescription
          return
        }
        if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) {
          success = true
          return
        }
        if let data,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let reason = json["reason"] as? String ?? json["error"] as? String {
          self.lastError = reason
        } else {
          self.lastError = "No se pudo enviar la ubicación del cadete."
        }
      }.resume()
      semaphore.wait()
      return success
    } catch {
      lastError = error.localizedDescription
      return false
    }
  }

  private func resolveHttpOrigin(_ meteorUrl: String?) -> String? {
    guard let meteorUrl, !meteorUrl.isEmpty, let url = URL(string: meteorUrl) else {
      return nil
    }

    let scheme = url.scheme == "wss" ? "https" : "http"
    if let port = url.port {
      return "\(scheme)://\(url.host ?? ""):\(port)"
    }
    return "\(scheme)://\(url.host ?? "")"
  }

  private func readConfig() -> (enabled: Bool, userId: String?, meteorUrl: String?) {
    let defaults = UserDefaults.standard
    return (
      enabled: defaults.bool(forKey: Self.enabledKey),
      userId: defaults.string(forKey: Self.userIdKey),
      meteorUrl: defaults.string(forKey: Self.meteorUrlKey)
    )
  }

  private func persistConfig(enabled: Bool, userId: String?, meteorUrl: String?) {
    let defaults = UserDefaults.standard
    defaults.set(enabled, forKey: Self.enabledKey)
    defaults.set(userId, forKey: Self.userIdKey)
    defaults.set(meteorUrl, forKey: Self.meteorUrlKey)
  }

  private let activeCheckIntervalMs: TimeInterval = 120000
  private let distanceIntervalMeters: CLLocationDistance = 15
  private let heartbeatMs: TimeInterval = 30000
  private let networkTimeoutMs: TimeInterval = 12000

  private static let enabledKey = "cadete.nativeTracking.enabled"
  private static let meteorUrlKey = "cadete.nativeTracking.meteorUrl"
  private static let userIdKey = "cadete.nativeTracking.userId"
}