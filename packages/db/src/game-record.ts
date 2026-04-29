import type { NormalizedGameRecord } from "@chessinsights/domain";

import {
  DEFAULT_OPENING_TAXONOMY_VERSION,
  type GameWriteInput,
  type GameWriteModel
} from "./types.js";

export function toGameWriteModel(input: GameWriteInput): GameWriteModel {
  const openingTaxonomyVersion =
    input.openingTaxonomyVersion ?? DEFAULT_OPENING_TAXONOMY_VERSION;
  const playedAt = toNullableDate(input.record.playedAt, input.record.gameUrl);

  return {
    ...(input.rawGameId === undefined ? {} : { rawGameId: input.rawGameId }),
    playerId: input.playerId,
    gameUrl: input.record.gameUrl,
    opponentUsername: input.record.opponentUsername,
    playerColor: input.record.playerColor,
    playerRating: input.record.playerRating,
    opponentRating: input.record.opponentRating,
    timeClass: input.record.timeClass,
    result: input.record.result,
    ending: input.record.ending,
    rawPlayerResult: input.record.rawPlayerResult,
    rawOpponentResult: input.record.rawOpponentResult,
    rawRules: input.record.rawRules,
    rawTimeClass: input.record.rawTimeClass,
    openingName: input.record.openingName,
    openingFamily: input.record.openingFamily,
    openingTaxonomyVersion,
    playedAt,
    moveCount: input.record.moveCount,
    plyCount: input.record.plyCount,
    rated: input.record.rated
  };
}

function toNullableDate(value: NormalizedGameRecord["playedAt"], gameUrl: string): Date | null {
  if (value === null) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Cannot persist invalid playedAt value for ${gameUrl}: ${value}`);
  }

  return date;
}
