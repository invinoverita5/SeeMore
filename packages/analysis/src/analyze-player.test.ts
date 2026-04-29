import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ChessComArchives,
  ChessComMonthlyGames,
  ChessComProfile,
  ChessComStats,
  ProviderResponse,
  ProviderResponseMetadata
} from "@chessinsights/chesscom-client";
import type { ChessComImportClient, ImportProgressEvent } from "@chessinsights/importer";
import { describe, expect, it } from "vitest";

import { analyzeChessComPlayer } from "./index.js";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../tests/fixtures/chesscom");

describe("analyzeChessComPlayer", () => {
  it("imports a player through the injected client and returns dashboard-ready aggregates", async () => {
    const client = createMockClient();
    const events: ImportProgressEvent[] = [];

    const analysis = await analyzeChessComPlayer(client, " TestUser ", {
      onProgress(event) {
        events.push(event);
      }
    });

    expect(client.calls).toEqual([
      "profile:testuser",
      "stats:testuser",
      "archives:testuser",
      "monthly:testuser:2024:1",
      "monthly:testuser:2024:2"
    ]);
    expect(events.map((event) => event.type)).toEqual([
      "import_started",
      "profile_fetched",
      "stats_fetched",
      "archives_listed",
      "archive_fetched",
      "archive_fetched",
      "import_completed"
    ]);
    expect(analysis.username).toBe("testuser");
    expect(analysis.profile.username).toBe("TestUser");
    expect(analysis.importSummary).toEqual({
      archiveCount: 2,
      downloadedGameCount: 4,
      normalizedGameCount: 3,
      skippedArchiveUrls: ["https://api.chess.com/pub/player/otheruser/games/2024/03"],
      skippedGameCount: 1
    });
    expect(analysis.defaultTimeClass).toBe("blitz");
    expect(analysis.filters).toEqual({
      opponentRatingBucketSize: 100,
      openingLimit: 10,
      ratingTimeClass: "blitz",
      timeClass: null
    });
    expect(analysis.aggregates.results).toMatchObject({
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
    expect(analysis.aggregates.resultsByTimeClass.rapid).toMatchObject({
      total: 1,
      loss: 1
    });
    expect(analysis.aggregates.timeClasses).toEqual([
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
    expect(analysis.aggregates.ratingTimeline).toEqual({
      timeClass: "blitz",
      points: [
        {
          playedAt: "2024-01-15T08:26:40.000Z",
          rating: 1350,
          gameUrl: "https://www.chess.com/game/live/1001",
          timeClass: "blitz"
        }
      ]
    });
    expect(analysis.aggregates.opponentRatingBuckets).toMatchObject({
      skippedGames: 0,
      buckets: [
        {
          label: "1200-1299",
          counts: {
            total: 1,
            win: 1
          }
        },
        {
          label: "1400-1499",
          counts: {
            total: 2,
            loss: 1,
            draw: 1
          }
        }
      ]
    });
    expect(analysis.aggregates.openingSummary.map((entry) => entry.openingFamily)).toEqual([
      "Italian Game",
      "Queen's Pawn Opening",
      "Sicilian Defense"
    ]);
  });

  it("supports time-class filters and explicit rating timelines", async () => {
    const client = createMockClient();

    const analysis = await analyzeChessComPlayer(client, "testuser", {
      openingLimit: 1,
      ratingTimeClass: "rapid",
      timeClass: "rapid"
    });

    expect(analysis.filters).toEqual({
      opponentRatingBucketSize: 100,
      openingLimit: 1,
      ratingTimeClass: "rapid",
      timeClass: "rapid"
    });
    expect(analysis.aggregates.results).toMatchObject({
      total: 1,
      loss: 1
    });
    expect(analysis.aggregates.ratingTimeline.points).toEqual([
      {
        playedAt: "2024-01-16T18:44:11.000Z",
        rating: 1402,
        gameUrl: "https://www.chess.com/game/live/1002",
        timeClass: "rapid"
      }
    ]);
    expect(analysis.aggregates.openingSummary).toHaveLength(1);
    expect(analysis.aggregates.openingSummary[0]?.openingFamily).toBe("Italian Game");
  });
});

interface MockImportClient extends ChessComImportClient {
  readonly calls: string[];
}

function createMockClient(): MockImportClient {
  const profile = readFixture<ChessComProfile>("profile.json");
  const stats = readFixture<ChessComStats>("stats.json");
  const monthlyGames = readFixture<ChessComMonthlyGames>("monthly-games.json");
  const emptyMonthlyGames: ChessComMonthlyGames = {
    games: []
  };
  const archives: ChessComArchives = {
    archives: [
      "https://api.chess.com/pub/player/testuser/games/2024/01",
      "https://api.chess.com/pub/player/testuser/games/2024/02",
      "https://api.chess.com/pub/player/otheruser/games/2024/03"
    ]
  };
  const calls: string[] = [];

  return {
    calls,
    async getPlayerProfile(username) {
      calls.push(`profile:${username}`);
      return providerResponse(`https://api.chess.com/pub/player/${username}`, profile);
    },
    async getPlayerStats(username) {
      calls.push(`stats:${username}`);
      return providerResponse(`https://api.chess.com/pub/player/${username}/stats`, stats);
    },
    async getGameArchives(username) {
      calls.push(`archives:${username}`);
      return providerResponse(`https://api.chess.com/pub/player/${username}/games/archives`, archives);
    },
    async getMonthlyGames(username, year, month) {
      calls.push(`monthly:${username}:${year}:${month}`);
      const games = month === 1 ? monthlyGames : emptyMonthlyGames;

      return providerResponse(`https://api.chess.com/pub/player/${username}/games/${year}/${month}`, games);
    }
  };
}

function readFixture<TFixture>(fileName: string): TFixture {
  return JSON.parse(readFileSync(resolve(fixtureRoot, fileName), "utf8")) as TFixture;
}

function metadata(url: string): ProviderResponseMetadata {
  return {
    url,
    etag: null,
    lastModified: null,
    cacheControl: null,
    retryAfter: null
  };
}

function providerResponse<TData>(url: string, data: TData): ProviderResponse<TData> {
  return {
    status: 200,
    data,
    metadata: metadata(url)
  };
}
