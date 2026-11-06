/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("el cohete mantiene el mismo contenedor sin remounts ni Layout Animations durante el despegue", () => {
  const flight = source("components/loguin/LoginRocketFlight.native.jsx");

  assert.match(flight, /LOGIN_ROCKET_LAUNCH_DURATION_MS = 740/);
  assert.match(flight, /LOGIN_ROCKET_REDUCED_DURATION_MS = 180/);
  assert.match(flight, /withSequence/);
  assert.match(flight, /withTiming/);
  assert.match(flight, /ReduceMotion\.Never/);
  assert.match(flight, /showRocket \|\| isLaunching/);
  assert.doesNotMatch(
    flight,
    /if \(!isLaunching\)\s*\{\s*return <View|entering=\{launchAnimation\}|Keyframe/,
  );
});

test("el vuelo tiene anticipación, aceleración y salida fuera de pantalla", () => {
  const flight = source("components/loguin/LoginRocketFlight.native.jsx");

  assert.match(flight, /LOGIN_ROCKET_LAUNCH_DURATION_MS \* 0\.18/);
  assert.match(flight, /LOGIN_ROCKET_LAUNCH_DURATION_MS \* 0\.52/);
  assert.match(flight, /withTiming\(-4,/);
  assert.match(flight, /withTiming\(width \* 0\.12,/);
  assert.match(flight, /withTiming\(width \* 0\.42,/);
  assert.match(flight, /withTiming\(-height \* 0\.38,/);
  assert.match(flight, /withTiming\(-height \* 1\.25,/);
});

test("la raíz mantiene el login durante el vuelo y anima la llegada por rol", () => {
  const index = source("app/index.native.tsx");

  assert.match(index, /loginFlightCompletedFor !== userId/);
  assert.match(index, /if \(!userId \|\| startingLoginTransition\)/);
  assert.match(index, /onLaunchComplete=\{handleLoginLaunchComplete\}/);
  assert.doesNotMatch(index, /loginLaunchTimerRef|loginLaunchActive/);
  assert.equal((index.match(/<LoginArrivalScene/g) || []).length, 3);
  assert.match(index, /enabled=\{loginArrivalPending\}/);
});

test("la llegada usa valores compartidos sin Layout Animations y respeta movimiento reducido", () => {
  const arrival = source("components/loguin/LoginArrivalScene.native.jsx");

  assert.match(arrival, /duration: reducedMotion \? 160 : 320/);
  assert.match(arrival, /ReduceMotion\.Never/);
  assert.match(arrival, /useAnimatedStyle/);
  assert.doesNotMatch(arrival, /entering=\{/);
});

test("el login nativo conserva acceso, desplazamiento y fondo animado sin textos promocionales", () => {
  const login = source("components/loguin/Loguin.native.js");

  assert.match(login, /<LoginAtmosphere enabled=\{isFocused && !effectiveIsLaunching\}/);
  assert.match(login, /showRocket/);
  assert.match(login, /redirectFlightCompleted/);
  assert.match(login, /onLaunchComplete=\{handleLaunchComplete\}/);
  assert.match(login, /const hideEvent = "keyboardDidHide"/);
  assert.doesNotMatch(login, /redirectFlightTimerRef|LOGIN_ROCKET_LAUNCH_DURATION_MS/);
  assert.match(login, /useSystemReducedMotion/);
  assert.match(login, /<KeyboardAvoidingView/);
  assert.match(login, /<ScrollView/);
  assert.match(login, /revealCredentials/);
  assert.match(login, /scrollEnabled=\{!effectiveIsLaunching\}/);
  assert.match(login, /Ocultar teclado/);
  assert.doesNotMatch(login, /brandDescription|brandHighlights|Cubacel y promos|Proxy, VPN y más|Pedidos y remesas/);
  assert.doesNotMatch(login, /formMetaRow|Operación centralizada|Gestiona lo que vendes/);
  assert.match(login, /label="Usuario"/);
  assert.match(login, /label="Contraseña"/);
  assert.match(login, /Iniciar sesión/);
  assert.match(login, /Política de privacidad/);
});

test("la atmósfera móvil replica las capas de nubes y respeta movimiento reducido", () => {
  const atmosphere = source("components/loguin/LoginAtmosphere.native.jsx");

  assert.match(atmosphere, /duration=\{36000\}/);
  assert.match(atmosphere, /duration=\{25000\}/);
  assert.match(atmosphere, /duration=\{17000\}/);
  assert.match(atmosphere, /if \(!enabled \|\| reducedMotion\)/);
  assert.match(atmosphere, /cancelAnimation\(progress\)/);
});
