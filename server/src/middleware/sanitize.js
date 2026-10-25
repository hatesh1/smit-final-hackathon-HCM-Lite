// Strips MongoDB operator injection vectors ($-prefixed and dotted keys)
// from request bodies. Applied before any route handler touches req.body.
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, v] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      out[key] = clean(v);
    }
    return out;
  }
  return value;
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = clean(req.body);
  }
  next();
}

module.exports = sanitizeBody;
