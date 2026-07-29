import jwt from "jsonwebtoken";

function bearerToken(req) {
  const match = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || null;
}

export function createAuthMiddleware(secret) {
  function authenticate(req, res, next) {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Bearer token required" });

    try {
      req.user = jwt.verify(token, secret);
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  }

  function optionalAuthenticate(req, res, next) {
    const token = bearerToken(req);
    if (!token) return next();

    try {
      req.user = jwt.verify(token, secret);
      next();
    } catch {
      // Public routes must remain readable when a stale local token is present.
      next();
    }
  }

  return { authenticate, optionalAuthenticate };
}
