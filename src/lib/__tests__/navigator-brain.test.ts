import { describe, it, expect } from "vitest";
import { navigatorReply, NAVIGATOR_INTRO } from "../navigator-brain";

describe("navigatorReply", () => {
  it("introduces itself on a greeting", () => {
    expect(navigatorReply("Hello")).toBe(NAVIGATOR_INTRO);
    expect(navigatorReply("hey there")).toBe(NAVIGATOR_INTRO);
  });

  it("answers questions about Homer", () => {
    const reply = navigatorReply("Who was Homer, the ancient poet?");
    expect(reply).toMatch(/Homer/);
    expect(reply).toMatch(/Iliad|Odyssey/);
  });

  it("discusses themes when asked about homecoming", () => {
    const reply = navigatorReply("Why does homecoming matter as a theme?");
    expect(reply).toMatch(/nostos/i);
  });

  it("talks about Nolan's craft", () => {
    const reply = navigatorReply("Tell me about Nolan's filmmaking style");
    expect(reply).toMatch(/IMAX|practical/);
  });

  it("deflects spoiler requests", () => {
    const reply = navigatorReply("What happens in the ending? Any spoilers?");
    expect(reply.toLowerCase()).toContain("spoiler");
    expect(reply).not.toMatch(/plot twist|dies|reveal that/i);
  });

  it("offers conversation prompts", () => {
    const reply = navigatorReply("Give me some questions to discuss with friends");
    expect(reply).toMatch(/\(1\)/);
  });

  it("falls back gracefully on unrelated input", () => {
    const reply = navigatorReply("qwertyuiop zxcvbnm");
    expect(reply).toMatch(/beyond my charts/);
  });

  it("falls back on empty input", () => {
    expect(navigatorReply("   ")).toMatch(/beyond my charts/);
  });
});
