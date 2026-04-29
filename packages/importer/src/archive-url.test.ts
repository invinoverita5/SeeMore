import { describe, expect, it } from "vitest";

import { parseMonthlyArchiveUrl, parseMonthlyArchiveUrls } from "./archive-url.js";

describe("archive URL parsing", () => {
  it("parses documented Chess.com monthly archive URLs", () => {
    expect(parseMonthlyArchiveUrl("https://api.chess.com/pub/player/TestUser/games/2024/01", "testuser")).toEqual({
      url: "https://api.chess.com/pub/player/TestUser/games/2024/01",
      year: 2024,
      month: 1
    });
  });

  it.each([
    "https://example.com/pub/player/testuser/games/2024/01",
    "https://api.chess.com/pub/player/otheruser/games/2024/01",
    "https://api.chess.com/pub/player/testuser/games/2006/01",
    "https://api.chess.com/pub/player/testuser/games/2024/13",
    "https://api.chess.com/pub/player/testuser",
    "not a url"
  ])("rejects unsupported archive URL %s", (archiveUrl) => {
    expect(parseMonthlyArchiveUrl(archiveUrl, "testuser")).toBeNull();
  });

  it("preserves listed archive order while skipping malformed URLs and duplicate months", () => {
    const parsed = parseMonthlyArchiveUrls(
      [
        "https://api.chess.com/pub/player/testuser/games/2024/02",
        "https://api.chess.com/pub/player/testuser/games/2024/01",
        "https://api.chess.com/pub/player/testuser/games/2024/01",
        "https://example.com/pub/player/testuser/games/2024/03"
      ],
      "testuser"
    );

    expect(parsed.archiveMonths).toEqual([
      {
        url: "https://api.chess.com/pub/player/testuser/games/2024/02",
        year: 2024,
        month: 2
      },
      {
        url: "https://api.chess.com/pub/player/testuser/games/2024/01",
        year: 2024,
        month: 1
      }
    ]);
    expect(parsed.skippedArchiveUrls).toEqual(["https://example.com/pub/player/testuser/games/2024/03"]);
  });
});
