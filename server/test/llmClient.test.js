import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArticleMessages,
  resolveLlmConfig,
  requestLlmHtml,
} from "../src/services/llmClient.js";

const sampleProduct = {
  asin: "B0TEST1234",
  title: "Auriculares Bluetooth XYZ",
  price: "39,99 €",
  rating: 4.6,
  reviews: 1823,
  features: ["Cancelación activa de ruido", "30h de batería", "Carga rápida"],
  url: "https://www.amazon.es/dp/B0TEST1234",
};

const related = [
  { title: "Auriculares ABC", price: "29,99 €", rating: 4.4, reviews: 900 },
  { title: "Auriculares PRO", price: "59,99 €", rating: 4.8, reviews: 2100 },
];

test("buildArticleMessages includes required SEO sections and ES tone", () => {
  const messages = buildArticleMessages({
    product: sampleProduct,
    relatedProducts: related,
    affiliateLink: "https://example.com/afiliado",
    category: "Audio",
    locale: "es-ES",
    tone: "cercano-profesional",
  });

  assert.equal(Array.isArray(messages), true);
  const user = messages.find((msg) => msg.role === "user");
  assert.ok(user, "user message missing");

  const content = user.content;
  assert.ok(content.includes("Título SEO"));
  assert.ok(content.includes("Meta description"));
  assert.ok(content.includes("Introducción"));
  assert.ok(content.includes("Tabla comparativa"));
  assert.ok(content.includes("Top productos"));
  assert.ok(content.includes("Pros y contras"));
  assert.ok(content.includes("Guía de compra"));
  assert.ok(content.includes("FAQ"));
  assert.ok(content.includes("CTA"));
  assert.ok(content.includes("es-ES"));
  assert.ok(content.includes(sampleProduct.title));
});

test("resolveLlmConfig requires apiKey for openai", () => {
  const cfg = resolveLlmConfig({
    LLM_PROVIDER: "openai",
    LLM_API_KEY: "",
    LLM_BASE_URL: "https://api.openai.com/v1",
    LLM_MODEL: "gpt-4o-mini",
  });

  assert.equal(cfg.enabled, false);
});

test("resolveLlmConfig enables ollama without apiKey", () => {
  const cfg = resolveLlmConfig({
    LLM_PROVIDER: "ollama",
    LLM_BASE_URL: "http://localhost:11434/v1",
    LLM_MODEL: "llama3.1",
  });

  assert.equal(cfg.enabled, true);
  assert.equal(cfg.provider, "ollama");
});

test("resolveLlmConfig enables openrouter with apiKey", () => {
  const cfg = resolveLlmConfig({
    LLM_PROVIDER: "openrouter",
    LLM_API_KEY: "sk-or-test",
    LLM_MODEL: "openai/gpt-4o-mini",
  });

  assert.equal(cfg.enabled, true);
  assert.equal(cfg.baseUrl, "https://openrouter.ai/api/v1");
});

test("requestLlmHtml returns html from chat completion", async () => {
  const messages = buildArticleMessages({
    product: sampleProduct,
    relatedProducts: related,
    affiliateLink: "https://example.com/afiliado",
    category: "Audio",
    locale: "es-ES",
    tone: "cercano-profesional",
  });

  let capturedHeaders = null;
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: "<html><body>OK</body></html>" } }],
    }),
  });

  const html = await requestLlmHtml({
    messages,
    config: {
      baseUrl: "http://localhost:1234/v1",
      apiKey: "",
      model: "llama3.1",
    },
    fetchImpl: async (url, init) => {
      capturedHeaders = init.headers;
      return fakeFetch(url, init);
    },
  });

  assert.equal(html.includes("<html>"), true);
  assert.ok(capturedHeaders["content-type"]);
});

test("requestLlmHtml sends OpenRouter attribution headers", async () => {
  const messages = buildArticleMessages({
    product: sampleProduct,
    relatedProducts: related,
    affiliateLink: "https://example.com/afiliado",
    category: "Audio",
    locale: "es-ES",
    tone: "cercano-profesional",
  });

  let capturedHeaders = null;
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: "<html><body>OK</body></html>" } }],
    }),
  });

  await requestLlmHtml({
    messages,
    config: {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-or-test",
      model: "openai/gpt-4o-mini",
      referrer: "https://example.com",
      appName: "Homzy",
    },
    fetchImpl: async (url, init) => {
      capturedHeaders = init.headers;
      return fakeFetch(url, init);
    },
  });

  assert.equal(capturedHeaders["HTTP-Referer"], "https://example.com");
  assert.equal(capturedHeaders["X-Title"], "Homzy");
});
