import Foundation

enum IOSCourseVisibility {
  static let defaultsKey = "vidkar.iosCoursesEnabled"

  static var isEnabled: Bool {
    UserDefaults(suiteName: "group.com.vidkar")?.bool(forKey: defaultsKey) ?? false
  }

  static func allows(entityType: String) -> Bool {
    isEnabled || !["course", "curso", "lesson", "leccion"].contains(entityType.lowercased())
  }

  static func blocksTool(name: String, arguments: [String: Any]) -> Bool {
    guard !isEnabled else { return false }
    let normalizedName = name.lowercased()
    if ["course", "curso", "lesson", "leccion"].contains(where: { normalizedName.contains($0) }) {
      return true
    }
    if normalizedName == "search_entities" {
      return !allows(entityType: arguments["entity"] as? String ?? "all")
    }
    return false
  }

  static func filterSearchOutput(_ output: String) -> String? {
    guard let data = output.data(using: .utf8),
          var response = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    if response["success"] as? Bool == false { return output }
    guard let results = response["results"] as? [[String: Any]] else { return nil }
    let visibleResults = results.filter { result in
      guard let entityType = result["type"] as? String ?? result["entityType"] as? String,
            !entityType.isEmpty else { return false }
      return allows(entityType: entityType)
    }
    response["results"] = visibleResults
    if var pagination = response["pagination"] as? [String: Any] {
      pagination["total"] = visibleResults.count
      pagination["returned"] = visibleResults.count
      pagination["hasMore"] = false
      response["pagination"] = pagination
    }
    guard let filteredData = try? JSONSerialization.data(withJSONObject: response),
          let filteredOutput = String(data: filteredData, encoding: .utf8) else { return nil }
    return filteredOutput
  }

  static func setEnabled(_ enabled: Bool) throws {
    guard let defaults = UserDefaults(suiteName: "group.com.vidkar") else {
      throw NSError(domain: "VIDKAR.IOSCourseVisibility", code: 1)
    }
    defaults.set(enabled, forKey: defaultsKey)
  }
}
