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
for key in ["Consulta el catálogo", "Qué quieres consultar", "Coincidencia del catálogo",
	"Indica qué quieres consultar: de 1 a 120 caracteres, sin caracteres de control.",
	"La sesión MCP no es válida. Revisa tu sesión y token en VIDKAR.",
	"No se pudo conectar con VIDKAR. Comprueba la conexión e inténtalo de nuevo.",
	"Encontré una coincidencia en VIDKAR. %@", "Coincidencias devueltas por VIDKAR: %lld. %@"] as [StaticString] {
	let text = LocalizedStringResource(key, defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
	precondition(String(localized: text) == String(describing: key))
}
let phrases = Bundle(url: bundleURL)!.url(forResource: "AppShortcuts", withExtension: "strings", subdirectory: nil, localization: "es")!
let values = try PropertyListSerialization.propertyList(from: Data(contentsOf: phrases), format: nil) as! [String: String]
precondition(values["Consulta mi ${service} en ${applicationName}"] == "Consulta mi ${service} en ${applicationName}")
precondition(values["Consulta el catálogo en ${applicationName}"] == "Consulta el catálogo en ${applicationName}")
print("Foundation nativo: títulos, parámetros y diálogos resueltos en español desde bundle compilado, sin fallback; placeholders intactos")