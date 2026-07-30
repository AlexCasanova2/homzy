import test from "node:test";
import assert from "node:assert/strict";

import { monetizeAmazonUrl, sanitizeArticleHtml } from "../src/services/articleHtml.js";

test("monetizeAmazonUrl canonicalizes product links with the store tag", () => {
  const long = "https://www.amazon.es/200cm-Plazas/dp/B0GVJL93KP?ref_=xyz&pd_rd_w=abc&th=1";
  assert.equal(monetizeAmazonUrl(long, "homzy0f-21"), "https://www.amazon.es/dp/B0GVJL93KP?tag=homzy0f-21");
});

test("monetizeAmazonUrl replaces foreign tags with our own", () => {
  const foreign = "https://www.amazon.es/dp/B0GVJL93KP?tag=otro-21";
  assert.equal(monetizeAmazonUrl(foreign, "homzy0f-21"), "https://www.amazon.es/dp/B0GVJL93KP?tag=homzy0f-21");
});

test("monetizeAmazonUrl adds tag to non-product amazon urls and ignores others", () => {
  assert.equal(
    monetizeAmazonUrl("https://www.amazon.es/s?k=sofa", "homzy0f-21"),
    "https://www.amazon.es/s?k=sofa&tag=homzy0f-21"
  );
  assert.equal(monetizeAmazonUrl("https://example.com/x", "homzy0f-21"), "https://example.com/x");
  assert.equal(monetizeAmazonUrl("https://www.amazon.es/dp/B0GVJL93KP", ""), "https://www.amazon.es/dp/B0GVJL93KP");
});

test("sanitizeArticleHtml monetizes every amazon link using AMAZON_STORE_ID", () => {
  process.env.AMAZON_STORE_ID = "homzy0f-21";
  try {
    const html = '<article><p><a href="https://www.amazon.es/algo/dp/B0TEST1234?ref_=x">ver</a> y <a href="https://example.com">otro</a></p></article>';
    const clean = sanitizeArticleHtml(html);
    assert.match(clean, /href="https:\/\/www\.amazon\.es\/dp\/B0TEST1234\?tag=homzy0f-21"/);
    assert.match(clean, /rel="nofollow sponsored noopener"/);
    assert.match(clean, /href="https:\/\/example\.com"/);
  } finally {
    delete process.env.AMAZON_STORE_ID;
  }
});
