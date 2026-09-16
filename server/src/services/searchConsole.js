/**
 * Cliente de Google Search Console.
 *
 * Autenticación por cuenta de servicio: se firma un JWT con la clave privada y se
 * canjea por un access token en el endpoint de OAuth de Google. Se hace a mano con
 * `jsonwebtoken` + `axios` (ya presentes) en lugar de añadir `googleapis`, que
 * arrastra decenas de MB al bundle de la función serverless para usar cuatro rutas.
 *
 * Requiere en el entorno:
 *   GSC_CLIENT_EMAIL  correo de la cuenta de servicio
 *   GSC_PRIVATE_KEY   clave privada PEM (los \n literales se normalizan aquí)
 *   GSC_SITE_URL      propiedad, p. ej. "sc-domain:homzy.es" o "https://homzy.es/"
 *
 * La cuenta de servicio debe estar añadida como usuario de la propiedad en Search
 * Console; el acceso no se hereda del proyecto de Google Cloud.
 */
import axios from "axios";
import jwt from "jsonwebtoken";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WEBMASTERS = "https://www.googleapis.com/webmasters/v3";
const INSPECTION = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
// Alcance completo (no readonly) porque también se reenvía el sitemap.
const SCOPE = "https://www.googleapis.com/auth/webmasters";

export function getSiteUrl() {
  return process.env.GSC_SITE_URL?.trim() || null;
}

function getPrivateKey() {
  const raw = process.env.GSC_PRIVATE_KEY;
  if (!raw) return null;
  // En los .env la clave viaja en una línea con \n escapados; en Vercel puede venir ya con saltos reales.
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function isConfigured() {
  return Boolean(process.env.GSC_CLIENT_EMAIL && getPrivateKey() && getSiteUrl());
}

export function missingConfig() {
  return [
    !process.env.GSC_CLIENT_EMAIL && "GSC_CLIENT_EMAIL",
    !getPrivateKey() && "GSC_PRIVATE_KEY",
    !getSiteUrl() && "GSC_SITE_URL",
  ].filter(Boolean);
}

// El token vive 1 hora; se cachea en memoria y se renueva un minuto antes de caducar.
let tokenCache = { value: null, expiresAt: 0 };

export async function getAccessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  if (!isConfigured()) throw new Error(`Search Console sin configurar: falta ${missingConfig().join(", ")}`);

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { scope: SCOPE, aud: TOKEN_URL, iss: process.env.GSC_CLIENT_EMAIL, iat: now, exp: now + 3600 },
    getPrivateKey(),
    { algorithm: "RS256" }
  );

  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    { headers: { "content-type": "application/x-www-form-urlencoded" }, timeout: 15000 }
  );

  tokenCache = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.value;
}

async function request(method, url, body) {
  const token = await getAccessToken();
  try {
    const { data } = await axios({
      method,
      url,
      data: body,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      timeout: 30000,
    });
    return data;
  } catch (error) {
    // Los errores de Google traen un mensaje útil; sin esto el admin solo vería "Request failed with status code 403".
    const detail = error.response?.data?.error;
    const message = typeof detail === "string" ? detail : detail?.message;
    const status = error.response?.status;
    const enriched = new Error(message ? `Google (${status}): ${message}` : error.message);
    enriched.status = status;
    throw enriched;
  }
}

const siteSegment = () => encodeURIComponent(getSiteUrl());

/** Propiedades a las que tiene acceso la cuenta de servicio. Sirve para diagnosticar permisos. */
export async function listSites() {
  const data = await request("get", `${WEBMASTERS}/sites`);
  return (data.siteEntry || []).map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));
}

/**
 * Datos de rendimiento (clics, impresiones, CTR, posición).
 * `dimensions` vacío devuelve una única fila con los totales del periodo.
 */
export async function searchAnalytics({ startDate, endDate, dimensions = [], rowLimit = 25, type = "web" }) {
  const data = await request("post", `${WEBMASTERS}/sites/${siteSegment()}/searchAnalytics/query`, {
    startDate,
    endDate,
    dimensions,
    rowLimit,
    type,
  });
  return data.rows || [];
}

/** Estado de indexación de una URL concreta (API de Inspección de URL). */
export async function inspectUrl(inspectionUrl) {
  const data = await request("post", INSPECTION, {
    inspectionUrl,
    siteUrl: getSiteUrl(),
    languageCode: "es-ES",
  });
  const result = data.inspectionResult || {};
  const index = result.indexStatusResult || {};
  return {
    verdict: index.verdict || result.verdict || null,
    coverageState: index.coverageState || null,
    robotsTxtState: index.robotsTxtState || null,
    indexingState: index.indexingState || null,
    pageFetchState: index.pageFetchState || null,
    lastCrawlTime: index.lastCrawlTime || null,
    googleCanonical: index.googleCanonical || null,
    userCanonical: index.userCanonical || null,
    sitemaps: index.sitemap || [],
    referringUrls: index.referringUrls || [],
    richResults: result.richResultsResult?.verdict || null,
    mobileUsability: result.mobileUsabilityResult?.verdict || null,
    inspectionLink: result.inspectionResultLink || null,
  };
}

export async function listSitemaps() {
  const data = await request("get", `${WEBMASTERS}/sites/${siteSegment()}/sitemaps`);
  return (data.sitemap || []).map((s) => ({
    path: s.path,
    lastSubmitted: s.lastSubmitted || null,
    lastDownloaded: s.lastDownloaded || null,
    isPending: Boolean(s.isPending),
    errors: Number(s.errors || 0),
    warnings: Number(s.warnings || 0),
    submitted: Number(s.contents?.[0]?.submitted || 0),
    indexed: Number(s.contents?.[0]?.indexed || 0),
  }));
}

/** Reenvía el sitemap para que Google lo vuelva a leer (sustituye al ping, retirado en 2023). */
export async function submitSitemap(feedpath) {
  await request("put", `${WEBMASTERS}/sites/${siteSegment()}/sitemaps/${encodeURIComponent(feedpath)}`);
  return { submitted: feedpath };
}

/**
 * Origen público con el que se construyen las URLs que se consultan a Google.
 *
 * Deliberadamente NO se usa el host de la petición: en local sería
 * http://localhost:5177 y la Inspección de URL fallaría por no pertenecer a la
 * propiedad. Se prefiere SITE_URL y, si no está, se deriva de GSC_SITE_URL.
 */
export function publicOrigin(fallback = null) {
  const configured = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const site = getSiteUrl();
  if (site?.startsWith("sc-domain:")) return `https://${site.slice("sc-domain:".length)}`;
  if (site?.startsWith("http")) return site.replace(/\/$/, "");
  return fallback;
}
