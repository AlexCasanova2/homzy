import test from "node:test";
import assert from "node:assert/strict";

import {
  getSiteUrl,
  isConfigured,
  missingConfig,
  publicOrigin,
  inspectionUiLink,
} from "../src/services/searchConsole.js";

const KEYS = ["GSC_CLIENT_EMAIL", "GSC_PRIVATE_KEY", "GSC_SITE_URL", "SITE_URL"];

function withEnv(values, fn) {
  const previous = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const key of KEYS) delete process.env[key];
  Object.assign(process.env, values);
  try {
    fn();
  } finally {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("isConfigured requires the three Search Console variables", () => {
  withEnv({}, () => {
    assert.equal(isConfigured(), false);
    assert.deepEqual(missingConfig(), ["GSC_CLIENT_EMAIL", "GSC_PRIVATE_KEY", "GSC_SITE_URL"]);
  });

  withEnv({ GSC_CLIENT_EMAIL: "bot@example.iam.gserviceaccount.com" }, () => {
    assert.equal(isConfigured(), false);
    assert.deepEqual(missingConfig(), ["GSC_PRIVATE_KEY", "GSC_SITE_URL"]);
  });

  withEnv(
    {
      GSC_CLIENT_EMAIL: "bot@example.iam.gserviceaccount.com",
      GSC_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
      GSC_SITE_URL: "sc-domain:homzy.es",
    },
    () => {
      assert.equal(isConfigured(), true);
      assert.deepEqual(missingConfig(), []);
      assert.equal(getSiteUrl(), "sc-domain:homzy.es");
    }
  );
});

test("publicOrigin never falls back to the request host when the property is known", () => {
  // Una propiedad de dominio no es una URL: hay que reconstruir el origen.
  withEnv({ GSC_SITE_URL: "sc-domain:homzy.es" }, () => {
    assert.equal(publicOrigin("http://localhost:5177"), "https://homzy.es");
  });

  // Propiedad de prefijo de URL: se usa tal cual, sin la barra final.
  withEnv({ GSC_SITE_URL: "https://homzy.es/" }, () => {
    assert.equal(publicOrigin("http://localhost:5177"), "https://homzy.es");
  });

  // SITE_URL manda sobre la propiedad.
  withEnv({ SITE_URL: "https://www.homzy.es/", GSC_SITE_URL: "sc-domain:homzy.es" }, () => {
    assert.equal(publicOrigin("http://localhost:5177"), "https://www.homzy.es");
  });

  // Sin nada configurado se acepta el host de la petición: solo se usa para mostrar.
  withEnv({}, () => {
    assert.equal(publicOrigin("http://localhost:5177"), "http://localhost:5177");
  });
});

test("inspectionUiLink points at the Search Console inspection tool with both parameters", () => {
  withEnv({ GSC_SITE_URL: "sc-domain:homzy.es" }, () => {
    const link = inspectionUiLink("https://homzy.es/analisis/mi-articulo");
    assert.equal(link.startsWith("https://search.google.com/search-console/inspect?"), true);
    assert.equal(link.includes(`resource_id=${encodeURIComponent("sc-domain:homzy.es")}`), true);
    assert.equal(link.includes(`id=${encodeURIComponent("https://homzy.es/analisis/mi-articulo")}`), true);
  });

  withEnv({}, () => {
    assert.equal(inspectionUiLink("https://homzy.es/analisis/mi-articulo"), null);
  });
});
