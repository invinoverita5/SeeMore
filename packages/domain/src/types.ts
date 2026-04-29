export type PlayerColor = "white" | "black";

export type TimeClass = "bullet" | "blitz" | "rapid" | "daily";

export type NormalizedResult = "win" | "loss" | "draw";

export type EndingCategory =
  | "abandoned"
  | "agreement"
  | "checkmate"
  | "fifty_move"
  | "insufficient_material"
  | "repetition"
  | "resignation"
  | "stalemate"
  | "timeout"
  | "time_vs_insufficient_material"
  | "unknown";

export interface ChessComSide {
  readonly username: string;
  readonly rating?: number;
  readonly result: string;
  readonly "@id"?: string;
  readonly uuid?: string;
}

export interface ChessComGame {
  readonly url: string;
  readonly pgn: string;
  readonly time_class?: string;
  readonly rules?: string;
  readonly end_time?: number;
  readonly rated?: boolean;
  readonly eco?: string;
  readonly white: ChessComSide;
  readonly black: ChessComSide;
}

export interface NormalizedGameRecord {
  readonly gameUrl: string;
  readonly playerUsername: string;
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
  readonly openingName: string;
  readonly openingFamily: string;
  readonly playedAt: string | null;
  readonly moveCount: number;
  readonly plyCount: number;
  readonly rated: boolean | null;
}

