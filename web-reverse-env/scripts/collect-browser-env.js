/*
Browser-side environment collector template.
Reconstructed from public env-harvesting patterns, especially boda_jsEnv's
"changeDom.js", but normalized into a structured JSON exporter.
*/

(function collectBrowserEnv() {
  function safeCall(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      return fallback;
    }
  }

  function dumpStorage(storage) {
    const out = {};
    if (!storage) {
      return out;
    }
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      out[key] = storage.getItem(key);
    }
    return out;
  }

  function dumpNavigator() {
    return {
      userAgent: safeCall(() => navigator.userAgent, ""),
      platform: safeCall(() => navigator.platform, ""),
      vendor: safeCall(() => navigator.vendor, ""),
      language: safeCall(() => navigator.language, ""),
      languages: safeCall(() => Array.from(navigator.languages || []), []),
      webdriver: safeCall(() => navigator.webdriver, undefined),
      hardwareConcurrency: safeCall(() => navigator.hardwareConcurrency, undefined),
      deviceMemory: safeCall(() => navigator.deviceMemory, undefined),
      maxTouchPoints: safeCall(() => navigator.maxTouchPoints, undefined),
      cookieEnabled: safeCall(() => navigator.cookieEnabled, undefined),
      pdfViewerEnabled: safeCall(() => navigator.pdfViewerEnabled, undefined),
      userAgentData: safeCall(() => navigator.userAgentData, null),
      connection: safeCall(() => navigator.connection, null),
      webkitPersistentStorage: safeCall(() => navigator.webkitPersistentStorage, null),
      webkitTemporaryStorage: safeCall(() => navigator.webkitTemporaryStorage, null),
    };
  }

  function dumpDocument() {
    return {
      URL: safeCall(() => document.URL, ""),
      referrer: safeCall(() => document.referrer, ""),
      documentURI: safeCall(() => document.documentURI, ""),
      compatMode: safeCall(() => document.compatMode, ""),
      dir: safeCall(() => document.dir, ""),
      title: safeCall(() => document.title, ""),
      designMode: safeCall(() => document.designMode, ""),
      readyState: safeCall(() => document.readyState, ""),
      contentType: safeCall(() => document.contentType, ""),
      inputEncoding: safeCall(() => document.inputEncoding, ""),
      domain: safeCall(() => document.domain, ""),
      characterSet: safeCall(() => document.characterSet, ""),
      charset: safeCall(() => document.charset, ""),
      hidden: safeCall(() => document.hidden, undefined),
      cookie: safeCall(() => document.cookie, ""),
    };
  }

  function dumpScreen() {
    return {
      width: safeCall(() => screen.width, undefined),
      height: safeCall(() => screen.height, undefined),
      availWidth: safeCall(() => screen.availWidth, undefined),
      availHeight: safeCall(() => screen.availHeight, undefined),
      availLeft: safeCall(() => screen.availLeft, undefined),
      availTop: safeCall(() => screen.availTop, undefined),
      colorDepth: safeCall(() => screen.colorDepth, undefined),
      pixelDepth: safeCall(() => screen.pixelDepth, undefined),
      isExtended: safeCall(() => screen.isExtended, undefined),
      orientation: safeCall(() => screen.orientation, null),
    };
  }

  function dumpWindowMetrics() {
    return {
      devicePixelRatio: safeCall(() => window.devicePixelRatio, undefined),
      innerWidth: safeCall(() => window.innerWidth, undefined),
      innerHeight: safeCall(() => window.innerHeight, undefined),
      outerWidth: safeCall(() => window.outerWidth, undefined),
      outerHeight: safeCall(() => window.outerHeight, undefined),
      isSecureContext: safeCall(() => window.isSecureContext, undefined),
    };
  }

  function collectCanvasFingerprint() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { canvas2d: null, webgl: null };
    }
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(10, 10, 120, 40);
    ctx.fillStyle = "#069";
    ctx.fillText("env-codex", 14, 16);
    const canvas2d = safeCall(() => canvas.toDataURL(), null);

    let webgl = null;
    const gl = safeCall(() => canvas.getContext("webgl") || canvas.getContext("experimental-webgl"), null);
    if (gl) {
      webgl = {
        vendor: safeCall(() => gl.getParameter(37445), null),
        renderer: safeCall(() => gl.getParameter(37446), null),
      };
    }
    return { canvas2d, webgl };
  }

  const payload = {
    timestamp: new Date().toISOString(),
    location: {
      href: safeCall(() => location.href, ""),
      origin: safeCall(() => location.origin, ""),
      protocol: safeCall(() => location.protocol, ""),
      host: safeCall(() => location.host, ""),
      hostname: safeCall(() => location.hostname, ""),
      pathname: safeCall(() => location.pathname, ""),
      search: safeCall(() => location.search, ""),
      hash: safeCall(() => location.hash, ""),
    },
    history: {
      length: safeCall(() => history.length, undefined),
      scrollRestoration: safeCall(() => history.scrollRestoration, undefined),
    },
    navigator: dumpNavigator(),
    document: dumpDocument(),
    screen: dumpScreen(),
    windowMetrics: dumpWindowMetrics(),
    localStorage: dumpStorage(window.localStorage),
    sessionStorage: dumpStorage(window.sessionStorage),
    fingerprint: collectCanvasFingerprint(),
  };

  console.log(JSON.stringify(payload, null, 2));
  return payload;
})();
