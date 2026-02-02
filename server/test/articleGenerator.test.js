import test from "node:test";
import assert from "node:assert/strict";

import { generateArticleHtml } from "../src/services/articleGenerator.js";

const product = {
  asin: "B0TEST1234",
  title: "Cafetera Compacta",
  price: "49,99 €",
  rating: 4.5,
  reviews: 1200,
  features: ["15 bares", "Depósito 1L"],
  url: "https://www.amazon.es/dp/B0TEST1234",
};

test("generateArticleHtml uses llm when enabled", async () => {
  const html = await generateArticleHtml({
    product,
    relatedProducts: [],
    affiliateLink: "https://example.com/afiliado",
    category: "Cocina",
    llm: {
      enabled: true,
      request: async () => "<html><body>LLM</body></html>",
    },
  });

  assert.equal(html.includes("LLM"), true);
});

test("generateArticleHtml falls back to template when llm disabled", async () => {
  const html = await generateArticleHtml({
    product,
    relatedProducts: [],
    affiliateLink: "https://example.com/afiliado",
    category: "Cocina",
    llm: { enabled: false },
  });

  assert.equal(html.includes("<!doctype html>"), true);
});
