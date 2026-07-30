import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SITE_NAME = "Homzy";
const DEFAULT_DESCRIPTION =
  "Análisis de productos de Amazon: especificaciones reales, pros, contras y para quién sí y para quién no.";

// El index.html construido se cachea en memoria: en Vercel las instancias se reutilizan,
// así que solo la primera invocación de cada instancia paga la lectura.
let shellCache = null;

const SHELL_PATHS = [
  fileURLToPath(new URL("../../../client/dist/index.html", import.meta.url)),
  fileURLToPath(new URL("../../client/dist/index.html", import.meta.url)),
];

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Origen canónico del sitio. SITE_URL manda; si no está, se deduce de la petición. */
export function siteOrigin(req) {
  const configured = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const proto = req.headers["x-forwarded-proto"]?.split(",")[0] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "homzy.es";
  return `${proto}://${host}`;
}

/**
 * Carga el index.html generado por Vite. Primero del disco y, si el bundle de la
 * función no lo incluye, por HTTP desde el propio despliegue (el fichero se sirve
 * como estático). Sin él no podemos responder: los nombres de los assets van con
 * hash y no se pueden reconstruir a mano.
 */
async function loadShell(req) {
  if (shellCache) return shellCache;

  for (const candidate of SHELL_PATHS) {
    try {
      shellCache = await fs.readFile(candidate, "utf8");
      return shellCache;
    } catch {
      // Siguiente candidato.
    }
  }

  const response = await fetch(`${siteOrigin(req)}/index.html`);
  if (!response.ok) throw new Error(`No se pudo cargar index.html (${response.status})`);
  shellCache = await response.text();
  return shellCache;
}

function metaTag(attribute, key, content) {
  if (!content) return "";
  // data-homzy-article-meta: el cliente borra estas etiquetas con clearMeta() antes de
  // escribir las suyas, así que no se duplican al hidratar.
  return `<meta ${attribute}="${key}" content="${escapeHtml(content)}" data-homzy-article-meta="true" />`;
}

/**
 * Devuelve el index.html con las metas de la página inyectadas en el <head>.
 * meta: { title, description, canonical, image, type, keywords, robots }
 */
export async function renderShell(req, meta = {}) {
  const shell = await loadShell(req);

  const title = meta.title || `${SITE_NAME} | Reseñas y Análisis de Productos`;
  const description = meta.description || DEFAULT_DESCRIPTION;
  const type = meta.type || "website";

  const tags = [
    metaTag("name", "description", description),
    metaTag("name", "keywords", meta.keywords),
    metaTag("name", "robots", meta.robots),
    metaTag("property", "og:site_name", SITE_NAME),
    metaTag("property", "og:locale", "es_ES"),
    metaTag("property", "og:type", type),
    metaTag("property", "og:title", title),
    metaTag("property", "og:description", description),
    metaTag("property", "og:url", meta.canonical),
    metaTag("property", "og:image", meta.image),
    metaTag("name", "twitter:card", meta.image ? "summary_large_image" : "summary"),
    metaTag("name", "twitter:title", title),
    metaTag("name", "twitter:description", description),
    metaTag("name", "twitter:image", meta.image),
    meta.canonical
      ? `<link rel="canonical" href="${escapeHtml(meta.canonical)}" data-homzy-article-meta="true" />`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  // index.html trae las metas de la portada, que es la única página servida como
  // estático. En cualquier otra ruta hay que quitarlas antes de inyectar las propias:
  // los crawlers no ejecutan JS y verían dos descriptions y dos og:title.
  const stripped = shell
    .replace(/[ \t]*<meta\s+name="(description|keywords|robots)"[^>]*>\s*\n?/gi, "")
    .replace(/[ \t]*<meta\s+property="og:[^"]*"[^>]*>\s*\n?/gi, "")
    .replace(/[ \t]*<meta\s+name="twitter:[^"]*"[^>]*>\s*\n?/gi, "")
    .replace(/[ \t]*<link\s+rel="canonical"[^>]*>\s*\n?/gi, "");

  return stripped
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace("</head>", `  ${tags}\n  </head>`);
}

export { SITE_NAME, DEFAULT_DESCRIPTION };
