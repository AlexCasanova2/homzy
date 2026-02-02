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
IMPORTANTE: Debes devolver un objeto JSON estrictamente válido con la siguiente estructura:
{
  "seoTitle": "Título optimizado para SEO",
  "seoKeywords": "lista, de, palabras, clave",
  "metaDescription": "Resumen para buscadores",
  "slug": "url-amigable-sugerida",
  "html": "<body>Contenido completo del artículo en HTML. REGLAS DE ORO DE AFILIACIÓN: 
1. CUALQUIER enlace a un producto (ya sea el principal o los recomendados en la tabla) DEBE usar el enlace de afiliado proporcionado: ${affiliateLink}. No uses otros enlaces.
2. Los botones de compra DEBEN tener exactamente esta estructura: <a href='${affiliateLink}' class='btn-buy' target='_blank' rel='nofollow sponsored'><span>🛒</span> COMPRAR AL MEJOR PRECIO</a>. Es vital que el texto sea 'COMPRAR AL MEJOR PRECIO' para que el botón sea grande y visible.
3. Incluye uno de estos botones al principio, otro en la tabla comparativa (columna de acción) y otro al final en el veredicto.
4. En el veredicto final, añade un texto persuasivo (claim) como: '¡Aprovecha esta oferta limitada antes de que se agote!' justo antes del botón final.
</body>"
}`;

  const user = `Genera un artículo SEO basado en el JSON proporcionado. Requisitos:
- Título SEO con palabra clave
- Meta description
- Introducción persuasiva
- Tabla comparativa de 3 productos similares
- Top productos destacados (5–8)
- Pros y contras
- Guía de compra
- FAQ
- Sección final 'Veredicto Final' con un claim muy persuasivo y un botón de compra claro.
- IMPORTANTE: El enlace de afiliado "${affiliateLink}" debe ser el ÚNICO enlace de compra para el producto principal. No lo uses para los productos de la competencia en la tabla.

Formato: JSON válido. NO incluir explicaciones fuera del bloque de código JSON.

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
    console.error(`LLM API Error (${response.status}):`, text);
    throw new Error(`LLM error: ${response.status} ${text.slice(0, 100)}...`);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    const text = await response.text();
    console.error("Failed to parse LLM JSON response:", text);
    throw new Error("Respuesta del servidor LLM inválida (no es JSON)");
  }
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM response without content");
  }

  try {
    // Attempt to extract JSON if the LLM wrapped it in markdown
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (e) {
    // If it's not JSON, return it as the HTML content part for a fallback
    return { html: content };
  }
}
