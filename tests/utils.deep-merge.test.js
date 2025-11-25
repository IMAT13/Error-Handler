import { describe, expect, it } from "vitest";
import { deepMerge } from "../src/utils/deep-merge.js";

describe("deepMerge", () => {
  it("merges nested objects recursively", () => {
    const target = {
      level1: {
        value: 1,
        level2: {
          keep: true,
        },
      },
      array: [1, 2],
    };

    const source = {
      level1: {
        level2: {
          keep: false,
          next: "added",
        },
      },
      array: [3],
      extra: { flag: true },
    };

    const result = deepMerge(target, source);

    expect(result.level1.level2).toEqual({ keep: false, next: "added" });
    expect(result.array).toEqual([1, 2, 3]);
    expect(result.extra).toEqual({ flag: true });
  });

  it("replaces non-object sources and clones objects", () => {
    const mergedPrimitive = deepMerge({ existing: true }, "value");
    expect(mergedPrimitive).toBe("value");

    const source = { nested: { id: 1 } };
    const merged = deepMerge({}, source);
    expect(merged).toEqual(source);
    expect(merged).not.toBe(source);
    expect(merged.nested).not.toBe(source.nested);
  });

  it("overwrites when array shapes differ", () => {
    const result = deepMerge({ items: [1, 2] }, { items: { value: 3 } });
    expect(result.items).toEqual({ value: 3 });
  });
});
