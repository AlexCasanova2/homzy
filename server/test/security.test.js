import test from "node:test";
import assert from "node:assert/strict";

import { buildAmazonUrl, parseAmazonUrl } from "../src/scrape/amazon.js";
import { resolveAffiliateUrl, validateAffiliateUrl } from "../src/services/affiliate.js";
import { hasAffiliateLinkForAsin, hasTrackedAmazonLink, prepareGeneratedArticleHtml, sanitizeArticleHtml } from "../src/services/articleHtml.js";

const asin = "B0TEST1234";
const tracked = `https://www.amazon.es/dp/${asin}?tag=homzy-21`;

test("parseAmazonUrl permits marketplaces and rejects unsafe destinations", () => {
  assert.equal(parseAmazonUrl(`https://www.amazon.es/dp/${asin}`).hostname, "www.amazon.es");
  for (const url of [
    "https://amazon.es.evil.test/dp/B0TEST1234",
    "https://user:pass@amazon.es/dp/B0TEST1234",
    "https://amazon.es:8443/dp/B0TEST1234",
    "http://127.0.0.1/dp/B0TEST1234",
  ]) {
    assert.throws(() => parseAmazonUrl(url));
  }
});

test("affiliate resolution matches ASIN and requires tracking", () => {
  const links = [
    { id: "wrong", asin, url: "https://www.amazon.es/dp/B0OTHER123?tag=homzy-21" },
    { id: "right", asin: asin.toLowerCase(), url: tracked },
  ];
  assert.equal(resolveAffiliateUrl({ asin, links }), tracked);
  assert.equal(validateAffiliateUrl(`https://amazon.es/dp/${asin}`, asin), false);
  assert.equal(validateAffiliateUrl(`https://amazon.es/dp/${asin}?tag=x`, asin), false);
  assert.equal(validateAffiliateUrl(`https://amazon.es/s?k=${asin}&tag=homzy-21`, asin), false);
  assert.equal(buildAmazonUrl(asin, "https://amazon.es", "homzy-21"), `https://amazon.es/dp/${asin}?tag=homzy-21`);
  assert.equal(resolveAffiliateUrl({ asin, links: [], storeId: "" }), null);
});

test("article sanitizer removes active content and secures Amazon links", () => {
  const clean = sanitizeArticleHtml(
    `<article onclick="bad()"><script>alert(1)</script><h1>Title</h1><a href="${tracked}" onmouseover="bad()" rel="ugc">Buy</a><img src="javascript:bad()"></article>`
  );
  assert.doesNotMatch(clean, /script|onclick|onmouseover|javascript:/i);
  assert.match(clean, /rel="nofollow sponsored noopener"/);
});

test("generated articles require structure and receive deterministic CTA", () => {
  const html = prepareGeneratedArticleHtml(
    "<article><h1>Title</h1><h2>Compare</h2><a href='https://evil.test/buy'>Bad</a><table><tr><td>A</td></tr></table></article>",
    tracked
  );
  assert.equal(hasTrackedAmazonLink(html), true);
  assert.equal(hasAffiliateLinkForAsin(html, asin), true);
  assert.doesNotMatch(html, /https:\/\/evil\.test/);
  assert.match(html, /COMPRAR AL MEJOR PRECIO/);
  assert.throws(() => prepareGeneratedArticleHtml("<article><h1>Incomplete</h1></article>", tracked));
});
