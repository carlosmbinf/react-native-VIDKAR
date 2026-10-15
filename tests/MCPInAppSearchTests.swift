import Foundation

@main
struct MCPInAppSearchTests {
  static func main() throws {
    for term in ["Terminator", "cursos", "Carlos", "fotografía", "C++ & Swift? #1", "", "  dos palabras  ", "búscame los cursos"] {
      let url = try MCPInAppSearch.url(term: term)
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
      precondition(components.scheme == "https" && components.host == "www.vidkar.com" && components.path == "/search")
      precondition(components.queryItems == [URLQueryItem(name: "q", value: term.trimmingCharacters(in: .whitespacesAndNewlines)), URLQueryItem(name: "entity", value: "all")])
      precondition(components.user == nil && components.password == nil && components.fragment == nil)
      precondition(!url.absoluteString.contains("+"))
    }
    _ = try MCPInAppSearch.url(term: String(repeating: "a", count: 120))
    for term in [String(repeating: "a", count: 121), String(repeating: "😀", count: 61), "a\u{0}b", "a\nb"] {
      do {
        _ = try MCPInAppSearch.url(term: term)
        preconditionFailure("Debe rechazar criterios inválidos")
      } catch MCPInAppSearch.InvalidCriteria.invalidTerm { }
    }
    let delivery = MCPInAppSearchDelivery()
    let firstURL = try MCPInAppSearch.url(term: "C++ & Swift")
    delivery.enqueue(firstURL)
    let first = delivery.getPending()!
    precondition(first["url"] == firstURL.absoluteString)
    precondition(delivery.getPending() == first, "Leer no debe perder el destino antes de navegar")
    var notifications = 0
    delivery.setListener { notifications += 1 }
    let secondURL = try MCPInAppSearch.url(term: "otra búsqueda")
    delivery.enqueue(secondURL)
    precondition(notifications == 1)
    delivery.acknowledge(first["id"]!)
    let second = delivery.getPending()!
    precondition(second["url"] == secondURL.absoluteString, "Una confirmación vieja no borra la búsqueda nueva")
    delivery.acknowledge(second["id"]!)
    precondition(delivery.getPending() == nil)
    delivery.setListener(nil)
    delivery.enqueue(firstURL)
    precondition(notifications == 1 && delivery.getPending() != nil)
    print("Criterios literales, Universal Link https y límites UTF-16: OK")
  }
}