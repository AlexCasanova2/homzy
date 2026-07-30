import sanitizeHtml from "sanitize-html";
import * as cheerio from "cheerio";
import { parseAmazonUrl } from "../scrape/amazon.js";
import { validateAffiliateUrl } from "./affiliate.js";

const allowedTags = [
  "html", "head", "body", "title", "meta", "article", "section", "header", "footer", "main", "aside",
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "strong", "b", "em", "i", "u", "small",
  "blockquote", "ul", "ol", "li", "dl", "dt", "dd", "figure", "figcaption", "picture", "source", "img",
  "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td", "a", "span", "div", "code", "pre",
];

function isAmazonUrl(value) {
  try {
    parseAmazonUrl(value);
    return true;
  } catch {
    return false;
  }
}

const STORE_ID_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;

// Todo enlace de Amazon sale monetizado con el tag propio: se canonicaliza a
// /dp/{ASIN}?tag=... cuando hay ASIN y se fuerza el tag en el resto de URLs.
export function monetizeAmazonUrl(href, storeId = process.env.AMAZON_STORE_ID) {
  let url;
  try {
    url = parseAmazonUrl(href);
  } catch {
    return href;
  }
  if (!storeId || !STORE_ID_PATTERN.test(storeId)) return href;

  const asinMatch = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  if (asinMatch) {
    return `${url.origin}/dp/${asinMatch[1].toUpperCase()}?tag=${encodeURIComponent(storeId)}`;
  }
  url.searchParams.set("tag", storeId);
  return url.href;
}

export function sanitizeArticleHtml(html) {
  return sanitizeHtml(String(html || ""), {
    allowedTags,
    allowedAttributes: {
      "*": ["class"],
      a: ["href", "title", "target", "rel", "class"],
      img: ["src", "alt", "title", "width", "height", "loading", "class"],
      source: ["src", "srcset", "type", "media"],
      meta: ["name", "content", "charset"],
      th: ["colspan", "rowspan", "scope", "class"],
      td: ["colspan", "rowspan", "class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"], source: ["http", "https"], a: ["http", "https", "mailto"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => {
        if (attributes.href && isAmazonUrl(attributes.href)) {
          return {
            tagName: "a",
            attribs: { ...attributes, href: monetizeAmazonUrl(attributes.href), rel: "nofollow sponsored noopener" },
          };
        }
        const safeRel = String(attributes.rel || "")
          .split(/\s+/)
          .filter((value) => ["nofollow", "sponsored", "noopener", "noreferrer"].includes(value));
        if (attributes.target === "_blank" && !safeRel.includes("noopener")) safeRel.push("noopener");
        return {
          tagName: "a",
          attribs: { ...attributes, ...(safeRel.length ? { rel: safeRel.join(" ") } : { rel: undefined }) },
        };
      },
    },
  });
}

export function prepareGeneratedArticleHtml(html, affiliateUrl, allowedAffiliateUrls = [affiliateUrl]) {
  let clean = sanitizeArticleHtml(html);
  let $ = cheerio.load(clean);
  if (!$('article').length || !$('h1').length || !$('h2').length || !$('table').length) {
    throw new Error("Generated article is missing required structure");
  }

  // El sanitizador canonicaliza y monetiza los enlaces de Amazon, así que la
  // lista de destinos permitidos se compara en su forma monetizada.
  const allowedDestinations = new Set(
    allowedAffiliateUrls.filter(Boolean).map((value) => new URL(monetizeAmazonUrl(value)).href)
  );
  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href");
    // Los enlaces internos del propio sitio (rutas relativas) son seguros y buenos para SEO.
    if (href.startsWith("/") && !href.startsWith("//")) return;
    try {
      if (!allowedDestinations.has(new URL(href).href)) $(element).removeAttr("href target rel");
    } catch {
      $(element).removeAttr("href target rel");
    }
  });

  const finalCtaUrl = monetizeAmazonUrl(affiliateUrl);
  const escapedUrl = finalCtaUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  $("article").first().append(
    `<section class="affiliate-cta"><h2>Consulta precio y disponibilidad</h2><p><a class="btn-buy" href="${escapedUrl}" target="_blank" rel="nofollow sponsored noopener">COMPRAR AL MEJOR PRECIO</a></p></section>`
  );
  clean = sanitizeArticleHtml($.html());
  $ = cheerio.load(clean);
  const hasCta = $("a").toArray().some((element) => $(element).attr("href") === finalCtaUrl);
  if (!hasCta) throw new Error("Generated article has no valid affiliate CTA");
  return clean;
}

export function hasTrackedAmazonLink(html) {
  const $ = cheerio.load(sanitizeArticleHtml(html));
  return $("a").toArray().some((element) => {
    try {
      const url = parseAmazonUrl($(element).attr("href"));
      return Boolean(url.searchParams.get("tag"));
    } catch {
      return false;
    }
  });
}

export function hasAffiliateLinkForAsin(html, asin) {
  const $ = cheerio.load(sanitizeArticleHtml(html));
  return $("a[href]").toArray().some((element) => validateAffiliateUrl($(element).attr("href"), asin));
}
