import { slugify } from "../utils.js";
import { buildArticleMessages, requestLlmHtml } from "./llmClient.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function take(list, count) {
  return list.filter(Boolean).slice(0, count);
}

// Los títulos de Amazon suelen ser larguísimos ("X | Y,Z,5 en 1..."); para h1,
// FAQ y meta conviene la parte descriptiva inicial. El título completo se
// conserva en la tabla comparativa.
function cleanKeyword(title) {
  const base = String(title || "").split("|")[0].trim().replace(/[,;:\s]+$/, "");
  return base || "Producto recomendado";
}

function truncate(value, max) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/[\s,.;:]+\S*$/, "")}…`;
}

function renderComparisonTable(primary, related) {
  const rows = [primary, ...related].slice(0, 3);
  return `
<table>
  <thead>
    <tr>
      <th>Producto</th>
      <th>Precio</th>
      <th>Rating</th>
      <th>Reviews</th>
      <th>Acción</th>
    </tr>
  </thead>
  <tbody>
    ${rows
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.title || "Producto")}</td>
        <td>${escapeHtml(item.price || "Consultar")}</td>
        <td>${item.rating ?? "-"}</td>
        <td>${item.reviews ?? "-"}</td>
        <td>${item.affiliateUrl ? `<a href="${escapeHtml(item.affiliateUrl)}" target="_blank" rel="nofollow sponsored noopener">Ver oferta</a>` : "-"}</td>
      </tr>`
      )
      .join("\n")}
  </tbody>
</table>`;
}

function renderSpecsTable(details, limit = 10) {
  const entries = Object.entries(details || {}).slice(0, limit);
  if (!entries.length) return "";
  return `
    <section>
      <h2>Especificaciones principales</h2>
      <table>
        <tbody>
          ${entries
            .map(([key, value]) => `<tr><th scope="row">${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`)
            .join("\n")}
        </tbody>
      </table>
    </section>`;
}

export function generateSeoArticle({ product, relatedProducts = [], affiliateLink, category }) {
  const keyword = cleanKeyword(product.title);
  const title = `${keyword}: opiniones y análisis`;
  const metaDescription = truncate(
    `Descubre si ${keyword} merece la pena: análisis, pros y contras, especificaciones y guía de compra.`,
    160
  );

  const features = Array.isArray(product.features) ? product.features : [];
  const pros = take(features, 5).map((feature) => truncate(feature, 180));
  // Las características de Amazon siempre son elogios; no sirven como contras.
  const cons = [
    "Comprueba las medidas y el espacio disponible antes de comprar.",
    "El precio y la disponibilidad pueden variar según el vendedor y el momento.",
  ];

  const related = take(relatedProducts, 7);
  const comparisonTable = renderComparisonTable({ ...product, affiliateUrl: affiliateLink }, related);
  const specsTable = renderSpecsTable(product.details);
  const brand = product.details?.Marca || product.details?.Fabricante || null;
  const seoKeywords = [keyword, brand, category, "opiniones", "análisis", "comprar"]
    .filter(Boolean)
    .join(", ");

  const introDescription = product.description
    ? `<p>${escapeHtml(truncate(product.description, 400))}</p>`
    : "";

  const link = affiliateLink;
  const slug = slugify(title);

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
</head>
<body>
  <article>
    <h1>${escapeHtml(title)}</h1>
    ${category ? `<p><strong>Categoría:</strong> ${escapeHtml(category)}</p>` : ""}

    <section>
      <h2>Introducción</h2>
      <p>Si estás buscando ${escapeHtml(keyword)}, aquí encontrarás un análisis completo con datos clave, ventajas reales y aspectos a tener en cuenta antes de comprar.</p>
      ${introDescription}
    </section>

    <section>
      <h2>Comparativa rápida</h2>
      ${comparisonTable}
    </section>
    ${specsTable}
    ${
      related.length
        ? `
    <section>
      <h2>Alternativas destacadas</h2>
      <ol>
        ${related.map((item) => `<li>${escapeHtml(item.title || "Producto")}</li>`).join("\n        ")}
      </ol>
    </section>`
        : ""
    }

    <section>
      <h2>Pros y contras</h2>
      <h3>Pros</h3>
      <ul>
        ${pros.length ? pros.map((p) => `<li>${escapeHtml(p)}</li>`).join("\n        ") : "<li>Calidad general destacable.</li>"}
      </ul>
      <h3>A tener en cuenta</h3>
      <ul>
        ${cons.map((c) => `<li>${escapeHtml(c)}</li>`).join("\n        ")}
      </ul>
    </section>

    <section>
      <h2>Guía de compra</h2>
      <p>Antes de comprar, revisa la compatibilidad, el presupuesto, las valoraciones y las características clave que más importan para tu uso.</p>
    </section>

    <section>
      <h2>FAQ</h2>
      <h3>¿Vale la pena ${escapeHtml(keyword)}?</h3>
      <p>Si buscas una opción equilibrada con buenas valoraciones y precio competitivo, es una opción sólida.</p>
      <h3>¿Qué alternativas existen?</h3>
      <p>${
        related.length
          ? "En la comparativa anterior verás opciones similares con distintos rangos de precio."
          : "Te recomendamos comparar con otros modelos de la misma categoría en cuanto a medidas, materiales y precio."
      }</p>
    </section>
  </article>
</body>
</html>`;
  return { html, seoTitle: title, metaDescription, slug, seoKeywords };
}

export async function generateArticleHtml({
  product,
  relatedProducts = [],
  affiliateLink,
  category,
  llm,
  locale = "es-ES",
  tone = "cercano-profesional",
}) {
  if (llm?.enabled) {
    const messages = buildArticleMessages({
      product,
      relatedProducts,
      affiliateLink,
      category,
      locale,
      tone,
    });

    try {
      const result = llm.request
        ? await llm.request({ messages })
        : llm.config
          ? await requestLlmHtml({ messages, config: llm.config })
          : null;
      if (result?.html) return result;
    } catch (error) {
      console.warn("LLM generation failed; using template:", error?.message || error);
    }
  }

  return generateSeoArticle({ product, relatedProducts, affiliateLink, category });
}
