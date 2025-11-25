import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/app-error.js";
import { errorHandlerPlugin } from "../src/plugins/vue.js";

const createFakeAppError = (payload) => ({ ...payload, toJSON: () => payload });

describe("errorHandlerPlugin", () => {
  let originalAddEventListener;
  let listeners;
  let app;
  let onError;
  let installPlugin;

  const trigger = (type, event, predicate = () => true) => {
    const handlers = listeners.get(type) ?? [];
    if (!handlers.length) throw new Error(`Listener for ${type} not registered.`);
    handlers.filter(predicate).forEach(({ handler }) => handler(event));
  };

  beforeEach(() => {
    listeners = new Map();
    onError = vi.fn();
    app = { config: { errorHandler: vi.fn() } };
    originalAddEventListener = window.addEventListener;

    window.addEventListener = vi.fn((type, handler, options) => {
      const list = listeners.get(type) ?? [];
      list.push({ handler, options });
      listeners.set(type, list);
    });

    installPlugin = (options = {}) => {
      const plugin = errorHandlerPlugin({
        messages: {
          unhandledRejection: "Unhandled rejection",
          rejectionHandled: "Rejection handled",
          resourceLoad: "Resource failed",
          uncaughtException: "Uncaught exception",
          vueError: "Vue component error",
        },
        preventDefault: true,
        ...options,
      });

      plugin.install(app);
      return plugin;
    };
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("captures unhandled rejections and prevents default", () => {
    AppError.unknown = vi.fn((payload) => createFakeAppError(payload));
    installPlugin({ onError });

    const preventDefault = vi.fn();
    const reason = new Error("promise boom");

    trigger("unhandledrejection", { reason, type: "unhandledrejection", preventDefault });

    expect(AppError.unknown).toHaveBeenCalledWith(
      expect.objectContaining({ code: "UNHANDLED_REJECTION", originalError: reason }),
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "UNHANDLED_REJECTION" }));
    expect(preventDefault).toHaveBeenCalled();
  });

  it("captures handled rejections", () => {
    AppError.unknown = vi.fn((payload) => createFakeAppError(payload));
    installPlugin({ onError });

    const reason = "handled";

    trigger("rejectionhandled", { reason, type: "rejectionhandled", preventDefault: vi.fn() });

    expect(AppError.unknown).toHaveBeenCalledWith(expect.objectContaining({ code: "REJECTION_HANDLED" }));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "REJECTION_HANDLED" }));
  });

  it("captures resource loading errors", () => {
    AppError.unknown = vi.fn((payload) => createFakeAppError(payload));
    installPlugin({ onError });

    const target = { tagName: "IMG", currentSrc: "image.png" };
    const preventDefault = vi.fn();

    trigger(
      "error",
      {
        type: "error",
        target,
        preventDefault,
        error: undefined,
      },
      ({ options }) => options === true,
    );

    expect(AppError.unknown).toHaveBeenCalledWith(expect.objectContaining({ code: "RESOURCE_LOAD_ERROR" }));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "RESOURCE_LOAD_ERROR" }));
    expect(preventDefault).toHaveBeenCalled();
  });

  it("filters resource elements in the global error listener", () => {
    AppError.unknown = vi.fn((payload) => createFakeAppError(payload));
    installPlugin({ onError });

    const preventDefault = vi.fn();

    trigger(
      "error",
      {
        type: "error",
        target: { tagName: "SCRIPT", src: "test.js" },
        preventDefault,
      },
      ({ options }) => options !== true,
    );

    expect(AppError.unknown).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("captures global errors without treating them as resource errors", () => {
    AppError.unknown = vi.fn((payload) => createFakeAppError(payload));
    installPlugin({ onError });

    const preventDefault = vi.fn();
    const originalError = new Error("boom");

    trigger(
      "error",
      {
        type: "error",
        target: window,
        preventDefault,
        error: originalError,
        message: originalError.message,
        filename: "file.js",
      },
      ({ options }) => options !== true,
    );

    expect(AppError.unknown).toHaveBeenCalledWith(
      expect.objectContaining({ code: "UNCAUGHT_EXCEPTION", originalError }),
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "UNCAUGHT_EXCEPTION" }));
  });

  it("logs via the default onError handler when running in dev", () => {
    vi.stubEnv("DEV", "true");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    AppError.unknown = vi.fn((payload) => createFakeAppError({ ...payload, code: "DEFAULT" }));
    installPlugin();

    trigger("unhandledrejection", { reason: "oops", type: "unhandledrejection", preventDefault: vi.fn() });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[error-handler] Captured unhandled error:",
      expect.objectContaining({ code: "DEFAULT" }),
    );
  });

  it("wraps Vue error handler and forwards to previous handler", () => {
    AppError.unknown = vi.fn((payload) => createFakeAppError(payload));
    const previousHandler = vi.fn();
    app = { config: { errorHandler: previousHandler } };

    window.addEventListener = vi.fn();
    installPlugin({ onError });

    const componentError = new Error("component failed");
    app.config.errorHandler(componentError, { type: { name: "MyComponent" } }, "render");

    expect(AppError.unknown).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VUE_COMPONENT_ERROR", originalError: componentError }),
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "VUE_COMPONENT_ERROR" }));
    expect(previousHandler).toHaveBeenCalledWith(componentError, { type: { name: "MyComponent" } }, "render");
  });

  it("supports disabling capture hooks via configuration", () => {
    const originalHandler = app.config.errorHandler;
    AppError.unknown = vi.fn((payload) => createFakeAppError(payload));
    installPlugin({
      onError,
      capture: {
        unhandledRejection: false,
        rejectionHandled: false,
        resourceError: false,
        globalError: false,
        vueError: false,
      },
    });

    expect(listeners.size).toBe(0);
    expect(app.config.errorHandler).toBe(originalHandler);
  });

  it("merges preventDefault maps when an object is provided", () => {
    AppError.unknown = vi.fn((payload) => createFakeAppError(payload));
    installPlugin({ onError, preventDefault: { globalError: false, resourceError: true } });

    const resourcePrevent = vi.fn();
    trigger(
      "error",
      {
        type: "error",
        target: { tagName: "IMG", currentSrc: "image.png" },
        preventDefault: resourcePrevent,
      },
      ({ options }) => options === true,
    );
    expect(resourcePrevent).toHaveBeenCalled();

    const globalPrevent = vi.fn();
    trigger(
      "error",
      {
        type: "error",
        target: window,
        preventDefault: globalPrevent,
        error: new Error("boom"),
        message: "boom",
      },
      ({ options }) => options !== true,
    );
    expect(globalPrevent).not.toHaveBeenCalled();
  });
});
