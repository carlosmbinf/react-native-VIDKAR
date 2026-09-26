import Foundation

// Bundle compilado por xcstringstool, no lectura del catálogo fuente ni fallback.
let bundleURL = URL(fileURLWithPath: CommandLine.arguments[1])
let spanish = Locale(identifier: "es")
let title = LocalizedStringResource("Consulta MCP", defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
let parameter = LocalizedStringResource("Servicio", defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
let dialog = LocalizedStringResource("Consulta confirmada. %@.", defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
precondition(String(localized: title) == "Consulta MCP")
precondition(String(localized: parameter) == "Servicio")
precondition(String(localized: dialog) == "Consulta confirmada. %@.")
let phrases = Bundle(url: bundleURL)!.url(forResource: "AppShortcuts", withExtension: "strings", subdirectory: nil, localization: "es")!
let values = try PropertyListSerialization.propertyList(from: Data(contentsOf: phrases), format: nil) as! [String: String]
precondition(values["Consulta mi ${service} en ${applicationName}"] == "Consulta mi ${service} en ${applicationName}")
print("Foundation nativo: títulos, parámetros y diálogos resueltos en español desde bundle compilado, sin fallback; placeholders intactos")