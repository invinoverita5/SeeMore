import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { normalizeChessComGame } from "./normalize-game.js";
import type { ChessComGame } from "./types.js";

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../tests/fixtures/chesscom/monthly-games.json"
);

interface MonthlyGamesFixture {
  readonly games: ChessComGame[];
}

const cachedFixture = JSON.parse(readFileSync(fixturePath, "utf8")) as MonthlyGamesFixture;

function loadFixture(): MonthlyGamesFixture {
  return cachedFixture;
}

function fixtureGame(index: number): ChessComGame {
  const game = loadFixture().games[index];

  if (game === undefined) {
    throw new Error(`Missing fixture game at index ${index}`);
  }

  return game;
}

describe("normalizeChessComGame", () => {
  it("normalizes a standard Chess.com game from the requested player's perspective", () => {
    const game = fixtureGame(0);

    const normalizedGame = normalizeChessComGame(game, "testuser");

    expect(normalizedGame).toMatchObject({
      gameUrl: "https://www.chess.com/game/live/1001",
      playerUsername: "TestUser",
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
      openingName: "Sicilian Defense Najdorf Variation",
      openingFamily: "Sicilian Defense",
      playedAt: "2024-01-15T08:26:40.000Z",
      moveCount: 5,
      plyCount: 10,
      estimatedTimePlayedSeconds: 300,
      rated: true
    });
  });

  it("normalizes losses when the requested player was black", () => {
    const game = fixtureGame(1);

    const normalizedGame = normalizeChessComGame(game, "TESTUSER");

    expect(normalizedGame).toMatchObject({
      playerColor: "black",
      playerRating: 1402,
      opponentRating: 1440,
      timeClass: "rapid",
      result: "loss",
      ending: "checkmate",
      rawPlayerResult: "checkmated",
      rawOpponentResult: "win",
      openingFamily: "Italian Game"
    });
  });

  it("treats draw and unknown endings as draws while preserving raw result codes", () => {
    const game = fixtureGame(2);

    const normalizedGame = normalizeChessComGame(game, "testuser");

    expect(normalizedGame).toMatchObject({
      result: "draw",
      ending: "stalemate",
      rawPlayerResult: "stalemate",
      rawOpponentResult: "stalemate",
      timeClass: "daily"
    });
  });

  it("estimates player clock time from live time controls and leaves daily controls unknown", () => {
    const liveGame = {
      ...fixtureGame(0),
      time_control: "180+2"
    };
    const dailyGame = fixtureGame(2);

    expect(normalizeChessComGame(liveGame, "testuser")).toMatchObject({
      rawTimeControl: "180+2",
      estimatedTimePlayedSeconds: 190
    });
    expect(normalizeChessComGame(dailyGame, "testuser")).toMatchObject({
      rawTimeControl: "1/259200",
      estimatedTimePlayedSeconds: null
    });
  });

  it("returns null for non-standard variants", () => {
    const game = fixtureGame(3);

    expect(normalizeChessComGame(game, "testuser")).toBeNull();
  });
});
