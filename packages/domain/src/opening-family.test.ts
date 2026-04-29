import { describe, expect, it } from "vitest";

import { openingNameFromUrl, toOpeningFamily } from "./opening-family.js";

describe("opening family mapping", () => {
  it("turns Chess.com opening URLs into readable names", () => {
    expect(openingNameFromUrl("https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation")).toBe(
      "Sicilian Defense Najdorf Variation"
    );
  });

  it("reduces detailed variations to broad opening families", () => {
    expect(toOpeningFamily("Sicilian Defense Najdorf Variation")).toBe("Sicilian Defense");
    expect(toOpeningFamily("Queen's Gambit Declined: Albin Countergambit")).toBe("Queen's Gambit");
    expect(toOpeningFamily("Italian Game: Two Knights Defense")).toBe("Italian Game");
  });
});

