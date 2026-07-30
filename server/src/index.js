import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "./app.js";

const PORT = process.env.PORT || 5177;

// Entrada para entornos con proceso persistente (local, Passenger).
// En Vercel la app se sirve desde api/index.js y los estáticos los pone la plataforma.
if (process.env.NODE_ENV === "production") {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(currentDir, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
