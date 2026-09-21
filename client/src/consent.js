export function openCookieSettings() {
  const googlefc = window.googlefc;
  if (!googlefc?.callbackQueue || typeof googlefc.showRevocationMessage !== "function") return false;
  googlefc.callbackQueue.push(googlefc.showRevocationMessage);
  return true;
}
