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

// Las características de Amazon vienen como "Etiqueta: explicación larga".
function featureParts(feature) {
  const text = String(feature || "").trim();
  const separator = text.indexOf(":");
  if (separator > 4 && separator < 80) {
    return { label: text.slice(0, separator).trim(), body: text.slice(separator + 1).trim() };
  }
  return { label: truncate(text, 60), body: text };
}

function findDetail(details, patterns) {
  if (!details) return null;
  for (const [key, value] of Object.entries(details)) {
    if (patterns.some((pattern) => pattern.test(key))) return { key, value };
  }
  return null;
}

function formatRating(rating) {
  return String(rating).replace(".", ",");
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

function renderSpecsTable(details, limit = 12) {
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

function renderImage(src, alt, caption) {
  if (!src) return "";
  return `
      <figure>
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" width="720" height="480" />
        ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
      </figure>`;
}

export function generateSeoArticle({ product, relatedProducts = [], affiliateLink, category, categorySlug }) {
  const keyword = cleanKeyword(product.title);
  const year = new Date().getFullYear();
  const title = `${keyword}: opiniones y análisis (${year})`;
  const metaDescription = truncate(
    `¿Merece la pena ${keyword}? Análisis con especificaciones reales, pros y contras, y guía de compra (${year}).`,
    155
  );

  const details = product.details || null;
  const features = Array.isArray(product.features) ? product.features : [];
  const parsedFeatures = take(features, 5).map(featureParts);
  const brand = details?.Marca || details?.Fabricante || null;
  const images = Array.isArray(product.images) ? product.images : [];

  const seoKeywords = [keyword, brand, category, truncate(`opiniones ${keyword}`, 60), "análisis", "comprar", String(year)]
    .filter(Boolean)
    .join(", ");

  // --- Veredicto rápido (answer-first, apto para featured snippets) ---
  const ratingLine = product.rating
    ? `Valoración de usuarios: <strong>${formatRating(product.rating)}/5</strong>${product.reviews ? ` (${escapeHtml(String(product.reviews))} opiniones)` : ""}.`
    : "";
  const priceLine = product.price ? `Precio orientativo: <strong>${escapeHtml(product.price)}</strong>.` : "";
  const takeaways = parsedFeatures.slice(0, 4).map((f) => `<li><strong>${escapeHtml(f.label)}</strong></li>`).join("\n        ");

  // --- FAQ construida con datos reales de la ficha técnica ---
  const faq = [];
  faq.push({
    q: `¿Vale la pena ${keyword}?`,
    a: `${product.rating ? `Con una valoración media de ${formatRating(product.rating)}/5${product.reviews ? ` entre ${product.reviews} opiniones` : ""}, es` : "Es"} una opción sólida si buscas ${category ? `un producto de ${category.toLowerCase()}` : "una compra"} con buena relación calidad-precio.`,
  });
  const dims = findDetail(details, [/dimensiones artículo/i, /dimensiones del producto/i, /dimensiones/i]);
  if (dims) faq.push({ q: `¿Qué dimensiones tiene ${keyword}?`, a: `Sus medidas son ${dims.value}.` });
  const weight = findDetail(details, [/peso/i]);
  if (weight) faq.push({ q: "¿Cuánto pesa?", a: `El peso del producto es de ${weight.value}.` });
  const assembly = findDetail(details, [/requiere montaje/i, /montaje/i, /ensambl/i]);
  if (assembly) {
    const instructions = findDetail(details, [/instrucciones de montaje/i]);
    faq.push({ q: "¿Requiere montaje?", a: `${/^no/i.test(assembly.value) ? "No requiere montaje." : `Montaje: ${assembly.value}.`}${instructions ? ` ${instructions.value}.` : ""}` });
  }
  const care = findDetail(details, [/cuidado/i, /limpieza/i, /lavable/i]);
  if (care) faq.push({ q: "¿Cómo se limpia o cuida?", a: `${care.value}.` });
  const material = findDetail(details, [/material o tela/i, /tipo de tela/i, /^material/i, /acabado/i]);
  if (material) faq.push({ q: "¿De qué material está hecho?", a: `${material.value}.` });
  faq.push({
    q: "¿Qué alternativas existen?",
    a: relatedProducts.length
      ? "En la comparativa de este análisis encontrarás alternativas similares con distintos rangos de precio."
      : "Te recomendamos comparar medidas, materiales y precio con otros modelos de la misma categoría antes de decidir.",
  });

  // --- Guía de compra con criterios derivados de los datos ---
  const buyingCriteria = [];
  if (dims) buyingCriteria.push(`<strong>Espacio disponible:</strong> comprueba que las medidas (${escapeHtml(dims.value)}) encajan donde lo quieres colocar.`);
  if (material) buyingCriteria.push(`<strong>Materiales:</strong> este modelo usa ${escapeHtml(material.value)}; valora resistencia y mantenimiento según tu uso.`);
  if (assembly) buyingCriteria.push(`<strong>Montaje:</strong> ${escapeHtml(assembly.value)}.`);
  buyingCriteria.push("<strong>Presupuesto:</strong> el precio puede variar según ofertas y vendedor; compara antes de comprar.");
  buyingCriteria.push("<strong>Opiniones recientes:</strong> revisa las valoraciones más nuevas, reflejan la calidad actual del producto.");

  const related = take(relatedProducts, 7);
  const comparisonTable = renderComparisonTable({ ...product, affiliateUrl: affiliateLink }, related);
  const specsTable = renderSpecsTable(details);

  const introDescription = product.description
    ? `<p>${escapeHtml(truncate(product.description, 400))}</p>`
    : "";

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

    <section class="verdict-box">
      <h2>Veredicto rápido</h2>
      <p><strong>${escapeHtml(keyword)}</strong>${brand ? ` de <strong>${escapeHtml(brand)}</strong>` : ""} destaca por su relación calidad-precio. ${ratingLine} ${priceLine}</p>
      ${takeaways ? `<ul class="takeaways">\n        ${takeaways}\n      </ul>` : ""}
    </section>

    <section>
      <h2>Introducción</h2>
      <p>Si estás buscando ${escapeHtml(keyword)}, aquí encontrarás un análisis completo con datos reales: especificaciones, ventajas, inconvenientes y todo lo que conviene revisar antes de comprar.</p>
      ${introDescription}
      ${renderImage(images[1], `${keyword} - vista de detalle`, null)}
    </section>

    <section>
      <h2>Comparativa rápida</h2>
      ${comparisonTable}
    </section>
    ${specsTable}
    ${
      parsedFeatures.length
        ? `
    <section>
      <h2>Análisis de características</h2>
      ${parsedFeatures
        .map((f) => `
      <h3>${escapeHtml(f.label)}</h3>
      <p>${escapeHtml(f.body)}</p>`)
        .join("\n")}
    </section>`
        : ""
    }

    <section>
      <h2>Pros y contras</h2>
      <h3>Pros</h3>
      <ul>
        ${parsedFeatures.length ? parsedFeatures.map((f) => `<li><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(truncate(f.body, 120))}</li>`).join("\n        ") : "<li>Calidad general destacable.</li>"}
      </ul>
      <h3>A tener en cuenta</h3>
      <ul>
        <li>Comprueba las medidas y el espacio disponible antes de comprar.</li>
        <li>El precio y la disponibilidad pueden variar según el vendedor y el momento.</li>
      </ul>
    </section>
    ${renderImage(images[2], `${keyword} - características`, null)}

    <section>
      <h2>Guía de compra</h2>
      <p>Antes de decidirte, repasa estos puntos:</p>
      <ul>
        ${buyingCriteria.map((c) => `<li>${c}</li>`).join("\n        ")}
      </ul>
    </section>
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
      <h2>Preguntas frecuentes</h2>
      ${faq.map((item) => `
      <h3>${escapeHtml(item.q)}</h3>
      <p>${escapeHtml(item.a)}</p>`).join("\n")}
    </section>

    <section>
      <h2>Veredicto final</h2>
      <p>${escapeHtml(keyword)} es una compra recomendable si priorizas ${parsedFeatures[0] ? escapeHtml(parsedFeatures[0].label.toLowerCase()) : "la relación calidad-precio"}${parsedFeatures[1] ? ` y ${escapeHtml(parsedFeatures[1].label.toLowerCase())}` : ""}. Si tu prioridad es otra, revisa las alternativas de la comparativa antes de decidir.</p>
      ${category && categorySlug ? `<p><a href="/categoria/${escapeHtml(categorySlug)}">Ver más análisis de ${escapeHtml(category)}</a></p>` : ""}
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
  categorySlug,
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

  return generateSeoArticle({ product, relatedProducts, affiliateLink, category, categorySlug });
}
