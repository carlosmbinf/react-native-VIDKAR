import assert from "node:assert/strict";
import test from "node:test";

import { loginHarness } from "./helpers/loginHarness.js";

function nodes(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, predicate));
  if (!node || typeof node !== "object") return [];
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}

test("Meteor se ejecuta una vez y la sesión confirmada avanza antes del registro push", async () => {
  let respond;
  let finishPush;
  const events = [];
  const state = {
    loginWithPassword(_username, _password, callback) {
      events.push("request");
      respond = callback;
    },
    registerPush: () => new Promise((resolve) => { finishPush = resolve; }),
  };
  const login = loginHarness(state);
  login.render({
    onAuthenticationStart: () => events.push("start"),
    onAuthenticationSettled: (userId) => events.push(userId),
  });
  const first = login.submit();
  await login.submit();
  assert.deepEqual(events, ["start", "request"]);
  state.userId = "vidkar-user";
  respond(null);
  await Promise.resolve();
  assert.deepEqual(events, ["start", "request", "vidkar-user"]);
  finishPush();
  await first;
  login.unmount();
});

test("credenciales rechazadas conservan ambos campos, anuncian el error y permiten reintentar", async () => {
  let requests = 0;
  let feedback = 0;
  const settlements = [];
  const login = loginHarness({
    loginWithPassword(username, password, callback) {
      assert.equal(username, "vidkar");
      assert.equal(password, "test-password");
      requests++;
      callback(new Error("Invalid credentials"));
    },
    rejectMotion: () => { feedback++; },
  });
  const props = { onAuthenticationSettled: (userId) => settlements.push(userId) };
  let tree = login.render(props);
  const inputs = () => nodes(tree, (node) => node.type === "TextInput");
  inputs()[0].props.onChangeText("vidkar");
  inputs()[1].props.onChangeText("test-password");
  tree = login.render(props);
  await login.submit();
  tree = login.render(props);
  assert.deepEqual(inputs().map((input) => input.props.value), ["vidkar", "test-password"]);
  assert.equal(inputs()[1].props.error, true);
  assert.equal(nodes(tree, (node) => node.props.accessibilityRole === "alert").length, 1);
  await login.submit();
  assert.equal(requests, 2);
  assert.equal(feedback, 2);
  assert.deepEqual(settlements, [null, null]);
  login.unmount();
});

test("el formulario horizontal conserva accesos sociales y acerca los campos al abrir el teclado", async () => {
  const login = loginHarness({ socialEnabled: true, platform: "ios", dimensions: { width: 844, height: 390 } });
  login.render();
  await new Promise((resolve) => setImmediate(resolve));
  let tree = login.render();
  const labels = () => nodes(tree, (node) => node.type === "Button").map((node) => node.props.children.join(""));
  const scroll = nodes(tree, (node) => node.type === "ScrollView")[0];
  const username = nodes(tree, (node) => node.props.label === "Usuario")[0];
  const wrapper = nodes(tree, (node) => node.props.ref && node.props.children.includes(username))[0];
  const [credentials] = nodes(tree, (node) => node.type === "View" && node.props.ref && node !== wrapper);
  const offsets = [];
  scroll.props.ref.current = {
    measureInWindow: (callback) => callback(0, 0, 390, 240),
    scrollTo: ({ y }) => offsets.push(y),
  };
  credentials.props.ref.current = { measureInWindow: (callback) => callback(0, 200, 320, 180) };
  wrapper.props.ref.current = { measureInWindow: (callback) => callback(0, 200, 320, 52) };
  username.props.onFocus();
  login.keyboard("keyboardWillShow");
  assert.equal(offsets.at(-1), 148);
  tree = login.render();
  for (const label of ["Iniciar sesión", "Entrar con Google", "Entrar con Apple", "Ocultar teclado"]) {
    assert.ok(labels().includes(label), label);
  }
  login.unmount();
});
