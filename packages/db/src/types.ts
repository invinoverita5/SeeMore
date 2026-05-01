import type {
  EndingCategory,
  NormalizedGameRecord,
  NormalizedResult,
  PlayerColor,
  TimeClass
} from "@chessinsights/domain";

export const DEFAULT_OPENING_TAXONOMY_VERSION = "opening-family:v1";

export type AggregateKind =
  | "opening_summary"
  | "opponent_rating_buckets"
  | "rating_timeline"
  | "result_breakdown"
  | "time_class_breakdown";

export interface AggregateFilterInput {
  readonly bucketSize?: number;
  readonly from?: string;
  readonly limit?: number;
  readonly playerColor?: PlayerColor;
  readonly timeClass?: TimeClass;
  readonly to?: string;
}

export interface GameWriteInput {
  readonly playerId: string;
  readonly rawGameId?: string;
  readonly record: NormalizedGameRecord;
  readonly openingTaxonomyVersion?: string;
}

export interface GameWriteModel {
  readonly playerId: string;
  readonly rawGameId?: string;
  readonly gameUrl: string;
  readonly opponentUsername: string;
  readonly playerColor: PlayerColor;
  readonly playerRating: number | null;
  readonly opponentRating: number | null;
  readonly timeClass: TimeClass;
  readonly result: NormalizedResult;
  readonly ending: EndingCategory;
  readonly rawPlayerResult: string;
  readonly rawOpponentResult: string;
  readonly rawRules: string;
  readonly rawTimeClass: string;
  readonly rawTimeControl: string;
  readonly estimatedTimePlayedSeconds: number | null;
  readonly openingName: string;
  readonly openingFamily: string;
  readonly openingTaxonomyVersion: string;
  readonly playedAt: Date | null;
  readonly moveCount: number;
  readonly plyCount: number;
  readonly rated: boolean | null;
}
