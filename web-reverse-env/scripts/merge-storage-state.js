function parseCookieString(cookieString) {
  const out = {};
  if (!cookieString) {
    return out;
  }
  for (const item of String(cookieString).split(";")) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      out[trimmed] = "";
      continue;
    }
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

function mergeStorageState(input = {}) {
  return {
    cookies: parseCookieString(input.cookie || ""),
    localStorage: Object.assign({}, input.localStorage || {}),
    sessionStorage: Object.assign({}, input.sessionStorage || {}),
  };
}

module.exports = {
  mergeStorageState,
  parseCookieString,
};
