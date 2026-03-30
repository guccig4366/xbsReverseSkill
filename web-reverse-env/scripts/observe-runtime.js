/*
Runtime observer template.
Derived from qxVm/catvm proxy ideas, but rewritten into a reusable logger that
aggregates missing paths, descriptor probes, and invocation traces.
*/

function createRuntimeObserver(config = {}) {
  const logs = [];
  const seen = new WeakMap();
  const maxDepth = config.maxDepth || 4;
  const logOpen = config.logOpen !== false;
  const skip = new Set(config.skip || ["toString", "__proto__"]);

  function record(type, path, detail) {
    const entry = { type, path, detail };
    logs.push(entry);
    if (logOpen) {
      console.log("[observer]", type, path, detail);
    }
    return entry;
  }

  function summarize() {
    const missingPaths = [];
    const descriptorAccess = [];
    const invocationErrors = [];
    const prototypeAccess = [];

    for (const log of logs) {
      if (log.type === "missing") {
        missingPaths.push(log.path);
      } else if (log.type === "descriptor") {
        descriptorAccess.push(log.path);
      } else if (log.type === "invoke-error") {
        invocationErrors.push(log.path);
      } else if (log.type === "prototype") {
        prototypeAccess.push(log.path);
      }
    }

    return {
      total: logs.length,
      missingPaths,
      descriptorAccess,
      invocationErrors,
      prototypeAccess,
      logs,
    };
  }

  function wrap(target, name = "root", depth = 0) {
    if (!target || (typeof target !== "object" && typeof target !== "function")) {
      return target;
    }
    if (seen.has(target)) {
      return seen.get(target);
    }
    if (depth > maxDepth) {
      return target;
    }

    const proxy = new Proxy(target, {
      get(t, key, receiver) {
        const path = name + "." + String(key);
        let value;
        try {
          value = Reflect.get(t, key, receiver);
        } catch (err) {
          record("invoke-error", path, err && err.message ? err.message : String(err));
          throw err;
        }

        if (!skip.has(String(key))) {
          if (typeof value === "undefined") {
            record("missing", path, "undefined");
          } else {
            record("get", path, typeof value);
          }
        }

        if (value && (typeof value === "object" || typeof value === "function")) {
          return wrap(value, path, depth + 1);
        }
        return value;
      },
      set(t, key, value, receiver) {
        const path = name + "." + String(key);
        record("set", path, typeof value);
        return Reflect.set(t, key, value, receiver);
      },
      has(t, key) {
        const path = name + "." + String(key);
        record("has", path, Reflect.has(t, key));
        return Reflect.has(t, key);
      },
      deleteProperty(t, key) {
        const path = name + "." + String(key);
        record("delete", path, true);
        return Reflect.deleteProperty(t, key);
      },
      getOwnPropertyDescriptor(t, key) {
        const path = name + "." + String(key);
        const result = Reflect.getOwnPropertyDescriptor(t, key);
        record("descriptor", path, result ? Object.keys(result) : null);
        return result;
      },
      defineProperty(t, key, attrs) {
        const path = name + "." + String(key);
        record("define", path, Object.keys(attrs || {}));
        return Reflect.defineProperty(t, key, attrs);
      },
      getPrototypeOf(t) {
        record("prototype", name, "getPrototypeOf");
        return Reflect.getPrototypeOf(t);
      },
      setPrototypeOf(t, proto) {
        record("prototype", name, "setPrototypeOf");
        return Reflect.setPrototypeOf(t, proto);
      },
      ownKeys(t) {
        record("ownKeys", name, Reflect.ownKeys(t));
        return Reflect.ownKeys(t);
      },
      isExtensible(t) {
        record("isExtensible", name, Reflect.isExtensible(t));
        return Reflect.isExtensible(t);
      },
      preventExtensions(t) {
        record("preventExtensions", name, true);
        return Reflect.preventExtensions(t);
      },
      apply(t, thisArg, args) {
        record("apply", name, args);
        return Reflect.apply(t, thisArg, args);
      },
      construct(t, args, newTarget) {
        record("construct", name, args);
        return Reflect.construct(t, args, newTarget);
      },
    });

    seen.set(target, proxy);
    return proxy;
  }

  return {
    wrap,
    summarize,
    logs,
  };
}

module.exports = {
  createRuntimeObserver,
};
