import axios from "axios";
import * as cheerio from "cheerio";

const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
  "accept-language": "es-ES,es;q=0.9,en;q=0.8",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractImages($) {
  const seenIds = new Set();
  const images = [];
  const add = (url) => {
    if (!url) return;
    // Todas las variantes de tamaño comparten el mismo id; sin el modificador se obtiene la resolución completa.
    const match = String(url).match(/\/images\/I\/([^._]+)[^/]*\.(jpg|jpeg|png|webp)/i);
    if (!match) return;
    const [, id, extension] = match;
    if (seenIds.has(id)) return;
    seenIds.add(id);
    images.push(`https://m.media-amazon.com/images/I/${id}.${extension.toLowerCase()}`);
  };

  const img = $("#imgTagWrapperId img");
  const data = img.attr("data-a-dynamic-image");
  if (data) {
    try {
      Object.keys(JSON.parse(data)).forEach(add);
    } catch {
      // data-a-dynamic-image malformado: se sigue con el resto de fuentes.
    }
  }
  add(img.attr("src"));
  $("#altImages img").each((_, el) => add($(el).attr("src")));
  return images;
}

function extractAsin($) {
  const asin = $("#ASIN").attr("value") || $("input[name='ASIN']").attr("value");
  return asin || null;
}

function extractAsinFromUrl(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

const AMAZON_TLDS = [
  "com", "ca", "com.mx", "com.br", "co.uk", "de", "fr", "it", "es", "nl", "pl", "se", "com.be",
  "co.jp", "in", "com.au", "sg", "com.tr", "ae", "sa", "eg",
];

export function normalizeAsin(value) {
  const asin = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(asin) ? asin : null;
}

export function parseAmazonUrl(value) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const allowedHosts = AMAZON_TLDS.flatMap((tld) => [`amazon.${tld}`, `www.amazon.${tld}`]);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || !allowedHosts.includes(hostname)) {
    throw new Error("Only standard Amazon marketplace URLs are allowed");
  }
  return url;
}

export function extractDescription($) {
  const clean = (value) => value.replace(/\s+/g, " ").trim();
  const description = clean($("#productDescription").text());
  if (description) return description;
  const bookDescription = clean($("#bookDescription_feature_div").text());
  if (bookDescription) return bookDescription;

  // A+ Content: quedarse solo con el texto real (títulos y párrafos), sin estilos.
  const genericHeadings = new Set(["descripción del producto", "product description", "del fabricante", "from the manufacturer"]);
  const aplus = $("#aplus_feature_div").clone();
  aplus.find("style, script").remove();
  const paragraphs = [];
  aplus.find("h1, h2, h3, h4, p").each((_, el) => {
    const text = clean($(el).text());
    if (text.length >= 3 && !genericHeadings.has(text.toLowerCase())) paragraphs.push(text);
  });
  const joined = paragraphs.join("\n");
  // Un A+ de solo imágenes no aporta texto útil.
  return joined.length >= 40 ? joined : null;
}

export function extractDetails($) {
  const details = {};
  const cleanKey = (value) => value.replace(/[‎‏‏‎]/g, "").replace(/\s+/g, " ").replace(/:$/, "").trim();
  const cleanValue = (value) => value.replace(/[‎‏‏‎]/g, "").replace(/\s+/g, " ").trim();

  const addEntry = (key, value) => {
    // Se descartan celdas anómalas (p. ej. bloques de opiniones incrustados en la tabla).
    if (key && value && key.length <= 80 && value.length <= 300) details[key] = value;
  };

  // Tablas de especificaciones ("Información del producto", layouts técnico y combinado)
  $("#productDetails_techSpec_section_1 tr, #productDetails_techSpec_section_2 tr, #productDetails_detailBullets_sections1 tr, #prodDetails table tr").each((_, el) => {
    addEntry(cleanKey($(el).find("th").text()), cleanValue($(el).find("td").text()));
  });

  // Tabla resumen bajo el precio (product overview)
  $("#productOverview_feature_div table tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length >= 2) {
      addEntry(cleanKey($(cells[0]).text()), cleanValue($(cells[1]).text()));
    }
  });

  // Lista de detalles (layout de bullets)
  $("#detailBullets_feature_div li").each((_, el) => {
    const text = cleanValue($(el).text());
    const separator = text.indexOf(":");
    if (separator > 0) {
      addEntry(cleanKey(text.slice(0, separator)), text.slice(separator + 1).trim());
    }
  });

  return Object.keys(details).length ? details : null;
}

function extractTitle($) {
  const title =
    $("#productTitle").text().trim() ||
    $("h1 span#title").text().trim() ||
    $("h1 span.a-size-large").first().text().trim() ||
    $("meta[property='og:title']").attr("content") ||
    $("title").first().text().trim();
  return title || null;
}

export async function scrapeAmazonProduct(url) {
  const target = parseAmazonUrl(url);
  // Soft scraping: low frequency, browser-like headers.
  await sleep(1500 + Math.floor(Math.random() * 1000));

  const response = await axios.get(target.href, {
    headers: DEFAULT_HEADERS,
    timeout: 15000,
    maxRedirects: 3,
    maxContentLength: 8 * 1024 * 1024,
    maxBodyLength: 8 * 1024 * 1024,
    beforeRedirect: (options) => {
      const auth = options.auth ? `${options.auth}@` : "";
      const port = options.port ? `:${options.port}` : "";
      parseAmazonUrl(`${options.protocol}//${auth}${options.hostname}${port}${options.path || "/"}`);
    },
    responseType: "text",
  });
  const $ = cheerio.load(response.data);

  const htmlTitle = $("title").first().text().trim();
  const bodyText = $("body").text();
  console.log("[scrape] status:", response.status, "len:", response.data?.length || 0);
  console.log("[scrape] title:", htmlTitle.slice(0, 200));

  const title = extractTitle($);
  const price =
    $("#priceblock_ourprice").text().trim() ||
    $("#priceblock_dealprice").text().trim() ||
    $("span.a-price span.a-offscreen").first().text().trim();

  const ratingText =
    $("span[data-hook='rating-out-of-text']").first().text().trim() ||
    $("i.a-icon-star span").first().text().trim();

  const ratingMatch = ratingText.match(/([0-9]+[\.,]?[0-9]*)/);
  const rating = ratingMatch ? Number(ratingMatch[1].replace(",", ".")) : null;

  const reviewsText = $("#acrCustomerReviewText").text().trim();
  const reviewsMatch = reviewsText.match(/([0-9.]+)/);
  const reviews = reviewsMatch ? Number(reviewsMatch[1].replace(".", "")) : null;

  const features = [];
  $("#feature-bullets ul li span.a-list-item").each((_, el) => {
    const text = $(el).text().trim();
    if (text) features.push(text);
  });

  const images = extractImages($);
  const asin = extractAsin($) || extractAsinFromUrl(url);

  if (!title || !asin) {
    if (/robot check|captcha|are you a robot|enter the characters/i.test(bodyText)) {
      throw new Error("Amazon bloqueó el scraping (captcha/robot check). Prueba más tarde o usa otro proxy.");
    }
    throw new Error("No se pudieron extraer datos del producto. Revisa la URL o intenta otro ASIN.");
  }

  return {
    title,
    asin,
    price: price || null,
    rating,
    reviews,
    features,
    images,
    description: extractDescription($),
    details: extractDetails($),
    url,
  };
}

export function buildAmazonUrl(asin, marketplace = "https://www.amazon.es", storeId = process.env.AMAZON_STORE_ID) {
  const normalizedAsin = normalizeAsin(asin);
  if (!normalizedAsin || !storeId || !/^[A-Za-z0-9_-]{2,64}$/.test(storeId)) return null;
  const base = parseAmazonUrl(marketplace || "https://www.amazon.es");
  return `${base.origin}/dp/${normalizedAsin}?tag=${encodeURIComponent(storeId)}`;
}
