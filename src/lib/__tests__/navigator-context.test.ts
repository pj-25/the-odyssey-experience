import { describe, it, expect } from "vitest";
import {
  navigatorReply,
  nearestSecret,
  hintReply,
  journeyReply,
  type NavigatorContext,
} from "../navigator-brain";
import { FRAGMENT_COUNT, getPoi } from "../world";

function ctx(overrides: Partial<NavigatorContext> = {}): NavigatorContext {
  return {
    shipX: 0,
    shipZ: 20,
    discoveredIds: [],
    fragments: 0,
    stormNearby: false,
    beaconLit: false,
    ...overrides,
  };
}

describe("nearestSecret", () => {
  it("never proposes home or the hidden city with an unfinished chart", () => {
    const secret = nearestSecret(ctx());
    expect(secret).toBeDefined();
    expect(secret!.id).not.toBe("harbor");
    expect(secret!.id).not.toBe("hiddenCity");
  });

  it("skips discovered places", () => {
    const first = nearestSecret(ctx())!;
    const second = nearestSecret(ctx({ discoveredIds: [first.id] }))!;
    expect(second.id).not.toBe(first.id);
  });

  it("reveals the hidden city once the chart is complete", () => {
    const all = ["cliffs", "temple", "cave", "beacon", "diveSite"];
    const secret = nearestSecret(
      ctx({ discoveredIds: all, fragments: FRAGMENT_COUNT }),
    );
    expect(secret?.id).toBe("hiddenCity");
  });

  it("returns nothing when everything is found", () => {
    const all = ["cliffs", "temple", "cave", "beacon", "diveSite", "hiddenCity"];
    expect(
      nearestSecret(ctx({ discoveredIds: all, fragments: FRAGMENT_COUNT })),
    ).toBeUndefined();
  });
});

describe("hintReply", () => {
  it("names a compass direction and a constellation", () => {
    const reply = hintReply(ctx());
    expect(reply).toMatch(/Steer (N|NE|E|SE|S|SW|W|NW)/);
    expect(reply).toMatch(/press C/);
  });

  it("sends a finished explorer home", () => {
    const all = ["cliffs", "temple", "cave", "beacon", "diveSite", "hiddenCity"];
    const reply = hintReply(ctx({ discoveredIds: all, fragments: FRAGMENT_COUNT }));
    expect(reply).toMatch(/no more blank spaces/i);
  });
});

describe("journeyReply", () => {
  it("acknowledges a blank log", () => {
    expect(journeyReply(ctx())).toMatch(/blank/i);
  });

  it("recounts discoveries and fragment progress", () => {
    const reply = journeyReply(
      ctx({ discoveredIds: ["cliffs", "cave"], fragments: 2 }),
    );
    expect(reply).toContain(getPoi("cliffs")!.title);
    expect(reply).toContain(`2 of ${FRAGMENT_COUNT}`);
  });
});

describe("navigatorReply with context", () => {
  it("answers 'where should I sail?' with a heading", () => {
    const reply = navigatorReply("Where should I sail?", ctx());
    expect(reply).toMatch(/Steer/);
  });

  it("adapts the storm answer to proximity", () => {
    const far = navigatorReply("tell me about the storm", ctx());
    const near = navigatorReply(
      "tell me about the storm",
      ctx({ stormNearby: true }),
    );
    expect(far).not.toBe(near);
    expect(near).toMatch(/feel it too/i);
  });

  it("still answers the knowledge base without context", () => {
    expect(navigatorReply("Who was Homer?")).toMatch(/Iliad/);
  });
});
