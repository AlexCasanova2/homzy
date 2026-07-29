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
  const result = await generateArticleHtml({
    product,
    relatedProducts: [],
    affiliateLink: "https://example.com/afiliado",
    category: "Cocina",
    llm: {
      enabled: true,
      request: async () => ({ html: "<html><body>LLM</body></html>" }),
    },
  });

  assert.equal(result.html.includes("LLM"), true);
});

test("generateArticleHtml falls back to template when llm disabled", async () => {
  const result = await generateArticleHtml({
    product,
    relatedProducts: [],
    affiliateLink: "https://example.com/afiliado",
    category: "Cocina",
    llm: { enabled: false },
  });

  assert.equal(result.html.includes("<!doctype html>"), true);
});

test("generateArticleHtml falls back to template when llm fails", async () => {
  const result = await generateArticleHtml({
    product,
    affiliateLink: "https://www.amazon.es/dp/B0TEST1234?tag=test-21",
    llm: { enabled: true, request: async () => { throw new Error("offline"); } },
  });
  assert.match(result.html, /Comparativa rápida/);
  assert.match(result.html, /<td><a href="https:\/\/www\.amazon\.es\/dp\/B0TEST1234\?tag=test-21"/);
});
