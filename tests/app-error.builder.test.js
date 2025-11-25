import { describe, expect, it } from "vitest";
import { createAppErrorBuilder } from "../src/app-error.builder.js";
import { AppError } from "../src/app-error.js";
import { ERROR_LEVELS, ERROR_TYPES } from "../src/constants.js";

describe("createAppErrorBuilder", () => {
  it("validates code and type inputs", () => {
    expect(() => createAppErrorBuilder({ code: "", type: ERROR_TYPES.NETWORK })).toThrow(/non-empty string/);
    expect(() => createAppErrorBuilder({ code: "CODE", type: "invalid" })).toThrow(/must be one of/);
  });

  it("allows customizing messages, metadata, and timestamps", () => {
    const builder = createAppErrorBuilder({ code: "NETWORK_TIMEOUT", type: ERROR_TYPES.NETWORK })
      .withMessages("Network down")
      .withReason("Timeout")
      .withLevel(ERROR_LEVELS.FATAL)
      .withService({ name: "http", method: "GET", args: ["/path"], operation: "request" })
      .withMetadata({ attempt: 1, context: { trace: "abc" }, tags: ["api"] })
      .withMetadata({ context: { user: "42" } })
      .withDescriptions("One liner")
      .withBreadcrumbs({ message: "First" })
      .withCauses([{ message: "root" }])
      .withOriginalError(new Error("boom"))
      .withTimestamp("2024-05-10T13:00:00Z");

    const error = builder.build();

    expect(error).toBeInstanceOf(AppError);
    expect(error.messages.user.fa).toBe("Network down");
    expect(error.level).toBe(ERROR_LEVELS.FATAL);
    expect(error.reason).toBe("Timeout");
    expect(error.metadata).toMatchObject({
      attempt: 1,
      context: { trace: "abc", user: "42" },
      tags: ["api"],
    });
    expect(error.timestamp.toISOString()).toBe("2024-05-10T13:00:00.000Z");
  });

  it("coerces unexpected message inputs to defaults", () => {
    const error = createAppErrorBuilder({ code: "ODD_INPUT", type: ERROR_TYPES.UNKNOWN })
      .withMessages(/** @type {any} */ (12345))
      .build();

    expect(error.messages.user.en).toBeDefined();
    expect(error.messages.original.en).toBeDefined();
  });

  it("ensures array coalescing helpers work", () => {
    const error = createAppErrorBuilder({ code: "VALIDATION_ERR", type: ERROR_TYPES.VALIDATION })
      .withDescriptions("single")
      .withBreadcrumbs("crumb")
      .withCauses({ message: "cause" })
      .build();

    expect(error.descriptions).toEqual(["single"]);
    expect(error.breadcrumbs).toHaveLength(1);
    expect(error.causes).toHaveLength(1);
  });

  it("validates level, metadata, reason, original error, and timestamp inputs", () => {
    const builder = createAppErrorBuilder({ code: "COMPONENT", type: ERROR_TYPES.COMPONENT });

    expect(() => builder.withLevel("nope")).toThrow(/must be one of/);
    expect(() => builder.withReason(12)).toThrow(/must be a string/);
    expect(() => builder.withMetadata(null)).toThrow(/must be an object/);
    expect(() => builder.withOriginalError({ message: "not error" })).toThrow(/instance of Error/);
    expect(() => builder.withTimestamp("invalid")).toThrow(/parsable date string/);
  });

  it("handles optional setters and object message overrides", () => {
    const builder = createAppErrorBuilder({ code: "OPTIONAL", type: ERROR_TYPES.FEATURE })
      .withMessages({ original: { en: "Original override" } })
      .withReason(null)
      .withDescriptions(undefined)
      .withBreadcrumbs(undefined)
      .withCauses(undefined)
      .withOriginalError(undefined);

    const error = builder.build();

    expect(error.messages.original.en).toBe("Original override");
    expect(error.messages.user.en).toBe("Original override");
    expect(error.reason).toBeNull();
    expect(error.descriptions).toEqual([]);
    expect(error.breadcrumbs).toEqual([]);
    expect(error.causes).toEqual([]);
  });
});
