import type {
  OpeningSummaryEntry,
  OpponentRatingBucketsResult,
  RatingTimelinePoint,
  ResultBreakdown,
  TimeClassBreakdownEntry
} from "@chessinsights/analytics";
import type { TimeClass } from "@chessinsights/domain";
import type {
  ChessComImportResult,
  ChessComProfile,
  ChessComStats,
  ImportOptions
} from "@chessinsights/importer";

export interface PlayerAnalysisOptions extends ImportOptions {
  readonly openingLimit?: number;
  readonly opponentRatingBucketSize?: number;
  readonly ratingTimeClass?: TimeClass;
  readonly timeClass?: TimeClass;
}

export type ResultsByTimeClass = Record<TimeClass, ResultBreakdown>;

export interface PlayerAnalysisFilters {
  readonly openingLimit: number;
  readonly opponentRatingBucketSize: number;
  readonly ratingTimeClass: TimeClass | null;
  readonly timeClass: TimeClass | null;
}

export interface PlayerImportSummary {
  readonly archiveCount: number;
  readonly downloadedGameCount: number;
  readonly normalizedGameCount: number;
  readonly skippedArchiveUrls: readonly string[];
  readonly skippedGameCount: number;
}

export interface RatingTimelineAnalysis {
  readonly timeClass: TimeClass | null;
  readonly points: readonly RatingTimelinePoint[];
}

export interface PlayerAnalysisAggregates {
  readonly openingSummary: readonly OpeningSummaryEntry[];
  readonly opponentRatingBuckets: OpponentRatingBucketsResult;
  readonly ratingTimeline: RatingTimelineAnalysis;
  readonly results: ResultBreakdown;
  readonly resultsByTimeClass: ResultsByTimeClass;
  readonly timeClasses: readonly TimeClassBreakdownEntry[];
}

export interface PlayerAnalysis {
  readonly username: string;
  readonly profile: ChessComProfile;
  readonly stats: ChessComStats;
  readonly defaultTimeClass: TimeClass | null;
  readonly filters: PlayerAnalysisFilters;
  readonly importSummary: PlayerImportSummary;
  readonly aggregates: PlayerAnalysisAggregates;
}

export type PlayerAnalysisSource = ChessComImportResult;
