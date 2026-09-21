import api from "./api.js";

// Métricas propias, anónimas. sendBeacon sobrevive a la navegación;
// si no existe, cae a una petición normal. Nunca rompe la página.
export function trackEvent(payload) {
  try {
    // El entorno de desarrollo comparte base de datos con producción: sin este
    // corte, cada prueba en local contaminaba la analítica real.
    if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return;
    const normalized = { ...payload };
    if (normalized.path) normalized.path = new URL(normalized.path, window.location.origin).pathname;
    if (normalized.referrer) normalized.referrer = new URL(normalized.referrer).origin;
    const body = JSON.stringify(normalized);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/metrics/track", new Blob([body], { type: "application/json" }));
      return;
    }
    api.post("/metrics/track", normalized).catch(() => {});
  } catch {
    // silencioso a propósito
  }
}
