import test from "node:test";
import assert from "node:assert/strict";

import { slugify } from "../src/utils.js";

test("slugify strips Spanish accents and diacritics", () => {
  assert.equal(slugify("Cámara de Vigilancia — Análisis y Opinión"), "camara-de-vigilancia-analisis-y-opinion");
  assert.equal(slugify("Ratón inalámbrico ñoño"), "raton-inalambrico-nono");
  assert.equal(slugify("Categoría: Cocina & Café"), "categoria-cocina-cafe");
});

test("slugify collapses separators and trims edges", () => {
  assert.equal(slugify("  Hola   Mundo!!  "), "hola-mundo");
  assert.equal(slugify("---ya-con-guiones---"), "ya-con-guiones");
});

test("slugify returns empty string for symbol-only input", () => {
  assert.equal(slugify("¿¿??"), "");
  assert.equal(slugify(""), "");
  assert.equal(slugify(null), "");
});
