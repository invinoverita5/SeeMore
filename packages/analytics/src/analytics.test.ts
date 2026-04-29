import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeChessComGame, type ChessComGame, type NormalizedGameRecord } from "@chessinsights/domain";
import { describe, expect, it } from "vitest";

import { buildOpeningSummary } from "./openings.js";
import { buildOpponentRatingBuckets } from "./opponent-buckets.js";
import { buildRatingTimeline } from "./rating-timeline.js";
import { buildResultBreakdown } from "./results.js";
import { buildTimeClassBreakdown, getMostPlayedTimeClass } from "./time-classes.js";

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../tests/fixtures/chesscom/monthly-games.json"
);

interface MonthlyGamesFixture {
  readonly games: ChessComGame[];
}

const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as MonthlyGamesFixture;

function normalizedFixtureRecords(): NormalizedGameRecord[] {
  return fixture.games
    .map((game) => normalizeChessComGame(game, "testuser"))
    .filter((record): record is NormalizedGameRecord => record !== null);
}

describe("analytics aggregations", () => {
  it("builds result breakdown counts and percentages", () => {
    expect(buildResultBreakdown(normalizedFixtureRecords())).toEqual({
      total: 3,
      win: 1,
      loss: 1,
      draw: 1,
      percentages: {
        win: 33.3,
        loss: 33.3,
        draw: 33.3
      }
    });
  });

  it("filters result breakdowns by time class", () => {
    expect(buildResultBreakdown(normalizedFixtureRecords(), { timeClass: "rapid" })).toEqual({
      total: 1,
      win: 0,
      loss: 1,
      draw: 0,
      percentages: {
        win: 0,
        loss: 100,
        draw: 0
      }
    });
  });

  it("selects the most-played time class with deterministic tie-breaking", () => {
    expect(getMostPlayedTimeClass(normalizedFixtureRecords())).toBe("blitz");
    expect(getMostPlayedTimeClass([])).toBeNull();
  });

  it("builds time-class breakdowns in chart order", () => {
    expect(buildTimeClassBreakdown(normalizedFixtureRecords())).toEqual([
      {
        timeClass: "bullet",
        total: 0,
        percentage: 0
      },
      {
        timeClass: "blitz",
        total: 1,
        percentage: 33.3
      },
      {
        timeClass: "rapid",
        total: 1,
        percentage: 33.3
      },
      {
        timeClass: "daily",
        total: 1,
        percentage: 33.3
      }
    ]);
  });

  it("builds a rating timeline sorted by played date", () => {
    expect(buildRatingTimeline(normalizedFixtureRecords())).toEqual([
      {
        playedAt: "2024-01-15T08:26:40.000Z",
        rating: 1350,
        gameUrl: "https://www.chess.com/game/live/1001",
        timeClass: "blitz"
      },
      {
        playedAt: "2024-01-16T18:44:11.000Z",
        rating: 1402,
        gameUrl: "https://www.chess.com/game/live/1002",
        timeClass: "rapid"
      },
      {
        playedAt: "2024-01-17T12:00:00.000Z",
        rating: 1510,
        gameUrl: "https://www.chess.com/game/daily/1003",
        timeClass: "daily"
      }
    ]);
  });

  it("filters rating timelines by time class", () => {
    expect(buildRatingTimeline(normalizedFixtureRecords(), { timeClass: "blitz" })).toEqual([
      {
        playedAt: "2024-01-15T08:26:40.000Z",
        rating: 1350,
        gameUrl: "https://www.chess.com/game/live/1001",
        timeClass: "blitz"
      }
    ]);
  });

  it("groups opponent ratings into deterministic buckets", () => {
    expect(buildOpponentRatingBuckets(normalizedFixtureRecords())).toEqual({
      skippedGames: 0,
      buckets: [
        {
          start: 1200,
          end: 1299,
          label: "1200-1299",
          counts: {
            total: 1,
            win: 1,
            loss: 0,
            draw: 0
          },
          percentages: {
            win: 100,
            loss: 0,
            draw: 0
          }
        },
        {
          start: 1400,
          end: 1499,
          label: "1400-1499",
          counts: {
            total: 2,
            win: 0,
            loss: 1,
            draw: 1
          },
          percentages: {
            win: 0,
            loss: 50,
            draw: 50
          }
        }
      ]
    });
  });

  it("tracks skipped games with missing opponent ratings", () => {
    const [firstRecord] = normalizedFixtureRecords();

    if (firstRecord === undefined) {
      throw new Error("Expected fixture record");
    }

    expect(
      buildOpponentRatingBuckets([
        {
          ...firstRecord,
          opponentRating: null
        }
      ])
    ).toEqual({
      buckets: [],
      skippedGames: 1
    });
  });

  it("rejects invalid opponent bucket sizes", () => {
    expect(() => buildOpponentRatingBuckets(normalizedFixtureRecords(), { bucketSize: 0 })).toThrow(TypeError);
  });

  it("builds opening-family summaries for stacked chart data", () => {
    expect(buildOpeningSummary(normalizedFixtureRecords())).toEqual([
      {
        openingFamily: "Italian Game",
        counts: {
          total: 1,
          win: 0,
          loss: 1,
          draw: 0
        },
        percentages: {
          win: 0,
          loss: 100,
          draw: 0
        }
      },
      {
        openingFamily: "Queen's Pawn Opening",
        counts: {
          total: 1,
          win: 0,
          loss: 0,
          draw: 1
        },
        percentages: {
          win: 0,
          loss: 0,
          draw: 100
        }
      },
      {
        openingFamily: "Sicilian Defense",
        counts: {
          total: 1,
          win: 1,
          loss: 0,
          draw: 0
        },
        percentages: {
          win: 100,
          loss: 0,
          draw: 0
        }
      }
    ]);
  });

  it("supports opening summary limits and time-class filters", () => {
    expect(buildOpeningSummary(normalizedFixtureRecords(), { limit: 1, timeClass: "blitz" })).toEqual([
      {
        openingFamily: "Sicilian Defense",
        counts: {
          total: 1,
          win: 1,
          loss: 0,
          draw: 0
        },
        percentages: {
          win: 100,
          loss: 0,
          draw: 0
        }
      }
    ]);
  });

  it("rejects invalid opening summary limits", () => {
    expect(() => buildOpeningSummary(normalizedFixtureRecords(), { limit: -1 })).toThrow(TypeError);
  });
});

