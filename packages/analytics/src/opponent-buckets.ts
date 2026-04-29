import type { NormalizedGameRecord } from "@chessinsights/domain";

import { emptyResultCounts, filterByTimeClass, incrementResult, toPercentages } from "./shared.js";
import type { OpponentRatingBucket, OpponentRatingBucketOptions, OpponentRatingBucketsResult } from "./types.js";

const DEFAULT_BUCKET_SIZE = 100;

export function buildOpponentRatingBuckets(
  records: readonly NormalizedGameRecord[],
  options: OpponentRatingBucketOptions = {}
): OpponentRatingBucketsResult {
  const bucketSize = validateBucketSize(options.bucketSize ?? DEFAULT_BUCKET_SIZE);
  const bucketsByStart = new Map<number, OpponentRatingBucket>();
  let skippedGames = 0;

  for (const record of filterByTimeClass(records, options.timeClass)) {
    if (record.opponentRating === null) {
      skippedGames += 1;
      continue;
    }

    const start = Math.floor(record.opponentRating / bucketSize) * bucketSize;
    const existingBucket = bucketsByStart.get(start) ?? createBucket(start, bucketSize);
    const counts = incrementResult(existingBucket.counts, record.result);

    bucketsByStart.set(start, {
      ...existingBucket,
      counts,
      percentages: toPercentages(counts)
    });
  }

  return {
    buckets: [...bucketsByStart.values()].sort((left, right) => left.start - right.start),
    skippedGames
  };
}

function createBucket(start: number, bucketSize: number): OpponentRatingBucket {
  const end = start + bucketSize - 1;
  const counts = emptyResultCounts();

  return {
    start,
    end,
    label: `${start}-${end}`,
    counts,
    percentages: toPercentages(counts)
  };
}

function validateBucketSize(bucketSize: number): number {
  if (!Number.isInteger(bucketSize) || bucketSize <= 0) {
    throw new TypeError("Opponent rating bucket size must be a positive integer.");
  }

  return bucketSize;
}

