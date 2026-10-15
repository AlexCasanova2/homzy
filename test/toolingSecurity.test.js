import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Comprobar la copia que realmente utiliza concurrently, incluso si npm la anida.
const requireFromConcurrently = createRequire(import.meta.resolve("concurrently"));
const { parse, quote } = requireFromConcurrently("shell-quote");
const manifestPath = fileURLToPath(import.meta.resolve("concurrently/package.json"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const cli = resolve(dirname(manifestPath), manifest.bin.concurrently);

test("shell-quote rechaza operadores y comentarios con saltos de línea", () => {
  for (const separator of ["\n", "\r", "\u2028", "\u2029"]) {
    assert.throws(() => quote([{ op: `;${separator}no-ejecutar` }]), TypeError);
    assert.throws(() => quote([{ comment: `comentario${separator}no-ejecutar` }]), TypeError);
  }
});

test("shell-quote conserva argumentos literales con caracteres de shell", () => {
  const args = ["node", "valor con espacios", "$(no-ejecutar)", "línea\nsegunda", "a'b"];
  assert.deepEqual(parse(quote(args)), args);
});

test("concurrently ejecuta dos comandos locales y conserva el resultado correcto", () => {
  const command = label => quote([process.execPath, "-e", `process.stdout.write(${JSON.stringify(label)})`]);
  const result = execFileSync(process.execPath, [cli, "--success", "all", command("tarea-A"), command("tarea-B")], {
    encoding: "utf8",
    timeout: 10000,
  });
  assert.match(result, /tarea-A/);
  assert.match(result, /tarea-B/);
});

test("concurrently propaga el fallo de un comando", () => {
  const command = status => quote([process.execPath, "-e", `process.exit(${status})`]);
  assert.throws(() => execFileSync(process.execPath, [cli, "--success", "all", command(0), command(1)], {
    stdio: "pipe",
    timeout: 10000,
  }), error => error.status === 1);
});
