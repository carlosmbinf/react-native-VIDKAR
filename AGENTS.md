# Codex: aplicación mobile VIDKAR

Lee `../AGENTS.md` y `../.github/copilot-instructions.md` antes de trabajar. Aplica `../.github/instructions/mobile.instructions.md` y, al tocar pruebas, `../.github/instructions/testing.instructions.md`.

- Para cursos, lecciones o reproducción educativa, lee `../.github/memory/courses.md`.
- Para cambios de contratos Meteor, permisos o negocio, lee `../.github/memory/architecture.md` y `../.github/memory/business-rules.md`, y localiza consumidores web/backend.
- Para targets o capacidades iOS, consulta `../.github/memory/ios-signing-targets.md`; para overlays, `../.github/memory/mobile-overlays.md`.
- Las instrucciones Copilot locales de este proyecto son históricas; prevalecen las centrales y el código vigente.

Verifica el manifiesto antes de cambios de plataforma: actualmente declara Expo 57 y React Native 0.86, mientras la regla mobile central todavía describe Expo 54 y React Native 0.81. Conserva Expo Router, los módulos/config plugins reproducibles y los contratos compartidos. Ejecuta `npm run lint` y el chequeo más estrecho disponible; no edites código nativo generado como fuente principal.
