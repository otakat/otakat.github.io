function isValidNumber(v) { return typeof v === 'number' && Number.isFinite(v); }

function sanitizeNumber(v, d = 0) { return isValidNumber(v) ? v : d;}

function cmpGE(actual, min) { return actual >= min; }

function cmpEQ(actual, expected) { return actual === expected; }

function generateUniqueId() {
  // Simple implementation (consider a more robust approach for a larger project)
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function aggregateObjectProperties(base, incoming) {
  const out = { ...base };
  for (const k in incoming) {
    const v = incoming[k];
    if (v instanceof Set) {
      out[k] = new Set(v);
    } else if (Array.isArray(v)) {
      out[k] = v.slice();
    } else if (v && typeof v === 'object') {
      out[k] = aggregateObjectProperties(out[k] ?? {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
