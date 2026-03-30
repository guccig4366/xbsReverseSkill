/*
Native protection template.
Derived from qxVm/catvm safe-function patterns and normalized into a reusable
module for protecting functions, getters, and setters.
*/

function installNativeProtector() {
  const rawToString = Function.toString;
  const nativeSymbol = Symbol("native_toString_" + Math.random().toString(36).slice(2));

  function defineHidden(target, key, value) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      writable: true,
      value,
    });
  }

  function markNative(fn, displayName) {
    if (typeof fn !== "function") {
      return fn;
    }
    const name = displayName || fn.name || "";
    defineHidden(fn, nativeSymbol, "function " + name + "() { [native code] }");
    return fn;
  }

  function protectedToString() {
    if (typeof this === "function" && this[nativeSymbol]) {
      return this[nativeSymbol];
    }
    return rawToString.call(this);
  }

  defineHidden(Function.prototype, "toString", protectedToString);
  defineHidden(Function, "toString", protectedToString);
  markNative(Function.prototype.toString, "toString");

  function protectFunction(fn, displayName) {
    return markNative(fn, displayName);
  }

  function protectDescriptor(target, key) {
    const desc = Object.getOwnPropertyDescriptor(target, key);
    if (!desc) {
      return false;
    }
    if (typeof desc.get === "function") {
      markNative(desc.get, "get " + key);
    }
    if (typeof desc.set === "function") {
      markNative(desc.set, "set " + key);
    }
    if (typeof desc.value === "function") {
      markNative(desc.value, desc.value.name || key);
    }
    return true;
  }

  function repairFunctionMeta(fn, meta = {}) {
    if (typeof fn !== "function") {
      return fn;
    }
    if (Object.prototype.hasOwnProperty.call(meta, "name")) {
      Object.defineProperty(fn, "name", {
        configurable: true,
        enumerable: false,
        writable: false,
        value: meta.name,
      });
    }
    if (Object.prototype.hasOwnProperty.call(meta, "length")) {
      Object.defineProperty(fn, "length", {
        configurable: true,
        enumerable: false,
        writable: false,
        value: meta.length,
      });
    }
    return fn;
  }

  return {
    nativeSymbol,
    protectFunction,
    protectDescriptor,
    repairFunctionMeta,
  };
}

module.exports = {
  installNativeProtector,
};
