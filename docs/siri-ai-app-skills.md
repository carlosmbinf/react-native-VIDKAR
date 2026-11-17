# App Skill de catálogo para Siri AI Developer Preview

La guía fuente `plugins/resources/vidkar-app-intents/Skills.skillsbundle/Skills/vidkar-catalogo/SKILL.md` complementa el tool intent de catálogo existente. Propone búsquedas alternativas y respuestas basadas en los resultados, sin navegación ni compras. Es una guía probabilística: el backend y los intents siguen siendo responsables de permisos y comportamiento.

## Pendiente de integración en el build

Este recurso todavía **no está registrado en el target iOS**. La documentación de Apple exige un único `Skills.skillsbundle` en Copy Bundle Resources y que Xcode lo compile. En Xcode 27.3, crear el recurso mediante File > New > File > Skills Bundle en el target Vidkar y verificar la representación generada en el proyecto antes de automatizarla en `with-vidkar-app-intents.js`. No incorporar el directorio como carpeta genérica: se debe comprobar que Xcode lo valida y compila como App Skills.

Probar en iPhone compatible con un build firmado de desarrollo o TestFlight interno; la vista previa no funciona en TestFlight externo ni App Store. Abrir la app una vez, colocarla en segundo plano e incluir VIDKAR en la primera solicitud. Probar «busca un mando de PS5 en VIDKAR», «compara los precios», una búsqueda sin resultados y un error de red. Usar Siri Integration Advisor y Siri Evaluations para medir selección y resultados. La documentación no garantiza que Siri seleccione la skill ni muestre siempre todas las tarjetas.

El proyecto actual expone solo un tool intent para Siri AI Preview: buscar productos. Añadir un tool intent hace que App Shortcuts no estén disponibles para Siri en ese build, aunque siguen disponibles en otras superficies. No asumir que los demás atajos de VIDKAR están cubiertos por esta prueba.

Fuentes: [App Skills](https://developer.apple.com/documentation/appintents/orchestrating-complex-actions-with-app-skills), [Siri AI Developer Preview](https://developer.apple.com/documentation/appintents/siri-ai-developer-preview), [acciones y contenido personalizados](https://developer.apple.com/documentation/appintents/bringing-custom-actions-and-content-to-siri).
