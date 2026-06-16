const { TextEncoder, TextDecoder } = require("util");

if (typeof Symbol.dispose === "undefined") {
  Object.defineProperty(Symbol, "dispose", { value: Symbol("Symbol.dispose"), configurable: true });
}
if (typeof Symbol.asyncDispose === "undefined") {
  Object.defineProperty(Symbol, "asyncDispose", {
    value: Symbol("Symbol.asyncDispose"),
    configurable: true,
  });
}

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (typeof global.fetch === "undefined" && typeof fetch !== "undefined") {
  global.fetch = fetch;
}
if (typeof global.Request === "undefined" && typeof Request !== "undefined") {
  global.Request = Request;
}
if (typeof global.Response === "undefined" && typeof Response !== "undefined") {
  global.Response = Response;
}
if (typeof global.Headers === "undefined" && typeof Headers !== "undefined") {
  global.Headers = Headers;
}
global.structuredClone =
  global.structuredClone ||
  globalThis.structuredClone ||
  ((val) => JSON.parse(JSON.stringify(val)));

// Polyfill browser classes needed by Angular decorator metadata under Node/JSDOM
global.ClipboardEvent = global.ClipboardEvent || class ClipboardEvent {};
global.DragEvent = global.DragEvent || class DragEvent {};
global.TouchEvent = global.TouchEvent || class TouchEvent {};
global.TransitionEvent = global.TransitionEvent || class TransitionEvent {};
global.AnimationEvent = global.AnimationEvent || class AnimationEvent {};
global.WheelEvent = global.WheelEvent || class WheelEvent {};
global.PointerEvent = global.PointerEvent || class PointerEvent {};
