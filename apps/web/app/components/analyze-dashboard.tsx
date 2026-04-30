"use client";

import type {
  OpeningSummaryEntry,
  OpponentRatingBucket,
  RatingTimelinePoint,
  ResultBreakdown,
  TimeClassBreakdownEntry
} from "@chessinsights/analytics";
import type { PlayerAnalysis } from "@chessinsights/analysis";
import type { TimeClass } from "@chessinsights/domain";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type TimeClassFilter = TimeClass | "all";

interface AnalyzeApiResponse {
  readonly analysis?: PlayerAnalysis;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

const TIME_CLASS_FILTERS: readonly TimeClassFilter[] = ["all", "bullet", "blitz", "rapid", "daily"];

export function AnalyzeDashboard() {
  const [username, setUsername] = useState("");
  const [activeTimeClass, setActiveTimeClass] = useState<TimeClassFilter>("all");
  const [analysis, setAnalysis] = useState<PlayerAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasAnalysis = analysis !== null;
  const activeResults = analysis?.aggregates.results ?? emptyResultBreakdown();

  async function submitAnalysis(nextTimeClass: TimeClassFilter = activeTimeClass) {
    const trimmedUsername = username.trim();

    if (trimmedUsername.length === 0) {
      setAnalysis(null);
      setErrorMessage("Enter a Chess.com username.");
      return;
    }

    setAnalysis(null);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        username: trimmedUsername
      });

      if (nextTimeClass !== "all") {
        params.set("timeClass", nextTimeClass);
      }

      const response = await fetch(`/api/analyze?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || payload.analysis === undefined) {
        throw new Error(payload.error?.message ?? "Analysis failed.");
      }

      setAnalysis(payload.analysis);
    } catch (error) {
      setAnalysis(null);
      setErrorMessage(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAnalysis();
  }

  function selectTimeClass(timeClass: TimeClassFilter) {
    setActiveTimeClass(timeClass);

    if (hasAnalysis) {
      void submitAnalysis(timeClass);
    }
  }

  return (
    <main className="app-shell">
      <section className="search-band" aria-label="Chess.com analysis">
        <div className="brand-block">
          <ChessboardMark />
          <div>
            <p className="eyebrow">ChessInsights</p>
            <h1>Player Analysis</h1>
          </div>
        </div>

        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Chess.com username</label>
          <div className="search-row">
            <input
              id="username"
              name="username"
              autoComplete="off"
              placeholder="hikaru"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Analyzing" : "Analyze"}
            </button>
          </div>
        </form>
      </section>

      <section className="toolbar" aria-label="Analysis filters">
        <div className="segmented-control" role="group" aria-label="Time class">
          {TIME_CLASS_FILTERS.map((timeClass) => (
            <button
              key={timeClass}
              type="button"
              aria-pressed={activeTimeClass === timeClass}
              onClick={() => selectTimeClass(timeClass)}
              disabled={isLoading}
            >
              {timeClass}
            </button>
          ))}
        </div>
        <div className="status-pill">{statusLabel(isLoading, analysis, errorMessage)}</div>
      </section>

      {errorMessage === null ? null : (
        <section className="error-panel" role="alert">
          {errorMessage}
        </section>
      )}

      <section className="dashboard-grid" aria-label="Analysis dashboard">
        <ResultPanel results={activeResults} />
        <TimeClassPanel entries={analysis?.aggregates.timeClasses ?? []} />
        <RatingPanel points={analysis?.aggregates.ratingTimeline.points ?? []} />
        <OpponentBucketsPanel buckets={analysis?.aggregates.opponentRatingBuckets.buckets ?? []} />
        <OpeningsPanel openings={analysis?.aggregates.openingSummary ?? []} />
        <ImportPanel analysis={analysis} />
      </section>
    </main>
  );
}

function ChessboardMark() {
  return (
    <div className="board-mark" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function ResultPanel({ results }: { readonly results: ResultBreakdown }) {
  return (
    <article className="panel">
      <PanelHeader title="Results" value={`${results.total} games`} />
      <StackedResultBar results={results} />
      <div className="result-metrics">
        <Metric label="Wins" value={`${results.percentages.win}%`} />
        <Metric label="Losses" value={`${results.percentages.loss}%`} />
        <Metric label="Draws" value={`${results.percentages.draw}%`} />
      </div>
    </article>
  );
}

function TimeClassPanel({ entries }: { readonly entries: readonly TimeClassBreakdownEntry[] }) {
  return (
    <article className="panel">
      <PanelHeader title="Time Classes" value={`${entries.reduce((total, entry) => total + entry.total, 0)} games`} />
      <div className="row-list">
        {entries.length === 0
          ? emptyRows(["bullet", "blitz", "rapid", "daily"])
          : entries.map((entry) => (
              <BarRow
                key={entry.timeClass}
                label={entry.timeClass}
                value={`${entry.total}`}
                percentage={entry.percentage}
              />
            ))}
      </div>
    </article>
  );
}

function RatingPanel({ points }: { readonly points: readonly RatingTimelinePoint[] }) {
  return (
    <article className="panel wide-panel">
      <PanelHeader title="Rating Timeline" value={points.length === 0 ? "0 points" : `${points.length} points`} />
      <RatingSparkline points={points} />
    </article>
  );
}

function OpponentBucketsPanel({ buckets }: { readonly buckets: readonly OpponentRatingBucket[] }) {
  const maxTotal = Math.max(1, ...buckets.map((bucket) => bucket.counts.total));

  return (
    <article className="panel">
      <PanelHeader title="Opponent Ratings" value={`${buckets.length} ranges`} />
      <div className="row-list">
        {buckets.length === 0
          ? emptyRows(["1200-1299", "1300-1399", "1400-1499"])
          : buckets.map((bucket) => (
              <BarRow
                key={bucket.label}
                label={bucket.label}
                value={`${bucket.counts.win}/${bucket.counts.loss}/${bucket.counts.draw}`}
                percentage={(bucket.counts.total / maxTotal) * 100}
              />
            ))}
      </div>
    </article>
  );
}

function OpeningsPanel({ openings }: { readonly openings: readonly OpeningSummaryEntry[] }) {
  return (
    <article className="panel wide-panel">
      <PanelHeader title="Openings" value={`${openings.length} families`} />
      <div className="opening-list">
        {openings.length === 0
          ? emptyRows(["Sicilian Defense", "Italian Game", "Queen's Pawn Opening"])
          : openings.map((opening) => (
              <div className="opening-row" key={opening.openingFamily}>
                <div className="opening-meta">
                  <span>{opening.openingFamily}</span>
                  <span>{opening.counts.total}</span>
                </div>
                <StackedResultBar results={{ ...opening.counts, percentages: opening.percentages }} />
              </div>
            ))}
      </div>
    </article>
  );
}

function ImportPanel({ analysis }: { readonly analysis: PlayerAnalysis | null }) {
  const summary = analysis?.importSummary;

  return (
    <article className="panel">
      <PanelHeader title="Import" value={analysis?.username ?? "No player"} />
      <div className="result-metrics import-metrics">
        <Metric label="Archives" value={`${summary?.archiveCount ?? 0}`} />
        <Metric label="Downloaded" value={`${summary?.downloadedGameCount ?? 0}`} />
        <Metric label="Skipped" value={`${summary?.skippedGameCount ?? 0}`} />
      </div>
    </article>
  );
}

function PanelHeader({ title, value }: { readonly title: string; readonly value: string }) {
  return (
    <header className="panel-header">
      <h2>{title}</h2>
      <span>{value}</span>
    </header>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StackedResultBar({ results }: { readonly results: ResultBreakdown }) {
  return (
    <div className="stacked-bar" aria-label="Result percentages">
      <span className="wins" style={{ width: `${results.percentages.win}%` }} />
      <span className="losses" style={{ width: `${results.percentages.loss}%` }} />
      <span className="draws" style={{ width: `${results.percentages.draw}%` }} />
    </div>
  );
}

function RatingSparkline({ points }: { readonly points: readonly RatingTimelinePoint[] }) {
  const path = useMemo(() => buildPolyline(points), [points]);

  return (
    <div className="sparkline-frame">
      {points.length === 0 ? (
        <div className="empty-state">No data</div>
      ) : (
        <svg viewBox="0 0 100 42" role="img" aria-label="Rating timeline">
          <polyline points={path} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

function BarRow({
  label,
  value,
  percentage
}: {
  readonly label: string;
  readonly value: string;
  readonly percentage: number;
}) {
  return (
    <div className="bar-row">
      <div className="bar-meta">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="single-bar">
        <span style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
      </div>
    </div>
  );
}

function emptyRows(labels: readonly string[]) {
  return labels.map((label) => <BarRow key={label} label={label} value="0" percentage={0} />);
}

function buildPolyline(points: readonly RatingTimelinePoint[]): string {
  if (points.length === 1) {
    return "4,21 96,21";
  }

  const ratings = points.map((point) => point.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const span = Math.max(1, max - min);

  return points
    .map((point, index) => {
      const x = 4 + (index / Math.max(1, points.length - 1)) * 92;
      const y = 36 - ((point.rating - min) / span) * 30;

      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function statusLabel(isLoading: boolean, analysis: PlayerAnalysis | null, errorMessage: string | null): string {
  if (isLoading) {
    return "Running";
  }

  if (errorMessage !== null) {
    return "Needs attention";
  }

  return analysis === null ? "Ready" : "Updated";
}

function emptyResultBreakdown(): ResultBreakdown {
  return {
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
}
