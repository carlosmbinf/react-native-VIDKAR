# Consultas de VIDKAR en Siri AI

Siri recibe una sola entidad con una `CardSnippet` por consulta. La tarjeta de Comercio muestra hasta cinco productos, con precio y moneda, tienda, descripción e imagen cuando está disponible. Las consultas de cuenta usan autenticación local del iPhone y los permisos del token MCP. Los diálogos de respaldo para datos privados omiten su contenido.

| Consulta | Ejemplo |
| --- | --- |
| Comercio | «Busca mandos de PS5 en VIDKAR» |
| Películas, series, capítulos, cursos, lecciones y recargas | «¿Qué cursos hay en VIDKAR?» |
| Perfil propio o usuario autorizado | «Busca a @usuario en VIDKAR» |
| Consumo actual, límites y estado de Proxy y VPN | «¿Cuánto ha consumido @usuario en VIDKAR?» |
| Compras, órdenes y ventas asociadas | «Muéstrame mis compras del mes pasado en VIDKAR» |
| Mensajes y suscripciones propios | «Muéstrame mis suscripciones de VIDKAR» |
| Ventas, pagos, costos y rentabilidad del negocio | «¿Cómo van las ventas este mes en VIDKAR?» |

El recurso `Skills.skillsbundle` orienta a Siri en consultas de varios pasos, como resolver un usuario y continuar con su consumo. El plugin de Expo lo incorpora al target Vidkar cuando se activa `VIDKAR_SIRI_AI_PREVIEW`. El workflow `expo_ios_internal` usa Xcode 27.3 y verifica en el archive y en la IPA la presencia de los intents y el recurso `Skills.skillsc`. La vista previa se prueba en desarrollo o TestFlight interno y requiere un iPhone compatible con Siri AI.

En el iPhone, inicia sesión y verifica la configuración de MCP. Coloca VIDKAR en segundo plano y nómbralo en la primera solicitud. Prueba también «¿y el consumo de VPN?» tras elegir un usuario, las coincidencias múltiples, una cuenta fuera de alcance, un catálogo vacío y un error de red. Comprueba que la app siga en segundo plano y que en la conversación aparezca la tarjeta. Siri controla cuándo presenta la tarjeta y puede usar el diálogo como respaldo.

- [Siri AI Developer Preview](https://developer.apple.com/documentation/appintents/siri-ai-developer-preview)
- [CardSnippet](https://developer.apple.com/documentation/appintents/cardsnippet)
- [App Skills](https://developer.apple.com/documentation/appintents/orchestrating-complex-actions-with-app-skills)
