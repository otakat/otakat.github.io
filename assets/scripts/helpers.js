function isValidNumber(v) { return typeof v === 'number' && Number.isFinite(v); }

function sanitizeNumber(v, d = 0) { return isValidNumber(v) ? v : d;}

function cmpGE(actual, min) { return actual >= min; }

function cmpEQ(actual, expected) { return actual === expected; }

function generateUniqueId() {
    // Simple implementation (consider a more robust approach for a larger project)
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
