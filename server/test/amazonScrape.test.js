import test from "node:test";
import assert from "node:assert/strict";
import * as cheerio from "cheerio";

import { extractDescription, extractDetails } from "../src/scrape/amazon.js";

test("extractDescription reads #productDescription and normalizes whitespace", () => {
  const $ = cheerio.load(`
    <div id="productDescription">
      <p>Altavoz inteligente con   sonido
      mejorado y graves potentes.</p>
    </div>
  `);
  assert.equal(extractDescription($), "Altavoz inteligente con sonido mejorado y graves potentes.");
});

test("extractDescription returns null when the section is missing", () => {
  const $ = cheerio.load("<div><p>Sin descripción</p></div>");
  assert.equal(extractDescription($), null);
});

test("extractDetails parses tech spec table layout", () => {
  const $ = cheerio.load(`
    <table id="productDetails_techSpec_section_1">
      <tr><th>Marca</th><td>Amazon</td></tr>
      <tr><th>Color</th><td>Antracita</td></tr>
      <tr><th>Peso del producto</th><td> 340 g </td></tr>
    </table>
  `);
  assert.deepEqual(extractDetails($), {
    Marca: "Amazon",
    Color: "Antracita",
    "Peso del producto": "340 g",
  });
});

test("extractDetails parses detail bullets layout with unicode marks", () => {
  const $ = cheerio.load(`
    <div id="detailBullets_feature_div">
      <ul>
        <li><span>Dimensiones del producto&#8207;:&#8206; 10 x 10 x 8,9 cm</span></li>
        <li><span>Fabricante&#8207;:&#8206; Amazon</span></li>
        <li><span>Sin separador valido</span></li>
      </ul>
    </div>
  `);
  assert.deepEqual(extractDetails($), {
    "Dimensiones del producto": "10 x 10 x 8,9 cm",
    Fabricante: "Amazon",
  });
});

test("extractDetails returns null when nothing matches", () => {
  const $ = cheerio.load("<div><table><tr><td>vacío</td></tr></table></div>");
  assert.equal(extractDetails($), null);
});

test("extractImages dedupes size variants and returns full-resolution gallery", async () => {
  const { extractImages } = await import("../src/scrape/amazon.js");
  const $ = cheerio.load(`
    <div id="imgTagWrapperId">
      <img src="https://m.media-amazon.com/images/I/811xlQkC8YL._AC_SY355_.jpg"
           data-a-dynamic-image='{"https://m.media-amazon.com/images/I/811xlQkC8YL._AC_SY450_.jpg":[450,450],"https://m.media-amazon.com/images/I/811xlQkC8YL._AC_SX679_.jpg":[679,679]}' />
    </div>
    <div id="altImages">
      <img src="https://m.media-amazon.com/images/I/71abcDEF12L._AC_US40_.jpg" />
      <img src="https://m.media-amazon.com/images/I/61zyxWVU98L._AC_US40_.jpg" />
      <img src="https://m.media-amazon.com/images/G/30/sprite/play-icon.png" />
    </div>
  `);
  assert.deepEqual(extractImages($), [
    "https://m.media-amazon.com/images/I/811xlQkC8YL.jpg",
    "https://m.media-amazon.com/images/I/71abcDEF12L.jpg",
    "https://m.media-amazon.com/images/I/61zyxWVU98L.jpg",
  ]);
});
