# Apple Watch en VIDKAR

Esta carpeta es la fuente de verdad del target watchOS. No se edita `ios/` a mano: el config plugin `plugins/with-vidkar-watch-app.js` copia y enlaza este codigo durante `npx expo prebuild` o durante un build EAS con prebuild limpio.

La primera version es intencionalmente minima: una app SwiftUI independiente con una pantalla `Hola mundo` para validar que el target de Apple Watch se genera, firma y empaqueta junto a la app iOS.
