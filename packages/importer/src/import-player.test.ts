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
import { describe, expect, it } from "vitest";

import { importChessComPlayer } from "./import-player.js";
import type { ChessComImportClient, ImportProgressEvent } from "./types.js";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../tests/fixtures/chesscom");

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

describe("importChessComPlayer", () => {
  it("fetches player data and monthly archives sequentially before normalizing supported games", async () => {
    const client = createMockClient();
    const events: ImportProgressEvent[] = [];

    const result = await importChessComPlayer(client, " TestUser ", {
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
    expect(result.username).toBe("testuser");
    expect(result.profile.username).toBe("TestUser");
    expect(result.archives).toHaveLength(2);
    expect(result.archives.map((archive) => `${archive.year}-${archive.month}:${archive.gameCount}`)).toEqual([
      "2024-1:4",
      "2024-2:0"
    ]);
    expect(result.records).toHaveLength(3);
    expect(result.skippedGames).toBe(1);
    expect(result.skippedArchiveUrls).toEqual(["https://api.chess.com/pub/player/otheruser/games/2024/03"]);
    expect(result.records.map((record) => record.gameUrl)).toEqual([
      "https://www.chess.com/game/live/1001",
      "https://www.chess.com/game/live/1002",
      "https://www.chess.com/game/daily/1003"
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
  });

  it("throws when a required provider response has no data", async () => {
    const client = createMockClient();
    client.getPlayerProfile = async () => ({
      status: 304,
      data: null,
      metadata: metadata("https://api.chess.com/pub/player/testuser")
    });

    await expect(importChessComPlayer(client, "testuser")).rejects.toThrow(
      "Chess.com profile response did not include data."
    );
  });
});

