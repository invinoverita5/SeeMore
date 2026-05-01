import { describe, expect, it } from "vitest";

import {
  normalizeChessComGame,
  type ChessComGame,
  type NormalizedGameRecord
} from "@chessinsights/domain";

import monthlyGamesFixture from "../../../tests/fixtures/chesscom/monthly-games.json" with {
  type: "json"
};
import {
  createAggregateFilterHash,
  DEFAULT_OPENING_TAXONOMY_VERSION,
  toGameWriteModel,
  toUsernameKey
} from "./index.js";

const fixtureGames = monthlyGamesFixture.games as ChessComGame[];
const fixtureRecords = fixtureGames
  .map((game) => normalizeChessComGame(game, "TestUser"))
  .filter((record): record is NormalizedGameRecord => record !== null);

describe("database persistence helpers", () => {
  it("maps a normalized game into a persistence-safe write model", () => {
    const record = getFixtureRecord(0);

    const writeModel = toGameWriteModel({
      playerId: "player_123",
      rawGameId: "raw_game_123",
      record
    });

    expect(writeModel).toEqual({
      playerId: "player_123",
      rawGameId: "raw_game_123",
      gameUrl: "https://www.chess.com/game/live/1001",
      opponentUsername: "OpponentOne",
      playerColor: "white",
      playerRating: 1350,
      opponentRating: 1288,
      timeClass: "blitz",
      result: "win",
      ending: "resignation",
      rawPlayerResult: "win",
      rawOpponentResult: "resigned",
      rawRules: "chess",
      rawTimeClass: "blitz",
      rawTimeControl: "300",
      estimatedTimePlayedSeconds: 300,
      openingName: "Sicilian Defense Najdorf Variation",
      openingFamily: "Sicilian Defense",
      openingTaxonomyVersion: DEFAULT_OPENING_TAXONOMY_VERSION,
      playedAt: new Date("2024-01-15T08:26:40.000Z"),
      moveCount: 5,
      plyCount: 10,
      rated: true
    });
  });

  it("keeps the raw game id optional for delayed raw-game backfills", () => {
    const record = getFixtureRecord(1);

    const writeModel = toGameWriteModel({
      playerId: "player_123",
      record
    });

    expect(writeModel.rawGameId).toBeUndefined();
    expect(writeModel.playedAt).toEqual(new Date("2024-01-16T18:44:11.000Z"));
  });

  it("rejects invalid playedAt values before they reach the database", () => {
    const record = getFixtureRecord(0);

    expect(() =>
      toGameWriteModel({
        playerId: "player_123",
        record: {
          ...record,
          playedAt: "not-a-date"
        }
      })
    ).toThrow(/Cannot persist invalid playedAt value/);
  });

  it("normalizes Chess.com usernames into stable lookup keys", () => {
    expect(toUsernameKey("  TestUser  ")).toBe("testuser");
    expect(() => toUsernameKey("   ")).toThrow(/must not be empty/);
  });

  it("creates deterministic aggregate filter hashes regardless of key order", () => {
    const firstHash = createAggregateFilterHash({
      bucketSize: 100,
      timeClass: "rapid",
      limit: 10
    });
    const secondHash = createAggregateFilterHash({
      limit: 10,
      timeClass: "rapid",
      bucketSize: 100
    });

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toHaveLength(64);
  });
});

function getFixtureRecord(index: number): NormalizedGameRecord {
  const record = fixtureRecords[index];

  if (record === undefined) {
    throw new Error(`Missing fixture record at index ${index}.`);
  }

  return record;
}
