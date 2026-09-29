const defaultOrigin = 'https://packersmexico.github.io';

export function applyCors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN || defaultOrigin;
  const origin = req.headers.origin;
  if (!origin || origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}

export function json(res, status, body) {
  res.status(status).json(body);
}

export function rejectMethod(req, res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
}

export function isAllowedOrigin(req) {
  const allowed = process.env.ALLOWED_ORIGIN || defaultOrigin;
  const origin = req.headers.origin;
  return !origin || origin === allowed;
}
