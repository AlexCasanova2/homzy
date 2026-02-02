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
      </tr>`
      )
      .join("\n")}
  </tbody>
</table>`;
}

export function generateSeoArticle({ product, relatedProducts = [], affiliateLink, category }) {
  const keyword = product.title || "Producto recomendado";
  const title = `${keyword} - Opiniones, guía y mejores alternativas`;
  const metaDescription = `Descubre si ${keyword} merece la pena. Comparativa, pros y contras, guía de compra y mejores alternativas.`;

  const features = Array.isArray(product.features) ? product.features : [];
  const pros = take(features, 3);
  const cons = take(features.slice(3), 3);

  const topProducts = take([product, ...relatedProducts], 8);
  const comparisonTable = renderComparisonTable(product, relatedProducts);

  const link = affiliateLink || product.url || "#";
  const slug = slugify(title);

  return `<!doctype html>
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
    <p><strong>Categoría:</strong> ${escapeHtml(category || "General")}</p>

    <section>
      <h2>Introducción</h2>
      <p>Si estás buscando ${escapeHtml(keyword)}, aquí encontrarás un análisis completo con datos clave, ventajas reales y alternativas recomendadas.</p>
    </section>

    <section>
      <h2>Comparativa rápida</h2>
      ${comparisonTable}
    </section>

    <section>
      <h2>Top productos destacados</h2>
      <ol>
        ${topProducts
      .map(
        (item) => `
        <li>${escapeHtml(item.title || "Producto")}</li>`
      )
      .join("\n")}
      </ol>
    </section>

    <section>
      <h2>Pros y contras</h2>
      <h3>Pros</h3>
      <ul>
        ${pros.length ? pros.map((p) => `<li>${escapeHtml(p)}</li>`).join("\n") : "<li>Calidad general destacable.</li>"}
      </ul>
      <h3>Contras</h3>
      <ul>
        ${cons.length ? cons.map((c) => `<li>${escapeHtml(c)}</li>`).join("\n") : "<li>Puede variar según disponibilidad.</li>"}
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
      <p>En la comparativa anterior verás opciones similares con distintos rangos de precio.</p>
    </section>

    <section>
      <h2>CTA</h2>
      <p>Consulta el precio actual y disponibilidad aquí:</p>
      <p><a href="${escapeHtml(link)}" rel="nofollow sponsored" target="_blank">Comprar producto al mejor precio</a></p>
    </section>

    <footer>
      <p>Slug sugerido: ${escapeHtml(slug)}</p>
    </footer>
  </article>
</body>
</html>`;
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

    if (llm.request) {
      return llm.request({ messages });
    }

    if (llm.config) {
      return requestLlmHtml({ messages, config: llm.config });
    }
  }

  return generateSeoArticle({ product, relatedProducts, affiliateLink, category });
}
