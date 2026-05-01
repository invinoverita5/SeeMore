import {
  buildEndingBreakdowns,
  buildOpeningSummary,
  buildOpponentRatingBuckets,
  buildPlayerSummary,
  buildRatingTimeline,
  buildResultBreakdown,
  buildTimeClassBreakdown,
  getMostPlayedTimeClass
} from "@chessinsights/analytics";
import type { PlayerColor, TimeClass } from "@chessinsights/domain";
import { importChessComPlayer } from "@chessinsights/importer";
import type { ChessComImportClient, ChessComImportResult } from "@chessinsights/importer";

import type { PlayerAnalysis, PlayerAnalysisOptions, ResultsByTimeClass } from "./types.js";

const TIME_CLASSES: readonly TimeClass[] = ["bullet", "blitz", "rapid", "daily"];
const DEFAULT_OPENING_LIMIT = 10;
const DEFAULT_OPPONENT_RATING_BUCKET_SIZE = 100;
type TimeClassOption = {
  readonly timeClass?: TimeClass;
};
type PlayerColorOption = {
  readonly playerColor?: PlayerColor;
};

export async function analyzeChessComPlayer(
  client: ChessComImportClient,
  username: string,
  options: PlayerAnalysisOptions = {}
): Promise<PlayerAnalysis> {
  const importOptions = options.onProgress === undefined ? {} : { onProgress: options.onProgress };
  const importResult = await importChessComPlayer(client, username, importOptions);

  return buildPlayerAnalysis(importResult, options);
}

export function buildPlayerAnalysis(
  importResult: ChessComImportResult,
  options: PlayerAnalysisOptions = {}
): PlayerAnalysis {
  const defaultTimeClass = getMostPlayedTimeClass(importResult.records);
  const ratingTimeClass = options.ratingTimeClass ?? defaultTimeClass;
  const openingLimit = options.openingLimit ?? DEFAULT_OPENING_LIMIT;
  const opponentRatingBucketSize = options.opponentRatingBucketSize ?? DEFAULT_OPPONENT_RATING_BUCKET_SIZE;
  const aggregateTimeClassOption = toTimeClassOption(options.timeClass);
  const ratingTimeClassOption = toTimeClassOption(ratingTimeClass ?? undefined);
  const downloadedGameCount = importResult.archives.reduce(
    (currentTotal, archive) => currentTotal + archive.gameCount,
    0
  );

  return {
    username: importResult.username,
    profile: importResult.profile,
    stats: importResult.stats,
    defaultTimeClass,
    filters: {
      timeClass: options.timeClass ?? null,
      ratingTimeClass,
      openingPlayerColor: options.openingPlayerColor ?? null,
      openingLimit,
      opponentRatingBucketSize
    },
    importSummary: {
      archiveCount: importResult.archives.length,
      downloadedGameCount,
      normalizedGameCount: importResult.records.length,
      skippedGameCount: importResult.skippedGames,
      skippedArchiveUrls: importResult.skippedArchiveUrls
    },
    aggregates: {
      summary: buildPlayerSummary(importResult.records, aggregateTimeClassOption),
      results: buildResultBreakdown(importResult.records, aggregateTimeClassOption),
      resultsByTimeClass: buildResultsByTimeClass(importResult.records),
      timeClasses: buildTimeClassBreakdown(importResult.records),
      ratingTimeline: {
        timeClass: ratingTimeClass,
        points: buildRatingTimeline(importResult.records, ratingTimeClassOption)
      },
      opponentRatingBuckets: buildOpponentRatingBuckets(importResult.records, {
        bucketSize: opponentRatingBucketSize,
        ...aggregateTimeClassOption
      }),
      openingSummary: buildOpeningSummary(importResult.records, {
        limit: openingLimit,
        ...toPlayerColorOption(options.openingPlayerColor),
        ...aggregateTimeClassOption
      }),
      endingBreakdowns: buildEndingBreakdowns(importResult.records, aggregateTimeClassOption)
    }
  };
}

function toTimeClassOption(timeClass: TimeClass | undefined): TimeClassOption {
  return timeClass === undefined ? {} : { timeClass };
}

function toPlayerColorOption(playerColor: PlayerColor | undefined): PlayerColorOption {
  return playerColor === undefined ? {} : { playerColor };
}

function buildResultsByTimeClass(records: ChessComImportResult["records"]): ResultsByTimeClass {
  return {
    bullet: buildResultBreakdown(records, {
      timeClass: "bullet"
    }),
    blitz: buildResultBreakdown(records, {
      timeClass: "blitz"
    }),
    rapid: buildResultBreakdown(records, {
      timeClass: "rapid"
    }),
    daily: buildResultBreakdown(records, {
      timeClass: "daily"
    })
  };
}

export const SUPPORTED_TIME_CLASSES = TIME_CLASSES;
