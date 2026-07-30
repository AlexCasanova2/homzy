// Sonda temporal: función mínima sin imports para aislar fallos de runtime.
export default function handler(_req, res) {
  res.status(200).json({ pong: true, node: process.version });
}
