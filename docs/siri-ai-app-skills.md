# App Skill de catálogo para Siri AI Developer Preview

La guía fuente `plugins/resources/vidkar-app-intents/Skills.skillsbundle/Skills/vidkar-catalogo/SKILL.md` complementa el tool intent de catálogo existente. Propone búsquedas alternativas y respuestas basadas en los resultados, sin navegación ni compras. Es una guía probabilística: el backend y los intents siguen siendo responsables de permisos y comportamiento.

## Integración en el build

El plugin `with-vidkar-app-intents.js` copia el recurso y lo registra en Copy Bundle Resources del target Vidkar como `wrapper.skillsbundle` cuando se activa `VIDKAR_SIRI_AI_PREVIEW`. Al desactivar la vista previa retira el recurso generado y su referencia. El workflow `expo_ios_internal` valida que `Metadata.appintents/Skills.skillsc` exista en el archive y en la IPA; el workflow de publicación normal deja desactivada la vista previa. Es necesaria una compilación real en Xcode 27.3 para confirmar la integración completa.

Probar en iPhone compatible con un build firmado de desarrollo o TestFlight interno; la vista previa no funciona en TestFlight externo ni App Store. Abrir la app una vez, colocarla en segundo plano e incluir VIDKAR en la primera solicitud. Probar «busca un mando de PS5 en VIDKAR», «compara los precios», una búsqueda sin resultados y un error de red. Usar Siri Integration Advisor y Siri Evaluations para medir selección y resultados. La documentación no garantiza que Siri seleccione la skill ni muestre siempre todas las tarjetas.

El proyecto actual expone solo un tool intent para Siri AI Preview: buscar productos. Añadir un tool intent hace que App Shortcuts no estén disponibles para Siri en ese build, aunque siguen disponibles en otras superficies. No asumir que los demás atajos de VIDKAR están cubiertos por esta prueba.

Fuentes: [App Skills](https://developer.apple.com/documentation/appintents/orchestrating-complex-actions-with-app-skills), [Siri AI Developer Preview](https://developer.apple.com/documentation/appintents/siri-ai-developer-preview), [acciones y contenido personalizados](https://developer.apple.com/documentation/appintents/bringing-custom-actions-and-content-to-siri).
