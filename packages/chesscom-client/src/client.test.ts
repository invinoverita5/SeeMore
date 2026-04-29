import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createChessComClient } from "./client.js";
import type { ChessComFetch } from "./types.js";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../tests/fixtures/chesscom");

function readFixture<TFixture>(fileName: string): TFixture {
  return JSON.parse(readFileSync(resolve(fixtureRoot, fileName), "utf8")) as TFixture;
}

interface MockFetchCall {
  readonly input: string;
  readonly init: RequestInit | undefined;
}

function mockFetch(response: Response): { readonly calls: MockFetchCall[]; readonly fetch: ChessComFetch } {
  const calls: MockFetchCall[] = [];

  return {
    calls,
    fetch: async (input, init) => {
      calls.push({ input, init });
      return response;
    }
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    },
    ...init
  });
}

function headerValue(init: RequestInit | undefined, headerName: string): string | null {
  return new Headers(init?.headers).get(headerName);
}

describe("Chess.com PubAPI client", () => {
  it("fetches a player profile from the documented profile endpoint", async () => {
    const profile = readFixture("profile.json");
    const { calls, fetch } = mockFetch(
      jsonResponse(profile, {
        headers: {
          "Cache-Control": "public, max-age=43200",
          ETag: '"profile-etag"',
          "Last-Modified": "Wed, 01 Jan 2025 00:00:00 GMT"
        }
      })
    );
    const client = createChessComClient({ fetch, userAgent: "ChessInsightsTest/1.0" });

    const response = await client.getPlayerProfile(" TestUser ");

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      username: "TestUser",
      player_id: 12345
    });
    expect(response.metadata).toEqual({
      url: "https://api.chess.com/pub/player/testuser",
      etag: '"profile-etag"',
      lastModified: "Wed, 01 Jan 2025 00:00:00 GMT",
      cacheControl: "public, max-age=43200",
      retryAfter: null
    });
    expect(calls[0]?.input).toBe("https://api.chess.com/pub/player/testuser");
    expect(headerValue(calls[0]?.init, "Accept")).toBe("application/json");
    expect(headerValue(calls[0]?.init, "User-Agent")).toBe("ChessInsightsTest/1.0");
  });

  it("sends cache validators and returns 304 metadata without parsing JSON", async () => {
    const { calls, fetch } = mockFetch(
      new Response(null, {
        status: 304,
        headers: {
          ETag: '"same"',
          "Last-Modified": "Thu, 02 Jan 2025 00:00:00 GMT"
        }
      })
    );
    const client = createChessComClient({ fetch });

    const response = await client.getPlayerStats("testuser", {
      etag: '"same"',
      lastModified: "Thu, 02 Jan 2025 00:00:00 GMT"
    });

    expect(response).toMatchObject({
      status: 304,
      data: null,
      metadata: {
        url: "https://api.chess.com/pub/player/testuser/stats",
        etag: '"same"',
        lastModified: "Thu, 02 Jan 2025 00:00:00 GMT"
      }
    });
    expect(headerValue(calls[0]?.init, "If-None-Match")).toBe('"same"');
    expect(headerValue(calls[0]?.init, "If-Modified-Since")).toBe("Thu, 02 Jan 2025 00:00:00 GMT");
  });

  it("fetches stats, archives, and monthly game archives from documented paths", async () => {
    const stats = readFixture("stats.json");
    const archives = readFixture("archives.json");
    const monthlyGames = readFixture("monthly-games.json");
    const calls: MockFetchCall[] = [];
    const responses = [jsonResponse(stats), jsonResponse(archives), jsonResponse(monthlyGames)];
    const fetch: ChessComFetch = async (input, init) => {
      calls.push({ input, init });
      const response = responses.shift();

      if (response === undefined) {
        throw new Error("Unexpected extra fetch call");
      }

      return response;
    };
    const client = createChessComClient({ fetch });

    await expect(client.getPlayerStats("TestUser")).resolves.toMatchObject({ status: 200, data: stats });
    await expect(client.getGameArchives("TestUser")).resolves.toMatchObject({ status: 200, data: archives });
    await expect(client.getMonthlyGames("TestUser", 2024, 1)).resolves.toMatchObject({
      status: 200,
      data: monthlyGames
    });

    expect(calls.map((call) => call.input)).toEqual([
      "https://api.chess.com/pub/player/testuser/stats",
      "https://api.chess.com/pub/player/testuser/games/archives",
      "https://api.chess.com/pub/player/testuser/games/2024/01"
    ]);
  });

  it.each([
    [404, "not_found"],
    [410, "gone"],
    [429, "rate_limited"]
  ] as const)("throws typed provider errors for %s responses", async (status, kind) => {
    const { fetch } = mockFetch(
      new Response(JSON.stringify({ message: "provider error" }), {
        status,
        headers: {
          "Retry-After": "30"
        }
      })
    );
    const client = createChessComClient({ fetch });

    await expect(client.getGameArchives("testuser")).rejects.toMatchObject({
      name: "ChessComApiError",
      status,
      kind,
      metadata: {
        url: "https://api.chess.com/pub/player/testuser/games/archives",
        retryAfter: "30"
      }
    });
  });

  it("rejects invalid usernames before making provider requests", async () => {
    const { calls, fetch } = mockFetch(jsonResponse({}));
    const client = createChessComClient({ fetch });

    await expect(client.getPlayerProfile("../hikaru")).rejects.toThrow(TypeError);
    await expect(client.getPlayerProfile("name?callback=bad")).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(0);
  });

  it("rejects invalid monthly archive dates before making provider requests", async () => {
    const { calls, fetch } = mockFetch(jsonResponse({}));
    const client = createChessComClient({ fetch });

    await expect(client.getMonthlyGames("testuser", 2006, 1)).rejects.toThrow(TypeError);
    await expect(client.getMonthlyGames("testuser", 2024, 13)).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(0);
  });
});
