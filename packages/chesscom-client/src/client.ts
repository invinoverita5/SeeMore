import { ChessComApiError } from "./errors.js";
import { formatArchiveMonth, formatArchiveYear, normalizeChessComUsername } from "./validation.js";
import type {
  CacheValidators,
  ChessComArchives,
  ChessComClientOptions,
  ChessComFetch,
  ChessComMonthlyGames,
  ChessComProfile,
  ChessComStats,
  ProviderErrorKind,
  ProviderResponse,
  ProviderResponseMetadata
} from "./types.js";

const CHESS_COM_API_ORIGIN = "https://api.chess.com";
const DEFAULT_USER_AGENT = "ChessInsights/0.1 (+https://github.com/invinoverita5/SeeMore)";

export interface ChessComClient {
  getPlayerProfile(username: string, validators?: CacheValidators): Promise<ProviderResponse<ChessComProfile>>;
  getPlayerStats(username: string, validators?: CacheValidators): Promise<ProviderResponse<ChessComStats>>;
  getGameArchives(username: string, validators?: CacheValidators): Promise<ProviderResponse<ChessComArchives>>;
  getMonthlyGames(
    username: string,
    year: number,
    month: number,
    validators?: CacheValidators
  ): Promise<ProviderResponse<ChessComMonthlyGames>>;
}

export function createChessComClient(options: ChessComClientOptions = {}): ChessComClient {
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (fetchImpl === undefined) {
    throw new TypeError("A fetch implementation is required to create the Chess.com client.");
  }

  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  return {
    async getPlayerProfile(username, validators) {
      return requestJson<ChessComProfile>(fetchImpl, userAgent, playerPath(username), validators);
    },
    async getPlayerStats(username, validators) {
      return requestJson<ChessComStats>(fetchImpl, userAgent, `${playerPath(username)}/stats`, validators);
    },
    async getGameArchives(username, validators) {
      return requestJson<ChessComArchives>(fetchImpl, userAgent, `${playerPath(username)}/games/archives`, validators);
    },
    async getMonthlyGames(username, year, month, validators) {
      const normalizedUsername = normalizeChessComUsername(username);
      const archiveYear = formatArchiveYear(year);
      const archiveMonth = formatArchiveMonth(month);
      return requestJson<ChessComMonthlyGames>(
        fetchImpl,
        userAgent,
        `/pub/player/${normalizedUsername}/games/${archiveYear}/${archiveMonth}`,
        validators
      );
    }
  };
}

function playerPath(username: string): string {
  return `/pub/player/${normalizeChessComUsername(username)}`;
}

async function requestJson<TData>(
  fetchImpl: ChessComFetch,
  userAgent: string,
  path: string,
  validators?: CacheValidators
): Promise<ProviderResponse<TData>> {
  const url = new URL(path, CHESS_COM_API_ORIGIN);
  const response = await fetchImpl(url.href, {
    headers: buildHeaders(userAgent, validators)
  });
  const metadata = readResponseMetadata(url.href, response);

  if (response.status === 304) {
    return {
      status: 304,
      data: null,
      metadata
    };
  }

  if (response.status !== 200) {
    throw new ChessComApiError(classifyErrorStatus(response.status), response.status, metadata);
  }

  return {
    status: 200,
    data: (await response.json()) as TData,
    metadata
  };
}

function buildHeaders(userAgent: string, validators?: CacheValidators): Headers {
  const headers = new Headers({
    Accept: "application/json",
    "User-Agent": userAgent
  });

  if (validators?.etag !== undefined) {
    headers.set("If-None-Match", validators.etag);
  }

  if (validators?.lastModified !== undefined) {
    headers.set("If-Modified-Since", validators.lastModified);
  }

  return headers;
}

function readResponseMetadata(url: string, response: Response): ProviderResponseMetadata {
  return {
    url,
    etag: response.headers.get("ETag"),
    lastModified: response.headers.get("Last-Modified"),
    cacheControl: response.headers.get("Cache-Control"),
    retryAfter: response.headers.get("Retry-After")
  };
}

function classifyErrorStatus(status: number): ProviderErrorKind {
  if (status === 301 || status === 302 || status === 307 || status === 308) {
    return "redirect";
  }

  if (status === 404) {
    return "not_found";
  }

  if (status === 410) {
    return "gone";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status >= 500) {
    return "server_error";
  }

  return "unexpected_status";
}
