import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameError } from "./username";

describe("username validation", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeUsername("  Word_Keeper  ")).toBe("word_keeper");
  });

  it("accepts permitted usernames", () => {
    expect(usernameError("word-keeper_2")).toBeUndefined();
  });

  it("rejects invalid usernames", () => {
    expect(usernameError("ab")).toBeDefined();
    expect(usernameError("word keeper")).toBeDefined();
    expect(usernameError("-wordkeeper")).toBeDefined();
  });
});
