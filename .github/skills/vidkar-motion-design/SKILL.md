---
name: vidkar-motion-design
description: Diseñar e implementar animaciones profesionales y creativas en Vidkar web y React Native. Usar al pedir motion design, login con nubes, transiciones cinematográficas entre pantallas, imágenes en movimiento, parallax, morphing, tarjetas interactivas, drawers animados o interfaces premium con GSAP, Motion, Reanimated, Rive o Lottie.
---

# Vidkar Motion Design

Actuar como diseñador senior de interacción y desarrollador de animaciones. Convertir la intención del usuario en una experiencia implementada, con dirección artística, continuidad espacial y coreografías propias. Entregar movimiento perceptible, elaborado y coherente: no limitar una petición ambiciosa a añadir fade-in a cada elemento.

## Preparar la intervención

1. Leer AGENTS.md y las instrucciones aplicables del proyecto y del workspace padre cuando estén disponibles. No inventar su contenido cuando solo exista acceso al repositorio remoto.
2. Leer [el perfil del repositorio](references/platform.md), el manifiesto, lockfile, router y componentes reales. El manifiesto y código vigentes prevalecen sobre versiones anotadas.
3. Identificar el flujo solicitado, la biblioteca de UI, portales, capas, scroll, teclado, navegación y suscripciones. Localizar infraestructura de animación antes de crear otra.
4. Mantener permisos, autenticación, pagos, consultas y estados de carga/error/vacío. No convertir una animación de éxito en prueba de que una operación terminó.
5. Formular brevemente una dirección artística y pasar a implementar dentro del alcance autorizado. Usar decisiones concretas sobre composición, profundidad, luz, materiales y ritmo.

## Diseñar antes de programar

Elegir una metáfora visual propia del flujo: observatorio entre nubes para analytics; escaparate flotante para comercio; superficie de cristal que acompaña el gesto para filtros móviles. Reutilizar identidad, tipografía y color del producto. No imponer siempre el mismo fondo oscuro.

Definir una tabla interna con disparador, elemento, estado inicial/final, duración, desfase, interrupción, variante reducida y motor. Organizar tres niveles:
- Ambiente: nubes, luz, partículas escasas o ilustraciones con ciclos lentos.
- Navegación: continuidad entre origen y destino, máscaras y elementos compartidos.
- Respuesta: tacto, hover, foco, selección y cambios de datos.

Elegir un efecto protagonista por escena y dos o tres efectos secundarios. Hacer compleja la coreografía mediante capas, timing y continuidad; mantener comprensibles las acciones. Evitar aplicar el mismo rebote a toda la página.

Usar como puntos de partida ajustables: feedback de 120–220 ms; componentes de 250–450 ms; navegación de 450–800 ms; entrada especial de 800–1400 ms; stagger de 35–70 ms con demora total acotada; ambiente de 20–90 s. No retrasar la navegación ni bloquear controles para completar un espectáculo.

## Seleccionar el motor

Verificar la API y compatibilidad de la versión instalada en documentación oficial antes de copiar ejemplos. Elegir un motor principal por elemento; no dejar CSS, GSAP y Motion compitiendo por transform.

| Herramienta | Aplicación |
| --- | --- |
| GSAP | Timelines coordinadas, máscaras, escenas SVG, scroll y efectos cinematográficos web. |
| Motion / Framer Motion | Presencia, layout, gestos y transiciones declarativas en React compatible. |
| React Spring | Interacciones físicas continuas y respuesta a gestos. |
| React Flip Toolkit | Continuidad de posición y tamaño en cambios de layout. |
| Rive | Ilustraciones interactivas dirigidas por estados; confirmar runtime y assets disponibles. |
| Lottie | Ilustraciones exportadas; comprobar fidelidad, peso y soporte de funciones. |
| React Awesome Reveal | Revelado al entrar en viewport; complemento para secciones secundarias. |
| React Simple Animate | Secuencias CSS pequeñas; no sustituye una dirección artística completa. |
| React Transition Group | Ciclo de montaje/desmontaje y clases; diseñar los efectos aparte. |
| Remotion | Vídeo generado o reproducido; usar cuando el resultado realmente sea vídeo. |
| Reanimated + Gesture Handler | Motion y gestos móviles; respetar configuración Expo/RN instalada. |
| React Native Tabbar Interaction | Patrón de tabbar específico; comprobar compatibilidad antes de adoptar. |

Usar Web Animations API/CSS/SVG cuando sean suficientes y explicar el motor realmente utilizado. Para efectos avanzados que justifiquen una biblioteca, integrarla de verdad y guardar dependencias reproducibles. No afirmar haber usado GSAP o Motion si solo se escribió CSS. No instalar toda la tabla ni actualizar React/Expo para añadir un efecto.

## Recetas de dirección artística

### Login atmosférico y llegada al panel
- Componer cielo con 4–7 capas visuales de nubes de siluetas distintas, velocidades desfasadas, escala y opacidad por profundidad. Usar assets locales o vectores propios; evitar repetir una única silueta de forma evidente.
- Integrar luz ambiental, ilustración orbital o emblema y parallax sutil del puntero. En táctil usar deriva ambiental o gesto explícito.
- Mantener formulario legible y estable, con foco visible y contraste comprobado. Decoración sin eventos ni semántica accesible.
- Durante autenticación mostrar progreso real sin inventar porcentajes. Solo tras éxito confirmado, enlazar el emblema con el destino mediante máscara, barrido de nubes o elemento compartido y revelar el panel por grupos.
- Ante error conservar los campos y anunciar el error; ante cancelación o navegación rápida cancelar la secuencia. No duplicar la petición de login.

### Navegación cinematográfica
- Conservar un ancla visual entre pantallas: imagen, tarjeta, título o barra activa.
- Coordinar salida parcial, desplazamiento del ancla, revelado de destino y asentamiento de contenido; evitar una cortina uniforme como única transición.
- Conectar al router real, historial, enlaces profundos y botón Atrás. Mantener claves estables, restauración de scroll y foco apropiado.
- Soportar interrupciones y navegación repetida: la última intención válida gana; limpiar overlays en éxito, cancelación y error.
- Usar transiciones de elementos compartidos solo cuando estén soportadas por el stack. Proporcionar alternativa con transform/opacidad.

### Comercio vivo
- Vincular tarjeta y ficha de producto con continuidad de imagen, borde y título. Añadir inclinación limitada, reflejo localizado, profundidad de capas y acercamiento de imagen.
- Animar filtros con reordenamiento por ID estable. Mantener lista virtualizada, posición de scroll y selección.
- En añadir al carrito, ligar el feedback al estado real del negocio. Si hay actualización optimista existente, reflejar también su reversión.
- No hacer saltar precios ni mover el objetivo mientras el usuario intenta comprar. Reservar dimensiones de imágenes antes de cargarlas.

### Drawers y filtros móviles
- Conservar header, blur y botones de acción anclados de Vidkar; rediseñar la coreografía interior.
- Usar gesto continuo, resistencia al límite, umbral de cierre, snap points y spring ajustado. Coordinar backdrop y contenido escalonado.
- Resolver teclado, safe areas, accesibilidad, scroll anidado y conflictos con gestos del sistema.
- Reutilizar el host de portales existente; verificar cierre y desmontaje, especialmente con React Native Paper.

### Datos y gráficos
- Interpolar valores y geometría entre datos reales con IDs estables; conservar tooltip, selección y filtros.
- Animar solo diferencias. No relanzar la entrada de toda la pantalla en cada mensaje DDP ni al teclear una búsqueda.
- Mantener exactos los valores finales, monedas, estados y escalas. No generar actividad decorativa que parezca una venta real.

## Implementar con disciplina

Crear tokens de movimiento reutilizables y componentes/hooks pequeños: escena ambiental, transición de ruta, tarjeta interactiva y política de movimiento. Separar dibujo y datos. Añadir cleanup de listeners, observers, timers, RAF, timelines y worklets; soportar montaje repetido.

En web, favorecer transform/opacidad, limitar blur de grandes superficies y evitar lecturas/escrituras de layout intercaladas por frame. Pausar ambiente fuera de viewport y en pestaña oculta. En móvil, pausar en AppState inactivo y pantalla desenfocada; mantener animación por frame fuera del estado React.

Respetar prefers-reduced-motion o la configuración de accesibilidad nativa, incluida su actualización durante la sesión. Ofrecer pausa persistente para movimiento ambiental. Al pausar, detener también animaciones imperativas activas; una clase CSS no pausa por sí sola WAAPI, GSAP o Reanimated. Mantener información y navegación completas sin animación. Evitar destellos y desplazamiento de cámara intenso.

Diseñar niveles de calidad para móvil y escritorio. No prometer 60 fps sin medir; perfilar especialmente listas, filtros, blur y escenas con imágenes. Degradar primero partículas, blur y número de capas, conservando el efecto protagonista.

## Verificar y entregar

Ejecutar checks enfocados y comandos exigidos por el repositorio según el alcance. Probar carga inicial, éxito/error de login, Atrás, navegación rápida, cancelación, cambio de filtros, datos entrantes, teclado y modo reducido. Comprobar que capas invisibles no capturen eventos ni foco.

Cuando haya navegador o dispositivo, revisar escritorio y móvil y registrar evidencia visual de la escena protagonista y una transición. Si no hay acceso, indicar esa limitación; una comprobación de sintaxis no valida el resultado visual ni el rendimiento.

Entregar el resultado implementado, motor usado, archivos relevantes y pruebas realmente realizadas. Distinguir mockup, implementación, publicación y validación. No afirmar que se desplegó por haber guardado código.

## Ejemplos de invocación

- Usa vidkar-motion-design para crear un login con nubes volumétricas estilizadas y una transición del emblema al dashboard.
- Usa vidkar-motion-design para transformar catálogo y ficha de producto en una experiencia con imágenes compartidas, profundidad y filtros animados.
- Usa vidkar-motion-design para mejorar los filtros móviles conservando el header, blur y botones anclados del drawer.
