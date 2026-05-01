// @vitest-environment jsdom

import type { PlayerAnalysis } from "@chessinsights/analysis";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyzeDashboard } from "./analyze-dashboard";

interface AnalyzeApiTestResponse {
  readonly analysis?: PlayerAnalysis;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AnalyzeDashboard", () => {
  it("validates an empty username and clears stale analysis", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValueOnce(jsonResponse({ analysis: makeAnalysis("testuser") }));

    render(createElement(AnalyzeDashboard));
    submitUsername("testuser");

    expect(await screen.findByText("testuser")).toBeTruthy();

    submitUsername(" ");

    expect(screen.getByRole("alert").textContent).toBe("Enter a Chess.com username.");
    expect(screen.getByText("No player")).toBeTruthy();
    expect(screen.queryByText("testuser")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears stale analysis while loading and after API errors", async () => {
    const fetchMock = stubFetch();
    const deferredResponse = createDeferred<Response>();
    fetchMock.mockResolvedValueOnce(jsonResponse({ analysis: makeAnalysis("oldplayer") }));
    fetchMock.mockReturnValueOnce(deferredResponse.promise);

    render(createElement(AnalyzeDashboard));
    submitUsername("oldplayer");

    expect(await screen.findByText("oldplayer")).toBeTruthy();

    submitUsername("oldplayer");

    expect(await screen.findByText("Running")).toBeTruthy();
    expect(screen.getByText("No player")).toBeTruthy();
    expect(screen.queryByText("oldplayer")).toBeNull();

    deferredResponse.resolve(
      jsonResponse(
        {
          error: {
            code: "provider_rate_limited",
            message: "Chess.com is rate limiting requests. Try again shortly."
          }
        },
        429
      )
    );

    expect(await screen.findByText("Chess.com is rate limiting requests. Try again shortly.")).toBeTruthy();
    expect(screen.getByText("No player")).toBeTruthy();
  });

  it("refetches with the selected time class after analysis exists", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValueOnce(jsonResponse({ analysis: makeAnalysis("testuser") }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ analysis: makeAnalysis("testuser-blitz") }));

    render(createElement(AnalyzeDashboard));
    submitUsername("testuser");

    expect(await screen.findByText("testuser")).toBeTruthy();

    const blitzButton = screen.getByRole("button", { name: "blitz" });
    fireEvent.click(blitzButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(blitzButton.getAttribute("aria-pressed")).toBe("true");
    expect(fetchMock.mock.calls[1]?.[0].toString()).toBe(
      "/api/analyze?username=testuser&ratingTimeClass=blitz&timeClass=blitz"
    );
    expect(await screen.findByText("testuser-blitz")).toBeTruthy();
  });

  it("refetches opening summaries with the selected player color", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValueOnce(jsonResponse({ analysis: makeAnalysis("testuser") }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ analysis: makeAnalysis("testuser-white") }));

    render(createElement(AnalyzeDashboard));
    submitUsername("testuser");

    expect(await screen.findByText("testuser")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "white" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock.mock.calls[1]?.[0].toString()).toBe(
      "/api/analyze?username=testuser&ratingTimeClass=all&openingPlayerColor=white"
    );
    expect(await screen.findByText("testuser-white")).toBeTruthy();
  });
});

function submitUsername(username: string): void {
  const input = screen.getByLabelText("Chess.com username");
  fireEvent.change(input, {
    target: {
      value: username
    }
  });
  fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
}

function stubFetch() {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function jsonResponse(body: AnalyzeApiTestResponse, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body)
  } as Response;
}

function createDeferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return {
    promise,
    resolve
  };
}

function makeAnalysis(username: string): PlayerAnalysis {
  const resultBreakdown = {
    total: 3,
    win: 1,
    loss: 1,
    draw: 1,
    percentages: {
      win: 33,
      loss: 33,
      draw: 34
    }
  };
  const emptyResultBreakdown = {
    total: 0,
    win: 0,
    loss: 0,
    draw: 0,
    percentages: {
      win: 0,
      loss: 0,
      draw: 0
    }
  };

  return {
    username,
    profile: {
      "@id": `https://api.chess.com/pub/player/${username}`,
      url: `https://www.chess.com/member/${username}`,
      username,
      player_id: 1
    },
    stats: {},
    defaultTimeClass: "blitz",
    filters: {
      timeClass: null,
      ratingTimeClass: "blitz",
      openingPlayerColor: null,
      openingLimit: 10,
      opponentRatingBucketSize: 100
    },
    importSummary: {
      archiveCount: 1,
      downloadedGameCount: 3,
      normalizedGameCount: 3,
      skippedArchiveUrls: [],
      skippedGameCount: 0
    },
    aggregates: {
      summary: {
        totalGames: 3,
        results: resultBreakdown,
        estimatedTimePlayedSeconds: 900,
        skippedEstimatedTimeGames: 0
      },
      results: resultBreakdown,
      resultsByTimeClass: {
        bullet: emptyResultBreakdown,
        blitz: resultBreakdown,
        rapid: emptyResultBreakdown,
        daily: emptyResultBreakdown
      },
      timeClasses: [
        {
          timeClass: "blitz",
          total: 3,
          percentage: 100
        }
      ],
      ratingTimeline: {
        timeClass: "blitz",
        points: [
          {
            playedAt: "2024-01-01T00:00:00.000Z",
            rating: 1500,
            result: "win",
            gameUrl: "https://www.chess.com/game/live/1",
            timeClass: "blitz"
          }
        ]
      },
      opponentRatingBuckets: {
        buckets: [
          {
            start: 1500,
            end: 1599,
            label: "1500-1599",
            counts: resultBreakdown,
            percentages: resultBreakdown.percentages
          }
        ],
        skippedGames: 0
      },
      openingSummary: [
        {
          openingFamily: "Italian Game",
          counts: resultBreakdown,
          percentages: resultBreakdown.percentages
        }
      ],
      endingBreakdowns: {
        wonBy: [
          {
            ending: "resignation",
            label: "Resignation",
            count: 1,
            percentage: 100
          }
        ],
        lostBy: [
          {
            ending: "checkmate",
            label: "Checkmate",
            count: 1,
            percentage: 100
          }
        ],
        drawnBy: [
          {
            ending: "stalemate",
            label: "Stalemate",
            count: 1,
            percentage: 100
          }
        ]
      }
    }
  };
}
