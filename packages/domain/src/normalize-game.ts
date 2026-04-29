import { extractOpeningName, toOpeningFamily } from "./opening-family.js";
import { countFullMovesFromPgn, countPlyFromPgn, readPgnHeader } from "./pgn.js";
import { classifyEnding, mapResultCode } from "./result-map.js";
import { classifyTimeClass } from "./time-class.js";
import type { ChessComGame, ChessComSide, NormalizedGameRecord, PlayerColor } from "./types.js";

export function normalizeChessComGame(game: ChessComGame, username: string): NormalizedGameRecord | null {
  const rawRules = game.rules?.trim().toLowerCase() ?? "";

  if (rawRules !== "chess") {
    return null;
  }

  const rawTimeClass = game.time_class?.trim().toLowerCase() ?? "";
  const timeClass = classifyTimeClass(rawTimeClass);

  if (timeClass === null) {
    return null;
  }

  const perspective = getPlayerPerspective(game, username);
  const playerResult = perspective.player.result;
  const opponentResult = perspective.opponent.result;
  const openingName = extractOpeningName(game.pgn, game.eco);
  const plyCount = countPlyFromPgn(game.pgn);

  return {
    gameUrl: game.url,
    playerUsername: perspective.player.username,
    opponentUsername: perspective.opponent.username,
    playerColor: perspective.color,
    playerRating: perspective.player.rating ?? null,
    opponentRating: perspective.opponent.rating ?? null,
    timeClass,
    result: mapResultCode(playerResult),
    ending: classifyEnding(playerResult, opponentResult),
    rawPlayerResult: playerResult,
    rawOpponentResult: opponentResult,
    rawRules,
    rawTimeClass,
    openingName,
    openingFamily: toOpeningFamily(openingName),
    playedAt: getPlayedAt(game),
    moveCount: countFullMovesFromPgn(game.pgn),
    plyCount,
    rated: game.rated ?? null
  };
}

interface PlayerPerspective {
  readonly color: PlayerColor;
  readonly player: ChessComSide;
  readonly opponent: ChessComSide;
}

function getPlayerPerspective(game: ChessComGame, username: string): PlayerPerspective {
  const normalizedUsername = normalizeUsername(username);

  if (normalizeUsername(game.white.username) === normalizedUsername) {
    return {
      color: "white",
      player: game.white,
      opponent: game.black
    };
  }

  if (normalizeUsername(game.black.username) === normalizedUsername) {
    return {
      color: "black",
      player: game.black,
      opponent: game.white
    };
  }

  throw new Error(`Username "${username}" was not found in game ${game.url}`);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function getPlayedAt(game: ChessComGame): string | null {
  if (game.end_time !== undefined) {
    return new Date(game.end_time * 1000).toISOString();
  }

  const utcDate = readPgnHeader(game.pgn, "UTCDate") ?? readPgnHeader(game.pgn, "Date");
  const utcTime = readPgnHeader(game.pgn, "UTCTime") ?? "00:00:00";

  if (utcDate === null || utcDate.includes("?")) {
    return null;
  }

  const isoDate = utcDate.replace(/\./g, "-");
  const parsedDate = new Date(`${isoDate}T${utcTime}Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

