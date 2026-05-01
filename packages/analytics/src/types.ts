import type { EndingCategory, NormalizedGameRecord, NormalizedResult, PlayerColor, TimeClass } from "@chessinsights/domain";

export interface TimeClassFilter {
  readonly timeClass?: TimeClass;
}

export interface PlayerColorFilter {
  readonly playerColor?: PlayerColor;
}

export interface ResultCounts {
  readonly total: number;
  readonly win: number;
  readonly loss: number;
  readonly draw: number;
}

export interface ResultPercentages {
  readonly win: number;
  readonly loss: number;
  readonly draw: number;
}

export interface ResultBreakdown extends ResultCounts {
  readonly percentages: ResultPercentages;
}

export interface TimeClassBreakdownEntry {
  readonly timeClass: TimeClass;
  readonly total: number;
  readonly percentage: number;
}

export interface RatingTimelinePoint {
  readonly playedAt: string;
  readonly rating: number;
  readonly result: NormalizedResult;
  readonly gameUrl: string;
  readonly timeClass: TimeClass;
}

export type RatingTimelineOptions = TimeClassFilter;

export interface OpponentRatingBucket {
  readonly start: number;
  readonly end: number;
  readonly label: string;
  readonly counts: ResultCounts;
  readonly percentages: ResultPercentages;
}

export interface OpponentRatingBucketOptions extends TimeClassFilter {
  readonly bucketSize?: number;
}

export interface OpponentRatingBucketsResult {
  readonly buckets: OpponentRatingBucket[];
  readonly skippedGames: number;
}

export interface OpeningSummaryEntry {
  readonly openingFamily: string;
  readonly counts: ResultCounts;
  readonly percentages: ResultPercentages;
}

export interface OpeningSummaryOptions extends TimeClassFilter, PlayerColorFilter {
  readonly limit?: number;
}

export interface PlayerSummary {
  readonly totalGames: number;
  readonly results: ResultBreakdown;
  readonly estimatedTimePlayedSeconds: number;
  readonly skippedEstimatedTimeGames: number;
}

export interface EndingBreakdownEntry {
  readonly ending: EndingCategory;
  readonly label: string;
  readonly count: number;
  readonly percentage: number;
}

export interface EndingBreakdowns {
  readonly wonBy: readonly EndingBreakdownEntry[];
  readonly lostBy: readonly EndingBreakdownEntry[];
  readonly drawnBy: readonly EndingBreakdownEntry[];
}

export type AnalyticsInput = readonly NormalizedGameRecord[];
