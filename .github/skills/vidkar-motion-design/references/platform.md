# Perfil: react-native-VIDKAR

Manifiesto revisado el 2026-11-03: Expo 57, React Native 0.86.3, React 19.2.3, Expo Router, Reanimated 4.5.1, react-native-worklets 0.10.1, Gesture Handler 2.32, React Native SVG, expo-blur y React Native Paper. Confirmar manifiesto/lockfile: instrucciones históricas pueden describir otro Expo.

Usar Reanimated y Gesture Handler existentes como base, con shared values y estilos animados. No instalar GSAP DOM o Motion web para animar Views nativas. Consultar compatibilidad de worklets y Expo antes de tocar Babel o configuración; no copiar configuración de Reanimated 2/3 sin verificar.

Conservar Expo Router, módulos y config plugins reproducibles. No editar código nativo generado como fuente principal. Integrar transición con stack, back gesture, AppState y foco. Preferir alternativa soportada a shared-element experimental. No añadir Skia, Lottie o Rive nativo salvo que el efecto requiera esa capacidad y se compruebe compatibilidad.

Para filtros conservar header, blur, safe areas y acciones inferiores ancladas. Revisar portales Paper, cierre de drawer, teclado, scroll y cancelación de gesto. Pausar ciclos al perder foco o pasar a background; aplicar accesibilidad de movimiento reducido también a animaciones ya iniciadas.

Leer AGENTS.md y las reglas mobile/overlays centrales cuando estén disponibles. Para cambios de aplicación ejecutar npm run lint y checks enfocados; comprobar iOS y Android cuando exista dispositivo/simulador, declarando lo no verificado.

Consultar https://docs.swmansion.com/react-native-reanimated/ y https://docs.swmansion.com/react-native-gesture-handler/ para APIs y compatibilidad.
