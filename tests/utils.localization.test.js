import { describe, expect, it } from "vitest";
import { cloneLocalizedMessages, ensureLocalizedText } from "../src/utils/localization.js";

describe("localization utilities", () => {
  it("returns fallback when value is null", () => {
    const fallback = { fa: "fa", en: "en" };
    expect(ensureLocalizedText(null, fallback)).toEqual({ fa: "fa", en: "en" });
  });

  it("duplicates string inputs for both locales", () => {
    expect(ensureLocalizedText("test")).toEqual({ fa: "test", en: "test" });
  });

  it("resolves missing locales from provided object or fallback", () => {
    const value = { en: "only-en" };
    const fallback = { fa: "fallback-fa", en: "fallback-en" };
    expect(ensureLocalizedText(value, fallback)).toEqual({ fa: "only-en", en: "only-en" });
  });

  it("uses fallback when non-object values are provided", () => {
    const fallback = { fa: "fa-fallback", en: "en-fallback" };
    expect(ensureLocalizedText(123, fallback)).toEqual({ fa: "fa-fallback", en: "en-fallback" });
  });

  it("cloneLocalizedMessages clones user and original", () => {
    const cloned = cloneLocalizedMessages({
      user: { fa: "fa-user" },
      original: { en: "en-original" },
    });

    expect(cloned.user).toEqual({ fa: "fa-user", en: "fa-user" });
    expect(cloned.original).toEqual({ en: "en-original", fa: "en-original" });
    expect(cloned.user).not.toBe(cloned.original);
  });

  it("fills missing locales when only one is provided", () => {
    const value = { fa: "صرفاً فارسی" };
    expect(ensureLocalizedText(value)).toEqual({ fa: "صرفاً فارسی", en: "صرفاً فارسی" });
  });
});
