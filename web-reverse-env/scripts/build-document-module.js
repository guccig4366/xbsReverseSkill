const { scaffoldModule } = require("./scaffold-module");

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeDocumentSeed(seed = {}) {
  const documentSeed = seed.document && typeof seed.document === "object" ? seed.document : seed;
  return {
    document: {
      URL: documentSeed.URL || "https://example.invalid/",
      referrer: documentSeed.referrer || "",
      documentURI: documentSeed.documentURI || documentSeed.URL || "https://example.invalid/",
      compatMode: documentSeed.compatMode || "CSS1Compat",
      dir: documentSeed.dir || "",
      title: documentSeed.title || "",
      designMode: documentSeed.designMode || "off",
      readyState: documentSeed.readyState || "complete",
      contentType: documentSeed.contentType || "text/html",
      inputEncoding: documentSeed.inputEncoding || "UTF-8",
      domain: documentSeed.domain || "example.invalid",
      characterSet: documentSeed.characterSet || "UTF-8",
      charset: documentSeed.charset || "UTF-8",
      hidden: documentSeed.hidden === true,
      visibilityState: documentSeed.visibilityState || "visible",
      cookie: typeof documentSeed.cookie === "string" ? documentSeed.cookie : (typeof seed.cookie === "string" ? seed.cookie : ""),
    },
    queryMap: clone(seed.queryMap || {}),
    ids: clone(seed.ids || {}),
    tags: clone(seed.tags || {}),
    specialCases: clone(seed.specialCases || {}),
  };
}

function renderDocumentPatch(seed) {
  const serializedSeed = JSON.stringify(seed, null, 2);
  return `(
function installDocumentModule(globalObject) {
  const seed = ${serializedSeed};
  const protector = globalObject.__envNativeProtector || null;

  function defineValue(target, key, value) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: value
    });
  }

  function defineGetter(target, key, getter, setter) {
    const descriptor = {
      configurable: true,
      enumerable: false,
      get: getter
    };
    if (typeof setter === "function") {
      descriptor.set = setter;
    }
    Object.defineProperty(target, key, descriptor);
    if (protector && protector.protectDescriptor) {
      protector.protectDescriptor(target, key);
    }
  }

  function applyEventTarget(target) {
    defineValue(target, "__listeners__", Object.create(null));
    defineValue(target, "addEventListener", function addEventListener(type, listener) {
      if (!this.__listeners__[type]) {
        this.__listeners__[type] = [];
      }
      this.__listeners__[type].push(listener);
    });
    defineValue(target, "removeEventListener", function removeEventListener(type, listener) {
      const list = this.__listeners__[type] || [];
      this.__listeners__[type] = list.filter(function filterItem(item) {
        return item !== listener;
      });
    });
    defineValue(target, "dispatchEvent", function dispatchEvent(event) {
      const list = (this.__listeners__[event.type] || []).slice();
      for (const listener of list) {
        listener.call(this, event);
      }
      const handler = this["on" + event.type];
      if (typeof handler === "function") {
        handler.call(this, event);
      }
      return true;
    });
  }

  function createElementNode(tagName) {
    const normalized = String(tagName || "div").toUpperCase();
    if (normalized === "CANVAS" && typeof globalObject.__envCreateCanvasElement === "function") {
      return globalObject.__envCreateCanvasElement();
    }
    const element = {
      nodeType: 1,
      nodeName: normalized,
      tagName: normalized,
      ownerDocument: null,
      style: {},
      dataset: {},
      children: [],
      childNodes: []
    };
    applyEventTarget(element);
    defineValue(element, "appendChild", function appendChild(child) {
      this.children.push(child);
      this.childNodes.push(child);
      child.parentNode = this;
      return child;
    });
    defineValue(element, "setAttribute", function setAttribute(name, value) {
      this[name] = String(value);
    });
    defineValue(element, "getAttribute", function getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this, name) ? this[name] : null;
    });
    return element;
  }

  function buildNodeMap(source, kind) {
    const out = Object.create(null);
    Object.keys(source || {}).forEach(function eachKey(key) {
      const value = source[key];
      if (Array.isArray(value)) {
        out[key] = value.map(function mapTag(tagName) {
          const node = createElementNode(tagName);
          node.ownerDocument = documentInstance;
          return node;
        });
      } else {
        const node = createElementNode(value || kind || "div");
        node.ownerDocument = documentInstance;
        out[key] = node;
      }
    });
    return out;
  }

  function Document() {}
  function HTMLDocument() {}
  HTMLDocument.prototype = Object.create(Document.prototype);
  defineValue(HTMLDocument.prototype, "constructor", HTMLDocument);

  const state = seed.document || {};
  const documentInstance = Object.create(HTMLDocument.prototype);
  let cookieValue = state.cookie || "";
  applyEventTarget(documentInstance);

  const queryNodes = buildNodeMap(seed.queryMap || {}, "div");
  const idNodes = buildNodeMap(seed.ids || {}, "div");
  const tagNodes = buildNodeMap(seed.tags || {}, "div");
  const htmlNode = createElementNode("html");
  const headNode = createElementNode("head");
  const bodyNode = createElementNode("body");
  htmlNode.ownerDocument = documentInstance;
  headNode.ownerDocument = documentInstance;
  bodyNode.ownerDocument = documentInstance;
  htmlNode.appendChild(headNode);
  htmlNode.appendChild(bodyNode);

  defineGetter(Document.prototype, "URL", function getURL() {
    return state.URL;
  });
  defineGetter(Document.prototype, "referrer", function getReferrer() {
    return state.referrer;
  });
  defineGetter(Document.prototype, "documentURI", function getDocumentURI() {
    return state.documentURI;
  });
  defineGetter(Document.prototype, "compatMode", function getCompatMode() {
    return state.compatMode;
  });
  defineGetter(Document.prototype, "dir", function getDir() {
    return state.dir;
  });
  defineGetter(Document.prototype, "title", function getTitle() {
    return state.title;
  }, function setTitle(value) {
    state.title = String(value);
  });
  defineGetter(Document.prototype, "designMode", function getDesignMode() {
    return state.designMode;
  }, function setDesignMode(value) {
    state.designMode = String(value);
  });
  defineGetter(Document.prototype, "readyState", function getReadyState() {
    return state.readyState;
  });
  defineGetter(Document.prototype, "contentType", function getContentType() {
    return state.contentType;
  });
  defineGetter(Document.prototype, "inputEncoding", function getInputEncoding() {
    return state.inputEncoding;
  });
  defineGetter(Document.prototype, "domain", function getDomain() {
    return state.domain;
  });
  defineGetter(Document.prototype, "characterSet", function getCharacterSet() {
    return state.characterSet;
  });
  defineGetter(Document.prototype, "charset", function getCharset() {
    return state.charset;
  });
  defineGetter(Document.prototype, "hidden", function getHidden() {
    return !!state.hidden;
  });
  defineGetter(Document.prototype, "visibilityState", function getVisibilityState() {
    return state.visibilityState;
  });
  defineGetter(Document.prototype, "cookie", function getCookie() {
    return cookieValue;
  }, function setCookie(value) {
    cookieValue = cookieValue ? cookieValue + "; " + String(value) : String(value);
  });
  defineGetter(Document.prototype, "head", function getHead() {
    return headNode;
  });
  defineGetter(Document.prototype, "body", function getBody() {
    return bodyNode;
  });
  defineGetter(Document.prototype, "documentElement", function getDocumentElement() {
    return htmlNode;
  });
  defineGetter(Document.prototype, "defaultView", function getDefaultView() {
    return globalObject;
  });

  defineValue(Document.prototype, "createElement", function createElement(tagName) {
    const element = createElementNode(tagName);
    element.ownerDocument = documentInstance;
    return element;
  });
  defineValue(Document.prototype, "querySelector", function querySelector(selector) {
    return queryNodes[selector] || null;
  });
  defineValue(Document.prototype, "getElementById", function getElementById(id) {
    return idNodes[id] || null;
  });
  defineValue(Document.prototype, "getElementsByTagName", function getElementsByTagName(tagName) {
    const key = String(tagName || "").toLowerCase();
    const list = tagNodes[key] || [];
    return list.slice();
  });

  const documentAllFallback = {
    length: 0,
    item: function item() {
      return null;
    },
    namedItem: function namedItem() {
      return null;
    }
  };
  defineGetter(Document.prototype, "all", function getAll() {
    return documentAllFallback;
  });

  if (protector && protector.repairFunctionMeta) {
    protector.repairFunctionMeta(Document, { name: "Document", length: 0 });
    protector.repairFunctionMeta(HTMLDocument, { name: "HTMLDocument", length: 0 });
    protector.repairFunctionMeta(Document.prototype.createElement, { name: "createElement", length: 1 });
    protector.repairFunctionMeta(Document.prototype.querySelector, { name: "querySelector", length: 1 });
    protector.repairFunctionMeta(Document.prototype.getElementById, { name: "getElementById", length: 1 });
    protector.repairFunctionMeta(Document.prototype.getElementsByTagName, { name: "getElementsByTagName", length: 1 });
  }
  if (protector && protector.protectFunction) {
    protector.protectFunction(Document, "Document");
    protector.protectFunction(HTMLDocument, "HTMLDocument");
    protector.protectFunction(Document.prototype.createElement, "createElement");
    protector.protectFunction(Document.prototype.querySelector, "querySelector");
    protector.protectFunction(Document.prototype.getElementById, "getElementById");
    protector.protectFunction(Document.prototype.getElementsByTagName, "getElementsByTagName");
  }

  Object.defineProperty(globalObject, "Document", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: Document
  });
  Object.defineProperty(globalObject, "HTMLDocument", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: HTMLDocument
  });
  Object.defineProperty(globalObject, "document", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: documentInstance
  });

  return documentInstance;
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
}

function buildDocumentModule(seed = {}) {
  const module = scaffoldModule("document-module");
  const normalizedSeed = normalizeDocumentSeed(seed);

  module.patchPlan = [
    "构建 Document / HTMLDocument 构造器、prototype 和 document 实例。",
    "把 document.cookie、URL、readyState 等高频字段补成访问器描述符。",
    "补出 createElement/querySelector/getElementById/getElementsByTagName，并为 canvas 入口预留到 fingerprint 模块的接线点。",
  ];
  module.patchCode = renderDocumentPatch(normalizedSeed);
  module.runtimeState = normalizedSeed;
  module.validation = [
    "检查 document.URL / document.documentURI / document.readyState。",
    "检查 document.cookie getter/setter 是否正常工作。",
    "检查 document.createElement('canvas') 是否能接到 fingerprint 模块。",
    "检查 querySelector / getElementById / getElementsByTagName 的基本返回。",
    "检查 document.all 仍被标注为特殊兼容风险，而不是宣称完全等价。",
  ];
  module.residualRisk = [
    "这里只覆盖静态 DOM 壳和常见查询入口，未实现完整 Node/Element/MutationObserver/CSSStyleDeclaration 系统。",
    "document.all 仅提供降级 fallback，无法在纯 JS 中完整等价原生特殊对象语义。",
  ];

  return module;
}

module.exports = {
  buildDocumentModule,
  normalizeDocumentSeed,
};
