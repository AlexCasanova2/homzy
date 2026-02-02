const DEFAULT_TONE = "cercano-profesional";

export function resolveLlmConfig(env = process.env) {
  const provider = env.LLM_PROVIDER || "ollama";
  const baseUrl = env.LLM_BASE_URL ||
    (provider === "openai"
      ? "https://api.openai.com/v1"
      : provider === "openrouter"
        ? "https://openrouter.ai/api/v1"
        : "http://localhost:11434/v1");
  const apiKey = env.LLM_API_KEY || "";
  const model = env.LLM_MODEL || (provider === "openai" ? "gpt-4o-mini" : "llama3.1");
  const referrer = env.LLM_REFERRER || "";
  const appName = env.LLM_APP_NAME || "";

  const enabled = provider === "openai" || provider === "openrouter" ? Boolean(apiKey) : Boolean(baseUrl);

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    referrer,
    appName,
    enabled,
  };
}

export function buildArticleMessages({
  product,
  relatedProducts = [],
  affiliateLink,
  category,
  locale = "es-ES",
  tone = DEFAULT_TONE,
}) {
  const input = {
    product,
    relatedProducts,
    affiliateLink,
    category,
    locale,
    tone,
  };

  const system = `Eres un redactor SEO experto en afiliación Amazon. Escribe en ${locale} con tono ${tone}.
Devuelve SOLO HTML completo y válido (con <html>, <head>, <body>). No añadas texto fuera del HTML.`;

  const user = `Genera un artículo SEO basado en el JSON proporcionado. Requisitos:
- Título SEO con palabra clave
- Meta description
- Introducción persuasiva
- Tabla comparativa de 3 productos similares
- Top productos destacados (5–8)
- Pros y contras
- Guía de compra
- FAQ
- CTA con enlace afiliado

Formato: HTML listo para publicar. NO incluir explicaciones.

JSON:
${JSON.stringify(input, null, 2)}
`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export async function requestLlmHtml({ messages, config, fetchImpl = fetch }) {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  const extraHeaders = {};
  if (config.referrer) extraHeaders["HTTP-Referer"] = config.referrer;
  if (config.appName) extraHeaders["X-Title"] = config.appName;

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM response without content");
  }

  return content;
}
