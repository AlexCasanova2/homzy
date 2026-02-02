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

function extractImages($) {
  const img = $("#imgTagWrapperId img");
  const data = img.attr("data-a-dynamic-image");
  if (data) {
    try {
      const parsed = JSON.parse(data);
      return Object.keys(parsed);
    } catch {
      return [];
    }
  }
  const src = img.attr("src");
  return src ? [src] : [];
}

function extractAsin($) {
  const asin = $("#ASIN").attr("value") || $("input[name='ASIN']").attr("value");
  return asin || null;
}

function extractAsinFromUrl(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
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
  // Soft scraping: low frequency, browser-like headers.
  await sleep(1500 + Math.floor(Math.random() * 1000));

  const response = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 15000,
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
    url,
  };
}

export function buildAmazonUrl(asin, marketplace = "https://www.amazon.es") {
  const storeId = process.env.AMAZON_STORE_ID;
  const baseUrl = `${marketplace}/dp/${asin}`;
  return storeId ? `${baseUrl}?tag=${storeId}` : baseUrl;
}
