import Foundation

@main
struct MCPQueryPolicyTests {
  static func main() throws {
    let schema: [String: Any] = [
      "type": "object", "required": ["entity"], "additionalProperties": false,
      "properties": [
        "entity": ["type": "string", "enum": ["all", "course", "user"]],
        "query": ["type": "string", "maxLength": 120],
        "limit": ["type": "integer", "minimum": 1, "maximum": 50],
        "userId": ["type": "string", "minLength": 1],
        "confirmed": ["type": "boolean"],
      ],
    ]
    var checks = 0
    func expect(_ condition: Bool) { precondition(condition); checks += 1 }
    func rejects(line: UInt = #line, _ operation: () throws -> Void) {
      do { try operation(); preconditionFailure("Se aceptó una operación inválida en la línea \(line)") }
      catch { checks += 1 }
    }
    let safe = try MCPQueryPolicy.arguments(json: #"{"entity":"course","limit":10,"confirmed":true}"#, schema: schema, ownerId: "fixture-owner")
    expect(safe["confirmed"] == nil)
    expect(safe["entity"] as? String == "course")
    let own = try MCPQueryPolicy.arguments(json: #"{"entity":"user","userId":"$currentUser"}"#, schema: schema, ownerId: "fixture-owner")
    expect(own["userId"] as? String == "fixture-owner")
    for json in ["[]", "null", "{invalid", "{}", #"{"entity":"unknown"}"#, #"{"entity":"course","limit":true}"#, #"{"entity":"course","limit":"10"}"#, #"{"entity":"course","limit":1.5}"#, #"{"entity":"course","limit":51}"#, #"{"entity":"course","token":"injected"}"#, #"{"entity":"course","query":null}"#] {
      rejects { _ = try MCPQueryPolicy.arguments(json: json, schema: schema, ownerId: "fixture-owner") }
    }
    rejects { try MCPQueryPolicy.validate(1, schema: ["type": "boolean"]) }
    rejects { try MCPQueryPolicy.validate("x", schema: ["type": "string", "$ref": "remote-schema"]) }
    rejects { try MCPQueryPolicy.validate("invalid-date", schema: ["type": "string", "format": "date-time"]) }
    try MCPQueryPolicy.validate("2026-09-25T12:00:00Z", schema: ["type": "string", "format": "date-time"])
    checks += 1
    let catalog = #"[{"name":"new_read_tool","readOnly":true,"annotations":{"readOnlyHint":true}},{"name":"write_tool","readOnly":false,"annotations":{"readOnlyHint":false}},{"name":"unclassified","readOnly":true}]"#
    let tools = try MCPQueryPolicy.readOnlyTools(catalog: catalog)
    expect(tools.count == 1 && tools[0]["name"] as? String == "new_read_tool")
    rejects { _ = try MCPQueryPolicy.summary(output: #"{"success":false,"error":{"message":"denied"}}"#) }
    expect(try MCPQueryPolicy.summary(output: #"{"success":true,"results":[]}"#).contains("No encontré"))
    expect(try MCPQueryPolicy.summary(output: #"{"success":true,"results":[{"title":"Terminator"}]}"#).contains("Terminator"))

    var store = MCPQueryResultStore()
    let revision = UUID()
    let now = Date(timeIntervalSince1970: 1_000)
    let id = try store.save("fixture-result", ownerId: "fixture-owner", revision: revision, now: now)
    expect(try store.read(id, ownerId: "fixture-owner", revision: revision, now: now) == "fixture-result")
    expect(try store.read(id, ownerId: "fixture-owner", revision: revision, now: now.addingTimeInterval(119)) == "fixture-result")
    rejects { _ = try store.read(id, ownerId: "other-owner", revision: revision, now: now) }
    rejects { _ = try store.read(id, ownerId: "fixture-owner", revision: UUID(), now: now) }
    rejects { _ = try store.read(id, ownerId: "fixture-owner", revision: revision, now: now.addingTimeInterval(120)) }
    for offset in 1...3 { _ = try store.save("new-result", ownerId: "fixture-owner", revision: revision, now: now.addingTimeInterval(Double(offset))) }
    rejects { _ = try store.read(id, ownerId: "fixture-owner", revision: revision, now: now.addingTimeInterval(4)) }
    rejects { _ = try store.save(String(repeating: "x", count: 200_001), ownerId: "fixture-owner", revision: revision) }
    print("\(checks) comprobaciones de política/sesión aprobadas")
  }
}