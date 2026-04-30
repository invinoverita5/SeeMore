import { ChessComApiError } from "@chessinsights/chesscom-client";
import { describe, expect, it } from "vitest";

import { AnalyzeRequestError, parseAnalyzeSearchParams, toAnalyzeErrorResponse } from "./analyze-request.js";

describe("parseAnalyzeSearchParams", () => {
  it("normalizes a valid request into analysis options", () => {
    const parsed = parseAnalyzeSearchParams(
      new URLSearchParams({
        username: " TestUser ",
        timeClass: "rapid",
        ratingTimeClass: "blitz",
        openingLimit: "7",
        opponentRatingBucketSize: "200"
      })
    );

    expect(parsed).toEqual({
      username: "testuser",
      timeClass: "rapid",
      ratingTimeClass: "blitz",
      openingLimit: 7,
      opponentRatingBucketSize: 200
    });
  });

  it("rejects missing usernames and invalid filters", () => {
    expect(() => parseAnalyzeSearchParams(new URLSearchParams())).toThrow(AnalyzeRequestError);
    expect(() =>
      parseAnalyzeSearchParams(
        new URLSearchParams({
          username: "testuser",
          timeClass: "classical"
        })
      )
    ).toThrow(/timeClass/);
    expect(() =>
      parseAnalyzeSearchParams(
        new URLSearchParams({
          username: "testuser",
          openingLimit: "0"
        })
      )
    ).toThrow(/openingLimit/);
  });
});

describe("toAnalyzeErrorResponse", () => {
  it("maps provider errors without leaking response metadata", () => {
    const response = toAnalyzeErrorResponse(
      new ChessComApiError("rate_limited", 429, {
        url: "https://api.chess.com/pub/player/testuser",
        etag: null,
        lastModified: null,
        cacheControl: null,
        retryAfter: "60"
      })
    );

    expect(response).toEqual({
      status: 429,
      body: {
        error: {
          code: "provider_rate_limited",
          message: "Chess.com is rate limiting requests. Try again shortly.",
          providerKind: "rate_limited",
          providerStatus: 429
        }
      }
    });

    expect(
      toAnalyzeErrorResponse(
        new ChessComApiError("gone", 410, {
          url: "https://api.chess.com/pub/player/testuser",
          etag: null,
          lastModified: null,
          cacheControl: null,
          retryAfter: null
        })
      )
    ).toEqual({
      status: 410,
      body: {
        error: {
          code: "provider_gone",
          message: "Chess.com player data was not found.",
          providerKind: "gone",
          providerStatus: 410
        }
      }
    });
  });

  it("maps validation and unexpected errors", () => {
    expect(toAnalyzeErrorResponse(new AnalyzeRequestError("Bad request."))).toEqual({
      status: 400,
      body: {
        error: {
          code: "invalid_request",
          message: "Bad request."
        }
      }
    });

    expect(toAnalyzeErrorResponse(new TypeError("hidden"))).toEqual({
      status: 500,
      body: {
        error: {
          code: "analysis_failed",
          message: "Analysis failed."
        }
      }
    });

    expect(toAnalyzeErrorResponse(new Error("hidden"))).toEqual({
      status: 500,
      body: {
        error: {
          code: "analysis_failed",
          message: "Analysis failed."
        }
      }
    });
  });
});
