import { describe, expect, it } from "vitest";
import { AppError } from "../src/app-error.js";

const createError = (overrides = {}) =>
  new AppError({
    code: "TEST_CODE",
    type: "test",
    level: "warn",
    messages: {
      user: { fa: "fa-user", en: "en-user" },
      original: { fa: "fa-original", en: "en-original" },
    },
    reason: "something happened",
    descriptions: ["first", "second"],
    service: { name: "svc", method: "call", operation: "op" },
    metadata: { traceId: "123", nested: { id: 1 } },
    breadcrumbs: [
      "simple breadcrumb",
      {
        message: { fa: "fa-msg", en: "en-msg" },
        category: "cat",
        level: "info",
        data: { value: 42 },
        timestamp: Date.now(),
      },
      null,
    ],
    causes: overrides.causes,
    originalError: overrides.originalError,
    timestamp: overrides.timestamp ?? new Date("2023-01-01T00:00:00Z"),
    stack: overrides.stack,
  });

describe("AppError", () => {
  it("normalizes string messages and creates frozen structures", () => {
    const error = new AppError({
      code: "CODE",
      type: "network",
      messages: "oops",
    });

    expect(error.messages.user.fa).toBe("oops");
    expect(error.messages.original.en).toBe("oops");
    expect(Object.isFrozen(error.messages)).toBe(true);
    expect(Object.isFrozen(error.messages.user)).toBe(true);
    expect(Object.isFrozen(error.messages.original)).toBe(true);
  });

  it("normalizes breadcrumbs and causes", () => {
    const nestedError = new AppError({
      code: "NESTED",
      type: "network",
      messages: {
        user: { en: "Nested" },
        original: { en: "Nested" },
      },
    });

    const nativeError = new Error("native cause");

    const error = createError({
      causes: [nestedError, nativeError, { message: "custom cause" }, undefined],
    });

    expect(error.breadcrumbs).toHaveLength(2);
    expect(error.breadcrumbs[0]).toMatchObject({
      message: { en: "simple breadcrumb", fa: "simple breadcrumb" },
      category: null,
    });
    expect(error.breadcrumbs[1]).toMatchObject({
      message: { en: "en-msg", fa: "fa-msg" },
      category: "cat",
      data: { value: 42 },
    });

    expect(error.causes).toHaveLength(3);
    expect(error.causes[0]).toBe(nestedError);
    expect(error.causes[1]).toMatchObject({
      name: nativeError.name,
      message: { en: "native cause", fa: "native cause" },
      stack: nativeError.stack,
    });
    expect(error.causes[2]).toMatchObject({
      message: { en: "custom cause", fa: "custom cause" },
    });
  });

  it("keeps primitive causes intact", () => {
    const error = createError({ causes: [42] });
    expect(error.causes).toEqual([42]);
  });

  it("respects explicit stack and timestamp", () => {
    const stackTrace = "Custom stack";
    const timestamp = "2024-05-05T12:00:00Z";

    const error = createError({ stack: stackTrace, timestamp });

    expect(error.stack).toBe(stackTrace);
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.timestamp.toISOString()).toBe("2024-05-05T12:00:00.000Z");
  });

  it("falls back to generating a stack when captureStackTrace is not available", () => {
    const originalCapture = Error.captureStackTrace;

    Error.captureStackTrace = undefined;

    const error = new AppError({
      code: "NO_CAPTURE",
      type: "unknown-type",
      messages: {
        user: { en: "Message" },
        original: { en: "Message" },
      },
    });

    expect(error.stack).toBeTruthy();
    Error.captureStackTrace = originalCapture;
  });

  it("provides serializable representations", () => {
    const original = new Error("boom");
    const error = createError({ originalError: original });

    const json = error.toJSON();
    expect(json).toMatchObject({
      name: "AppError",
      code: "TEST_CODE",
      level: "warn",
      service: { name: "svc", method: "call", operation: "op" },
      metadata: { traceId: "123", nested: { id: 1 } },
    });
    expect(json.timestamp).toBeInstanceOf(Date);

    expect(error.toString()).toBe("AppError(TEST_CODE): en-user");
  });

  it("defaults level to ERROR when type not mapped", () => {
    const error = new AppError({
      code: "NO_TYPE",
      type: "unknown-type",
      messages: {
        user: { en: "Message" },
        original: { en: "Message" },
      },
    });

    expect(error.level).toBe("error");
  });

  it("filters breadcrumbs without message and normalizes invalid timestamps", () => {
    const error = new AppError({
      code: "BREADCRUMB",
      type: "network",
      messages: {
        user: { fa: "مسیر" },
        original: { fa: "مسیر" },
      },
      breadcrumbs: [
        { category: "skip", message: null },
        { message: { fa: "فقط فارسی" }, timestamp: "invalid-date" },
      ],
    });

    expect(error.breadcrumbs).toHaveLength(1);
    expect(typeof error.breadcrumbs[0].timestamp).toBe("number");
  });

  it("falls back to available locales and defaults when messages are incomplete", () => {
    const faOnly = new AppError({
      code: "FA_ONLY",
      type: "unknown",
      messages: {
        user: { fa: "صرفاً فارسی" },
        original: { fa: "صرفاً فارسی" },
      },
    });
    expect(faOnly.message).toBe("صرفاً فارسی");

    const defaultMessages = new AppError({
      code: "DEFAULT_MSG",
      type: "unknown",
      messages: {},
    });
    expect(defaultMessages.message).toBe("An unexpected error occurred");
  });

  it("ignores non-array causes inputs", () => {
    const error = new AppError({
      code: "CAUSE_INPUT",
      type: "network",
      messages: {
        user: { en: "Cause" },
        original: { en: "Cause" },
      },
      causes: { message: "ignored" },
    });

    expect(error.causes).toEqual([]);
  });

  it("handles null breadcrumb collections", () => {
    const error = new AppError({
      code: "NULL_BREAD",
      type: "network",
      messages: {
        user: { en: "Breadcrumb" },
        original: { en: "Breadcrumb" },
      },
      breadcrumbs: null,
    });

    expect(error.breadcrumbs).toEqual([]);
  });
});
