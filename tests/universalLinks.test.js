import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await fs.readFile(new URL("../services/navigation/universalLinks.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { canConsumeUniversalLink, resolveUniversalLink } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

const RESULT_ID = "7cebedbd-865d-4e3a-9136-08e663bf5f34";

test("resuelve snapshots Siri con UUID sin transportar consulta ni datos", () => {
  for (const resultId of [RESULT_ID, RESULT_ID.toUpperCase()]) {
    assert.deepEqual(resolveUniversalLink(`vidkar://search?resultId=${resultId}`), {
      pathname: "/siri-search",
      params: { resultId },
    });
  }
});
test("rechaza identificadores de snapshot vacíos, malformados o repetidos", () => {
  for (const resultId of ["", "not-a-uuid", "null", "{}", RESULT_ID.replaceAll("-", ""), `${RESULT_ID}0`, `g${RESULT_ID.slice(1)}`, `%20${RESULT_ID}`, `${RESULT_ID}%0A`]) {
    assert.equal(resolveUniversalLink(`vidkar://search?resultId=${resultId}`), null, resultId);
  }
  assert.equal(resolveUniversalLink(`vidkar://search?resultId=${RESULT_ID}&resultId=${RESULT_ID}`), null);
});

test("rechaza snapshots desde web, con rutas, credenciales, puerto o parámetros extra", () => {
  const urls = [
    `https://www.vidkar.com/search?resultId=${RESULT_ID}`,
    `https://vidkar.com/search?resultId=${RESULT_ID}`,
    `https://vidkar.com/cursos?resultId=${RESULT_ID}`,
    `https://untrusted.example/search?resultId=${RESULT_ID}`,
    `http://vidkar.com/search?resultId=${RESULT_ID}`,
    `vidkar://search/?resultId=${RESULT_ID}`,
    `vidkar://search/path?resultId=${RESULT_ID}`,
    `vidkar://search/../?resultId=${RESULT_ID}`,
    `vidkar://user@search?resultId=${RESULT_ID}`,
    `vidkar://user:password@search?resultId=${RESULT_ID}`,
    `vidkar://:password@search?resultId=${RESULT_ID}`,
    `vidkar://@search?resultId=${RESULT_ID}`,
    `vidkar://search:443?resultId=${RESULT_ID}`,
    `vidkar://search:?resultId=${RESULT_ID}`,
    `vidkar://search?resultId=${RESULT_ID}&q=consulta`,
    `vidkar://search?resultId=${RESULT_ID}&entity=user`,
    `vidkar://search?resultId=${RESULT_ID}&play=true`,
    `vidkar://search?resultId=${RESULT_ID}&token=fixture`,
    `vidkar://search?resultId=${RESULT_ID}&data=%7B%7D`,
    `vidkar://search?resultId=${RESULT_ID}&`,
    `vidkar://search?resultId=${RESULT_ID}#fragment`,
    `vidkar://search?resultId=${RESULT_ID}#`,
    `vidkar://movie/movie-1?resultId=${RESULT_ID}`,
  ];
  for (const url of urls) assert.equal(resolveUniversalLink(url), null, url);
});

test("preserva búsquedas antiguas nativas y web, incluido listado de cursos", () => {
  for (const url of ["vidkar://search?q=Avatar&entity=movie", "https://www.vidkar.com/search?q=Avatar&entity=movie"]) {
    assert.deepEqual(resolveUniversalLink(url), {
      pathname: "/siri-search",
      params: { query: "Avatar", entityType: "movie" },
    });
  }
  assert.deepEqual(resolveUniversalLink("vidkar://search?entity=course"), {
    pathname: "/siri-search",
    params: { query: "", entityType: "course" },
  });
  assert.deepEqual(resolveUniversalLink("vidkar://search"), {
    pathname: "/siri-search",
    params: { query: "", entityType: "all" },
  });
});

test("resuelve búsqueda Siri sin abrir playback automáticamente", () => {
  assert.deepEqual(resolveUniversalLink("vidkar://movie/movie-1?q=Avatar"), {
    pathname: "/siri-search",
    params: { query: "Avatar", entityType: "movie", contentId: "movie-1" },
  });
});

test("solo inicia la ruta de película con el indicador de reproducción", () => {
  assert.deepEqual(resolveUniversalLink("vidkar://movie/movie-1?q=Avatar&play=true"), {
    pathname: "/(normal)/PeliculaPlayer",
    params: { id: "movie-1" },
  });
});

test("valida la relación de curso antes de resolver el deep link de una lección", () => {
  assert.equal(resolveUniversalLink("vidkar://lesson/lesson-1"), null);
  assert.deepEqual(resolveUniversalLink("vidkar://lesson/lesson-1?courseId=course-1"), {
    pathname: "/(normal)/CursoDetalle",
    params: { courseId: "course-1" },
  });
  assert.deepEqual(resolveUniversalLink("vidkar://lesson/lesson-1?courseId=course-1&play=true"), {
    pathname: "/(normal)/CursoDetalle",
    params: { courseId: "course-1", lessonId: "lesson-1" },
  });
});

test("rechaza esquemas, hosts y tipos de entidad desconocidos", () => {
  assert.equal(resolveUniversalLink("javascript:alert(1)"), null);
  assert.equal(resolveUniversalLink("vidkar://mcp_access_tokens/secret"), null);
  assert.equal(resolveUniversalLink("https://untrusted.example/movie/1"), null);
});

test("mantiene las rutas históricas de Universal Links", () => {
  assert.deepEqual(resolveUniversalLink("https://www.vidkar.com/cursos/course-1"), {
    pathname: "/(normal)/CursoDetalle",
    params: { courseId: "course-1" },
  });
});

test("resuelve la suscripción hacia el área de compras", () => {
  assert.deepEqual(resolveUniversalLink("vidkar://subscription/course-subscription-1"), {
    pathname: "/(normal)/MisCompras",
    params: { subscriptionId: "course-subscription-1" },
  });
});

test("resuelve el deep link de usuario a una ruta existente con el parámetro esperado", async () => {
  const target = resolveUniversalLink("vidkar://user/user-123");
  const route = await fs.readFile(new URL("../app/(normal)/User.tsx", import.meta.url), "utf8");
  const layout = await fs.readFile(new URL("../app/(normal)/_layout.tsx", import.meta.url), "utf8");
  const appConfig = JSON.parse(await fs.readFile(new URL("../app.json", import.meta.url), "utf8"));

  assert.deepEqual(target, {
    pathname: "/(normal)/User",
    params: { item: "user-123" },
  });
  assert.match(route, /UserDetails/);
  assert.match(layout, /name="User"/);
  assert.equal(appConfig.expo.scheme, "vidkar");
});

test("retiene el destino de usuario hasta que la sesión y las suscripciones estén listas", () => {
  const url = "vidkar://user/user-123";

  assert.equal(canConsumeUniversalLink(url, false, null), false);
  assert.equal(canConsumeUniversalLink(url, true, null), false);
  assert.equal(canConsumeUniversalLink(url, false, "signed-in-user"), false);
  assert.equal(canConsumeUniversalLink(url, true, "signed-in-user"), true);
});

test("OpenURLIntent devuelve el Universal Link asociado para que Expo Router reciba la búsqueda", async () => {
  const url = "https://www.vidkar.com/search?q=pel%C3%ADcula%20Transformer&entity=all";
  const index = await fs.readFile(new URL("../app/index.native.tsx", import.meta.url), "utf8");
  const swift = await fs.readFile(new URL("../modules/vidkar-mcp/ios/VidkarMCPModule.swift", import.meta.url), "utf8");
  const searchURL = await fs.readFile(new URL("../modules/vidkar-mcp/ios/MCPInAppSearch.swift", import.meta.url), "utf8");
  const appConfig = JSON.parse(await fs.readFile(new URL("../app.json", import.meta.url), "utf8"));
  assert.deepEqual(resolveUniversalLink(url), {
    pathname: "/siri-search",
    params: { query: "película Transformer", entityType: "all" },
  });
  assert.match(searchURL, /components\.scheme = "https"[\s\S]*?components\.host = "www\.vidkar\.com"[\s\S]*?components\.path = "\/search"/);
  assert.match(swift, /return \.result\(opensIntent: OpenURLIntent\(url\)\)/);
  assert.doesNotMatch(swift, /MCPInAppSearchHandoff|consumePendingSiriSearchURL/);
  assert.ok(appConfig.expo.ios.associatedDomains.includes("applinks:www.vidkar.com"));
  assert.match(index, /if \(!target \|\| \/\^vidkar:/);
});

test("búsquedas rechazan ámbitos inventados, consentimiento, tools y enlaces ambiguos", () => {
  for (const url of [
    "vidkar://search?q=a&entity=users", "vidkar://search?q=a&entity=unknown",
    "vidkar://search?q=a&confirmed=true", "vidkar://search?q=a&play=true",
    "vidkar://search?q=a&tool=get_users", "vidkar://search?q=a&token=fixture",
    "vidkar://search?q=a&q=b", "vidkar://search?entity=user&entity=all",
    "vidkar://@search?q=a", "vidkar://search:?q=a", "vidkar://search/path?q=a",
    "vidkar://search?q=a#", "vidkar://search?q=a%00b", `vidkar://search?q=${"x".repeat(121)}`,
  ]) assert.equal(resolveUniversalLink(url), null, url);
});

test("entrada nativa Expo entrega la misma búsqueda en frío y caliente sin depender de index", async () => {
  const nativeSource = await fs.readFile(new URL("../app/+native-intent.tsx", import.meta.url), "utf8");
  const nativeJS = ts.transpileModule(nativeSource.replace(/^import .*;\n/m, ""), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const { redirectSystemPath } = await import(`data:text/javascript;base64,${Buffer.from(`${javascript}\n${nativeJS}`).toString("base64")}`);
  for (const initial of [true, false]) {
    for (const path of ["vidkar://search?q=C%2B%2B%20%26%20Swift&entity=all", "/search?q=C%2B%2B%20%26%20Swift&entity=all", "https://www.vidkar.com/search?q=C%2B%2B%20%26%20Swift&entity=all"]) {
      const target = redirectSystemPath({ path, initial });
      assert.match(target, /^\/siri-search\?/);
      assert.equal(new URL(target, "https://fixture.example").searchParams.get("query"), "C++ & Swift");
      assert.equal(new URL(target, "https://fixture.example").searchParams.get("entityType"), "all");
      // El destino ya resuelto no debe convertirse en inicio en una segunda entrega.
      assert.equal(redirectSystemPath({ path: target, initial }), target);
    }
    assert.equal(redirectSystemPath({ path: `vidkar://search?resultId=${RESULT_ID}`, initial }), `/siri-search?resultId=${RESULT_ID}`);
    assert.equal(redirectSystemPath({ path: "vidkar://search?q=a&confirmed=true", initial }), "/");
    assert.equal(redirectSystemPath({ path: "vidkar://@search?q=a", initial }), "/");
    assert.equal(redirectSystemPath({ path: "vidkar://movie/fixture?q=Title", initial }), "vidkar://movie/fixture?q=Title");
    for (const term of ["Título con acentos", "", "x".repeat(120), "😀".repeat(60)]) {
      const target = redirectSystemPath({ path: `vidkar://search?q=${encodeURIComponent(term)}&entity=all`, initial });
      assert.equal(target, `/siri-search?${new URLSearchParams({ query: term, entityType: "all" })}`);
    }
  }
});

test("ruta raíz reutiliza pantalla por plataforma y alias legacy conserva query e IDs", async () => {
  const load = async (file, dependencies, React = {}) => {
    const exports = {};
    const code = ts.transpileModule(await fs.readFile(new URL(file, import.meta.url), "utf8"), {
      fileName: "route.tsx",
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
    }).outputText;
    vm.runInNewContext(code, { exports, React, require: (name) => {
      assert.ok(name in dependencies, name);
      return dependencies[name];
    } });
    return exports.default;
  };
  const screen = () => null;
  assert.equal(await load("../app/siri-search.tsx", {
    "../components/mcp/SiriSearchScreen": { __esModule: true, default: screen },
  }), screen);
  for (const params of [
    { query: "C++ & Swift", entityType: "movie", contentId: "movie-21" },
    { resultId: RESULT_ID }, { query: "", entityType: "product", productId: "product-1" },
  ]) {
    const redirect = {};
    const Legacy = await load("../app/(normal)/SiriSearch.tsx", {
      "expo-router": { Redirect: redirect, useLocalSearchParams: () => params },
    }, { createElement: (type, props) => ({ type, props }) });
    const element = Legacy();
    assert.equal(element.type, redirect);
    assert.equal(element.props.href.pathname, "/siri-search");
    assert.equal(element.props.href.params, params);
  }
  for (const url of ["vidkar://episode/episode-1", "vidkar://product/product-1?q=Producto"]) {
    assert.equal(resolveUniversalLink(url).pathname, "/siri-search");
  }
});

test("Universal Link Siri usa el host AASA asociado en iOS", async () => {
  const config = JSON.parse(await fs.readFile(new URL("../app.json", import.meta.url), "utf8"));
  const url = "https://www.vidkar.com/search?q=Transformer&entity=all";
  assert.ok(config.expo.ios.associatedDomains.includes("applinks:www.vidkar.com"));
  assert.deepEqual(resolveUniversalLink(url), {
    pathname: "/siri-search",
    params: { query: "Transformer", entityType: "all" },
  });
});
// Siri usa el host www porque es el que publica el AASA de VIDKAR.
// Mantener la ruta web cubierta aunque Siri active VIDKAR directamente.

