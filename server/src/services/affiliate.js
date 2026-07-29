import { buildAmazonUrl, normalizeAsin, parseAmazonUrl } from "../scrape/amazon.js";

export function validateAffiliateUrl(url, asin) {
  let parsed;
  try {
    parsed = parseAmazonUrl(url);
  } catch {
    return false;
  }

  const expectedAsin = normalizeAsin(asin);
  const pathAsin = normalizeAsin(parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1]);
  const tag = parsed.searchParams.get("tag") || "";
  return Boolean(expectedAsin && pathAsin === expectedAsin && /^[A-Za-z0-9_-]{2,64}$/.test(tag));
}

export function resolveAffiliateUrl({ asin, links = [], affiliateLinkId, storeId, marketplace }) {
  const normalizedAsin = normalizeAsin(asin);
  if (!normalizedAsin) return null;

  const selected = affiliateLinkId ? links.find((link) => link.id === affiliateLinkId) : null;
  const candidates = [selected, ...links.filter((link) => link !== selected)].filter(
    (link) => link && normalizeAsin(link.asin) === normalizedAsin
  );
  const saved = candidates.find(
    (link) => normalizeAsin(link.asin) === normalizedAsin && validateAffiliateUrl(link.url, normalizedAsin)
  );
  if (saved) return saved.url;

  const generated = buildAmazonUrl(normalizedAsin, marketplace, storeId);
  return generated && validateAffiliateUrl(generated, normalizedAsin) ? generated : null;
}
