import Foundation
import FoundationModels

@main
struct MCPNaturalLanguageEvaluation {
  static func main() async throws {
    guard case .available = SystemLanguageModel.default.availability else {
      print("SKIP: modelo local de Apple no disponible")
      return
    }
    let catalog = try String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8)
    let cases: [(String, [String], String?, String?)] = [
      ("Quiero que me busques Terminator en VIDKAR", ["search_entities"], "all", "Terminator"),
      ("Búscame los cursos", ["search_entities"], "course", ""),
      ("Busca cursos de fotografía", ["search_entities"], "course", "fotografía"),
      ("Busca al usuario Carlos", ["search_users", "get_users", "search_entities"], nil, "Carlos"),
      ("¿Cómo está mi VPN?", ["get_service_usage"], nil, nil),
      ("Busca eso", [], nil, nil),
      ("Elimina al usuario Carlos", [], nil, nil),
      ("Dime el horario de la biblioteca de Madrid", ["library_schedule_future_tool"], nil, nil),
    ]
    var failures = 0
    for (query, names, entity, term) in cases {
      var proposed = ""
      do {
        let plan = try await MCPNaturalLanguagePlanner.plan(query: query, catalog: catalog)
        proposed = "\(plan.toolName) \(plan.argumentsJSON)"
        let args = try MCPQueryPolicy.arguments(json: plan.argumentsJSON, schema: plan.schema, ownerId: "fixture-owner")
        let validName = names.contains(plan.toolName)
        let validEntity = entity == nil || args["entity"] as? String == entity
        let actualTerm = args["query"] as? String ?? ""
        let validTerm = term == nil || actualTerm.localizedCaseInsensitiveCompare(term!) == .orderedSame
        let validOwner = plan.toolName != "get_service_usage" || args["userId"] as? String == "fixture-owner"
        let noUnrequestedFilters = ["from", "to", "period", "status", "sort", "id"].allSatisfy { args[$0] == nil }
        let passed = validName && validEntity && validTerm && validOwner && noUnrequestedFilters
        if !passed { failures += 1 }
        print("\(passed ? "PASS" : "FAIL"): \(query) → \(plan.toolName) \(plan.argumentsJSON)")
      } catch {
        let isClarification: Bool
        if case MCPQueryError.clarification = error { isClarification = true } else { isClarification = false }
        let passed = names.isEmpty && isClarification
        if !passed { failures += 1 }
        print("\(passed ? "PASS" : "FAIL"): \(query) → \(error.localizedDescription) \(proposed)")
      }
    }
    print("Evaluación local: \(cases.count - failures)/\(cases.count). No ejecuta herramientas ni valida selección de Siri.")
    if failures > 0 { exit(1) }
  }
}