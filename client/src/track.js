import api from "./api.js";

// Métricas propias, anónimas. sendBeacon sobrevive a la navegación;
// si no existe, cae a una petición normal. Nunca rompe la página.
export function trackEvent(payload) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/metrics/track", new Blob([body], { type: "application/json" }));
      return;
    }
    api.post("/metrics/track", payload).catch(() => {});
  } catch {
    // silencioso a propósito
  }
}
