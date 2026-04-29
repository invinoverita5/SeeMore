import type { NormalizedGameRecord } from "@chessinsights/domain";

import { filterByTimeClass } from "./shared.js";
import type { RatingTimelineOptions, RatingTimelinePoint } from "./types.js";

export function buildRatingTimeline(
  records: readonly NormalizedGameRecord[],
  options: RatingTimelineOptions = {}
): RatingTimelinePoint[] {
  return filterByTimeClass(records, options.timeClass)
    .filter((record) => record.playedAt !== null && record.playerRating !== null)
    .map((record) => ({
      playedAt: record.playedAt as string,
      rating: record.playerRating as number,
      gameUrl: record.gameUrl,
      timeClass: record.timeClass
    }))
    .sort(compareTimelinePoints);
}

function compareTimelinePoints(left: RatingTimelinePoint, right: RatingTimelinePoint): number {
  const playedAtCompare = left.playedAt.localeCompare(right.playedAt);

  if (playedAtCompare !== 0) {
    return playedAtCompare;
  }

  return left.gameUrl.localeCompare(right.gameUrl);
}

