import type { PlayerAnalysisOptions } from "@chessinsights/analysis";
import { ChessComApiError, normalizeChessComUsername } from "@chessinsights/chesscom-client";
import type { ProviderErrorKind } from "@chessinsights/chesscom-client";
import type { TimeClass } from "@chessinsights/domain";

const TIME_CLASSES = new Set<TimeClass>(["bullet", "blitz", "rapid", "daily"]);

export interface ParsedAnalyzeRequest extends PlayerAnalysisOptions {
  readonly username: string;
}

export interface AnalyzeErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly providerKind?: ProviderErrorKind;
    readonly providerStatus?: number;
  };
}

export interface AnalyzeErrorResponse {
  readonly status: number;
  readonly body: AnalyzeErrorBody;
}

export class AnalyzeRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzeRequestError";
  }
}

export function parseAnalyzeSearchParams(searchParams: URLSearchParams): ParsedAnalyzeRequest {
  const rawUsername = searchParams.get("username");

  if (rawUsername === null || rawUsername.trim().length === 0) {
    throw new AnalyzeRequestError("Chess.com username is required.");
  }

  const username = normalizeUsername(rawUsername);
  const timeClass = parseTimeClass(searchParams, "timeClass");
  const ratingTimeClass = parseTimeClass(searchParams, "ratingTimeClass");
  const openingLimit = parsePositiveInteger(searchParams, "openingLimit", {
    max: 25
  });
  const opponentRatingBucketSize = parsePositiveInteger(searchParams, "opponentRatingBucketSize", {
    max: 400
  });

  return {
    username,
    ...(timeClass === undefined ? {} : { timeClass }),
    ...(ratingTimeClass === undefined ? {} : { ratingTimeClass }),
    ...(openingLimit === undefined ? {} : { openingLimit }),
    ...(opponentRatingBucketSize === undefined ? {} : { opponentRatingBucketSize })
  };
}

export function toAnalyzeErrorResponse(error: unknown): AnalyzeErrorResponse {
  if (error instanceof AnalyzeRequestError) {
    return {
      status: 400,
      body: {
        error: {
          code: "invalid_request",
          message: error.message
        }
      }
    };
  }

  if (error instanceof ChessComApiError) {
    return {
      status: providerStatus(error),
      body: {
        error: {
          code: `provider_${error.kind}`,
          message: providerMessage(error.kind),
          providerKind: error.kind,
          providerStatus: error.status
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "analysis_failed",
        message: "Analysis failed."
      }
    }
  };
}

function normalizeUsername(rawUsername: string): string {
  try {
    return normalizeChessComUsername(rawUsername);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new AnalyzeRequestError(error.message);
    }

    throw error;
  }
}

function parseTimeClass(searchParams: URLSearchParams, key: "ratingTimeClass" | "timeClass"): TimeClass | undefined {
  const value = searchParams.get(key);

  if (value === null) {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.length === 0 || normalizedValue === "all") {
    return undefined;
  }

  if (!TIME_CLASSES.has(normalizedValue as TimeClass)) {
    throw new AnalyzeRequestError(`${key} must be one of bullet, blitz, rapid, or daily.`);
  }

  return normalizedValue as TimeClass;
}

function parsePositiveInteger(
  searchParams: URLSearchParams,
  key: "openingLimit" | "opponentRatingBucketSize",
  options: {
    readonly max: number;
  }
): number | undefined {
  const value = searchParams.get(key);

  if (value === null || value.trim().length === 0) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > options.max) {
    throw new AnalyzeRequestError(`${key} must be an integer from 1 to ${options.max}.`);
  }

  return parsedValue;
}

function providerStatus(error: ChessComApiError): number {
  if (error.kind === "not_found") {
    return 404;
  }

  if (error.kind === "gone") {
    return 410;
  }

  if (error.kind === "rate_limited") {
    return 429;
  }

  return 502;
}

function providerMessage(kind: ProviderErrorKind): string {
  switch (kind) {
    case "gone":
    case "not_found":
      return "Chess.com player data was not found.";
    case "rate_limited":
      return "Chess.com is rate limiting requests. Try again shortly.";
    case "redirect":
    case "server_error":
    case "unexpected_status":
      return "Chess.com data is temporarily unavailable.";
  }
}
