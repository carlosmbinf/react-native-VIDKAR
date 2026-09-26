import Foundation

// Bundle compilado por xcstringstool, no lectura del catálogo fuente ni fallback.
let bundleURL = URL(fileURLWithPath: CommandLine.arguments[1])
let spanish = Locale(identifier: "es")
let title = LocalizedStringResource("Consulta MCP", defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
let parameter = LocalizedStringResource("Servicio", defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
let userTitle = LocalizedStringResource("Busca usuario por username", defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
let usernameParameter = LocalizedStringResource("Nombre de usuario", defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
let dialog = LocalizedStringResource("Consulta confirmada. %@.", defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
precondition(String(localized: title) == "Consulta MCP")
precondition(String(localized: parameter) == "Servicio")
precondition(String(localized: userTitle) == "Busca usuario por username")
precondition(String(localized: usernameParameter) == "Nombre de usuario")
precondition(String(localized: dialog) == "Consulta confirmada. %@.")
for key in ["Consulta el catálogo", "Qué quieres consultar", "Coincidencia del catálogo",
	"Busca usuario por username", "Nombre de usuario", "Busca el usuario %@ en VIDKAR",
	"Nombre y apellido", "Username", "@%@", "Usuario VIDKAR",
	"¿Quieres buscar el username dentro de tu alcance autorizado de VIDKAR?",
	"No encontré el username dentro de tu alcance autorizado de VIDKAR.",
	"Encontré más de un usuario con ese username. No seleccioné ninguno.",
	"Encontré una coincidencia. ¿Quieres consultar su perfil completo autorizado y abrirlo en VIDKAR?",
	"Encontré el usuario en VIDKAR. Abre la app para ver su perfil completo.",
	"Encontré el usuario %@ en VIDKAR.",
	"Indica qué quieres consultar: de 1 a 120 caracteres, sin caracteres de control.",
	"La sesión MCP no es válida. Revisa tu sesión y token en VIDKAR.",
	"Esta consulta requiere confirmación explícita en VIDKAR.",
	"El servidor MCP no admite esta consulta. Actualiza el servidor o consulta desde VIDKAR.",
	"No se pudo conectar con VIDKAR. Comprueba la conexión e inténtalo de nuevo.",
	"Encontré una coincidencia en VIDKAR. %@", "Coincidencias devueltas por VIDKAR: %lld. %@"] as [StaticString] {
	let text = LocalizedStringResource(key, defaultValue: "MISSING_TRANSLATION", locale: spanish, bundle: .atURL(bundleURL))
	precondition(String(localized: text) == String(describing: key))
}
let phrases = Bundle(url: bundleURL)!.url(forResource: "AppShortcuts", withExtension: "strings", subdirectory: nil, localization: "es")!
let values = try PropertyListSerialization.propertyList(from: Data(contentsOf: phrases), format: nil) as! [String: String]
precondition(values.count == 1 && values["Busca un usuario en ${applicationName}"] == "Busca un usuario en ${applicationName}")
print("Foundation nativo: títulos, parámetros y diálogos resueltos en español desde bundle compilado, sin fallback; placeholders intactos")