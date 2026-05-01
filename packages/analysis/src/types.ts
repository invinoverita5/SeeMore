import type {
  EndingBreakdowns,
  OpeningSummaryEntry,
  OpponentRatingBucketsResult,
  PlayerSummary,
  RatingTimelinePoint,
  ResultBreakdown,
  TimeClassBreakdownEntry
} from "@chessinsights/analytics";
import type { PlayerColor, TimeClass } from "@chessinsights/domain";
import type {
  ChessComImportResult,
  ChessComProfile,
  ChessComStats,
  ImportOptions
} from "@chessinsights/importer";

export interface PlayerAnalysisOptions extends ImportOptions {
  readonly openingLimit?: number;
  readonly openingPlayerColor?: PlayerColor;
  readonly opponentRatingBucketSize?: number;
  readonly ratingTimeClass?: TimeClass | null;
  readonly timeClass?: TimeClass;
}

export type ResultsByTimeClass = Record<TimeClass, ResultBreakdown>;

export interface PlayerAnalysisFilters {
  readonly openingLimit: number;
  readonly openingPlayerColor: PlayerColor | null;
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
  readonly endingBreakdowns: EndingBreakdowns;
  readonly openingSummary: readonly OpeningSummaryEntry[];
  readonly opponentRatingBuckets: OpponentRatingBucketsResult;
  readonly ratingTimeline: RatingTimelineAnalysis;
  readonly results: ResultBreakdown;
  readonly resultsByTimeClass: ResultsByTimeClass;
  readonly summary: PlayerSummary;
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
