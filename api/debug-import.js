// Sonda temporal: importa la app y devuelve el error exacto si el import falla.
// Eliminar cuando la API funcione.
export default async function handler(_req, res) {
  try {
    const mod = await import("../server/src/app.js");
    res.status(200).json({ imported: true, hasApp: Boolean(mod.app) });
  } catch (error) {
    res.status(200).json({
      imported: false,
      error: String((error && error.stack) || error).slice(0, 2000),
    });
  }
}
