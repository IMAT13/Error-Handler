import { describe, expect, it } from "vitest";
import { AppError } from "../src/app-error.js";
import { ERROR_TYPES } from "../src/constants.js";
import ErrorFactory from "../src/helpers/factories.js";

describe("ErrorFactory", () => {
  it("creates network errors with normalized metadata", () => {
    const error = ErrorFactory.network({
      metadata: { url: "/api", method: "GET", status: 500, extra: "keep" },
      retryCount: 2,
      isOffline: true,
      breadcrumbs: "crumb",
    });

    expect(error).toBeInstanceOf(AppError);
    expect(error.type).toBe(ERROR_TYPES.NETWORK);
    expect(error.metadata).toMatchObject({
      url: "/api",
      method: "GET",
      status: 500,
      extra: "keep",
      retryCount: 2,
      isOffline: true,
    });
    expect(error.breadcrumbs).toHaveLength(1);
  });

  it("falls back when network metadata is not an object", () => {
    const error = ErrorFactory.network({ metadata: null });
    expect(error.metadata).toMatchObject({ retryCount: null, isOffline: false });
  });

  it("creates validation errors with fields and schema metadata", () => {
    const error = ErrorFactory.validation({ fields: "email", schema: "UserSchema" });
    expect(error.metadata).toEqual({ fields: ["email"], schema: "UserSchema" });
  });

  it("includes mapping metadata when provided", () => {
    const error = ErrorFactory.mapping({ source: "API", target: "UI", stage: "transform" });
    expect(error.metadata).toEqual({ source: "API", target: "UI", stage: "transform" });
  });

  it("captures permission details", () => {
    const error = ErrorFactory.permission({ resource: "document", action: "read", requiredRoles: ["admin"] });
    expect(error.metadata).toEqual({ resource: "document", action: "read", requiredRoles: ["admin"] });
  });

  it("captures component, environment, system, and feature metadata", () => {
    const component = ErrorFactory.component({
      componentName: "MyComponent",
      propsSnapshot: { foo: 1 },
      hook: "mounted",
    });
    expect(component.metadata).toEqual({
      componentName: "MyComponent",
      propsSnapshot: { foo: 1 },
      hook: "mounted",
    });

    const environment = ErrorFactory.environment({ variable: "API_URL", expected: "https://", received: "" });
    expect(environment.metadata).toEqual({ variable: "API_URL", expected: "https://", received: "" });

    const system = ErrorFactory.system({ subsystem: "storage" });
    expect(system.metadata).toEqual({ subsystem: "storage" });

    const feature = ErrorFactory.feature({ feature: "chat", flag: "chat_enabled", requiredVersion: "1.2.0" });
    expect(feature.metadata).toEqual({ feature: "chat", flag: "chat_enabled", requiredVersion: "1.2.0" });
  });

  it("enriches unknown errors from original error or fallback message", () => {
    const original = new Error("Something bad");
    const errorFromOriginal = ErrorFactory.unknown({ originalError: original });
    expect(errorFromOriginal.messages.user.en).toBe("Something bad");
    expect(errorFromOriginal.metadata.originalName).toBe("Error");

    const errorFromFallback = ErrorFactory.unknown({ fallbackMessage: "Custom message" });
    expect(errorFromFallback.messages.user.en).toBe("Custom message");

    const override = ErrorFactory.unknown({ messages: "Override", reason: "provided" });
    expect(override.messages.user.en).toBe("Override");
    expect(override.reason).toBe("provided");
  });

  it("uses default unknown messages when nothing is provided", () => {
    const error = ErrorFactory.unknown();
    expect(error.messages.user.en).toBeDefined();
    expect(error.reason).toBeNull();
  });

  it("exposes helper utilities", () => {
    expect(ErrorFactory.isAppError(ErrorFactory.system())).toBe(true);
    expect(ErrorFactory.Types).toHaveProperty("NETWORK", "network");
    expect(ErrorFactory.Levels).toHaveProperty("ERROR", "error");
  });

  it("applies optional parameters through the common options helper", () => {
    const timestamp = new Date("2024-01-01T00:00:00Z");
    const originalError = new Error("origin");
    const error = ErrorFactory.mapping({
      code: "CUSTOM_MAPPING",
      reason: "custom reason",
      level: ErrorFactory.Levels.DEBUG,
      descriptions: ["first"],
      metadata: { stage: "initial" },
      service: { name: "mapper", method: "transform" },
      breadcrumbs: "crumb",
      causes: [new Error("cause")],
      originalError,
      timestamp,
    });

    expect(error.reason).toBe("custom reason");
    expect(error.level).toBe(ErrorFactory.Levels.DEBUG);
    expect(error.descriptions).toEqual(["first"]);
    expect(error.service).toEqual({ name: "mapper", method: "transform", args: null, operation: null });
    expect(error.breadcrumbs).toHaveLength(1);
    expect(error.causes[0]).toMatchObject({
      message: { en: "cause", fa: "cause" },
    });
    expect(error.timestamp.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("respects metadata originalName overrides for unknown errors", () => {
    const error = ErrorFactory.unknown({ metadata: { originalName: "Custom" } });
    expect(error.metadata.originalName).toBe("Custom");
  });
});
