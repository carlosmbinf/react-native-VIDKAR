import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import test from "node:test";
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
      pathname: "/(normal)/SiriSearch",
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
      pathname: "/(normal)/SiriSearch",
      params: { query: "Avatar", entityType: "movie" },
    });
  }
  assert.deepEqual(resolveUniversalLink("vidkar://search?entity=course"), {
    pathname: "/(normal)/SiriSearch",
    params: { query: "", entityType: "course" },
  });
  assert.deepEqual(resolveUniversalLink("vidkar://search"), {
    pathname: "/(normal)/SiriSearch",
    params: { query: "", entityType: "all" },
  });
});

test("resuelve búsqueda Siri sin abrir playback automáticamente", () => {
  assert.deepEqual(resolveUniversalLink("vidkar://movie/movie-1?q=Avatar"), {
    pathname: "/(normal)/SiriSearch",
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
