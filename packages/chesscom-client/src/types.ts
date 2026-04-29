export type ChessComFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type ProviderStatus = 200 | 304;

export type ProviderErrorKind =
  | "gone"
  | "not_found"
  | "rate_limited"
  | "redirect"
  | "server_error"
  | "unexpected_status";

export interface ChessComClientOptions {
  readonly fetch?: ChessComFetch;
  readonly userAgent?: string;
}

export interface CacheValidators {
  readonly etag?: string;
  readonly lastModified?: string;
}

export interface ProviderResponseMetadata {
  readonly url: string;
  readonly etag: string | null;
  readonly lastModified: string | null;
  readonly cacheControl: string | null;
  readonly retryAfter: string | null;
}

export interface ProviderResponse<TData> {
  readonly status: ProviderStatus;
  readonly data: TData | null;
  readonly metadata: ProviderResponseMetadata;
}

export interface ChessComProfile {
  readonly "@id": string;
  readonly url: string;
  readonly username: string;
  readonly player_id: number;
  readonly title?: string;
  readonly status?: string;
  readonly name?: string;
  readonly avatar?: string;
  readonly location?: string;
  readonly country?: string;
  readonly joined?: number;
  readonly last_online?: number;
  readonly followers?: number;
  readonly is_streamer?: boolean;
  readonly twitch_url?: string;
  readonly fide?: number;
}

export interface ChessComStats {
  readonly [key: string]: unknown;
}

export interface ChessComArchives {
  readonly archives: string[];
}

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
  readonly time_control?: string;
  readonly end_time?: number;
  readonly rated?: boolean;
  readonly time_class?: string;
  readonly rules?: string;
  readonly eco?: string;
  readonly white: ChessComSide;
  readonly black: ChessComSide;
  readonly [key: string]: unknown;
}

export interface ChessComMonthlyGames {
  readonly games: ChessComGame[];
}

