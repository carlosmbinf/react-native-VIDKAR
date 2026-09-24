import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await fs.readFile(new URL("../services/navigation/universalLinks.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { resolveUniversalLink } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

test("resuelve búsqueda Siri sin abrir playback automáticamente", () => {
  assert.deepEqual(resolveUniversalLink("vidkar://search?q=Avatar"), {
    pathname: "/(normal)/SiriSearch",
    params: { query: "Avatar", entityType: "all" },
  });
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
