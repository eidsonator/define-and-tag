import { describe, expect, it } from "vitest";

import { fuzzyRank, fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  it("handles empty queries and case-insensitive exact, prefix, and substring matches", () => {
    expect(fuzzyScore("apple", "   ")).toBe(0);
    expect(fuzzyScore("Apple", "APPLE")).toBe(1000);
    expect(fuzzyScore("apple", "app")).toBe(798);
    expect(fuzzyScore("apple", "ppl")).toBe(598);
  });

  it("scores ordered subsequences and rewards consecutive matches", () => {
    expect(fuzzyScore("cartwheel", "cat")).toBe(307);
  });

  it("does not score a candidate with no matching characters", () => {
    expect(fuzzyScore("apple", "zz")).toBe(0);
  });

  it("stops scoring after repeated misses exhaust the score", () => {
    expect(fuzzyScore("apple", "zzzzz")).toBe(0);
  });
});

describe("fuzzyRank", () => {
  const words = ["apple", "application", "pineapple", "banana", "apricot"];

  it("returns no results for blank queries", () => {
    expect(fuzzyRank(words, "  ", (word) => word)).toEqual([]);
  });

  it("orders matches by score and respects the result limit", () => {
    expect(fuzzyRank(words, "app", (word) => word, 2)).toEqual(["apple", "application"]);
  });

  it("filters candidates below the relevance threshold", () => {
    expect(fuzzyRank(words, "zz", (word) => word)).toEqual([]);
  });

  it("accepts a key function for object collections", () => {
    const entries = [{ word: "banana" }, { word: "bandana" }, { word: "cabana" }];

    expect(fuzzyRank(entries, "ban", (entry) => entry.word)).toEqual([
      { word: "banana" },
      { word: "bandana" },
      { word: "cabana" },
    ]);
  });
});
