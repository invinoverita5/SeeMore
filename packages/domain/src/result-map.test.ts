import { describe, expect, it } from "vitest";

import { classifyEnding, mapResultCode } from "./result-map.js";

describe("result mapping", () => {
  it.each([
    [" WIN ", "win"],
    [" Resigned ", "loss"],
    [" Stalemate ", "draw"]
  ] as const)("normalizes %s before mapping", (resultCode, expectedResult) => {
    expect(mapResultCode(resultCode)).toBe(expectedResult);
  });

  it("keeps Chess.com wins as wins", () => {
    expect(mapResultCode("win")).toBe("win");
  });

  it.each(["checkmated", "resigned", "timeout", "abandoned", "lose"])(
    "maps %s as a loss",
    (resultCode) => {
      expect(mapResultCode(resultCode)).toBe("loss");
    }
  );

  it.each(["agreed", "stalemate", "repetition", "insufficient", "50move", "timevsinsufficient", "unknown"])(
    "maps %s as a draw",
    (resultCode) => {
      expect(mapResultCode(resultCode)).toBe("draw");
    }
  );

  it("classifies the concrete ending from either side of the game", () => {
    expect(classifyEnding("win", "resigned")).toBe("resignation");
    expect(classifyEnding("checkmated", "win")).toBe("checkmate");
    expect(classifyEnding("stalemate", "stalemate")).toBe("stalemate");
  });
});
