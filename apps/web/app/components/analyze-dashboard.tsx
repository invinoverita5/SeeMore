"use client";

import type {
  EndingBreakdownEntry,
  OpeningSummaryEntry,
  OpponentRatingBucket,
  RatingTimelinePoint,
  ResultBreakdown
} from "@chessinsights/analytics";
import type { PlayerAnalysis } from "@chessinsights/analysis";
import type { PlayerColor, TimeClass } from "@chessinsights/domain";
import type { FormEvent, PointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type TimeClassFilter = TimeClass | "all";
type PlayerColorFilter = PlayerColor | "all";

interface AnalyzeApiResponse {
  readonly analysis?: PlayerAnalysis;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

interface ChartPoint {
  readonly x: number;
  readonly y: number;
  readonly point: RatingTimelinePoint;
}

interface ZoomRange {
  readonly start: number;
  readonly end: number;
}

const TIME_CLASS_FILTERS: readonly TimeClassFilter[] = ["all", "bullet", "blitz", "rapid", "daily"];
const OPENING_COLOR_FILTERS: readonly PlayerColorFilter[] = ["all", "white", "black"];
const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const DONUT_COLORS: readonly string[] = ["#21735f", "#3768a6", "#b7822d", "#8a7f6a", "#b94a48", "#5d6b99", "#925a39"];

export function AnalyzeDashboard() {
  const [username, setUsername] = useState("");
  const [activeTimeClass, setActiveTimeClass] = useState<TimeClassFilter>("all");
  const [activeOpeningPlayerColor, setActiveOpeningPlayerColor] = useState<PlayerColorFilter>("all");
  const [analyzedUsername, setAnalyzedUsername] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PlayerAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasAnalysis = analysis !== null;
  const activeResults = analysis?.aggregates.summary.results ?? emptyResultBreakdown();

  async function submitAnalysis(
    nextTimeClass: TimeClassFilter = activeTimeClass,
    nextOpeningPlayerColor: PlayerColorFilter = activeOpeningPlayerColor,
    targetUsername = username
  ) {
    const trimmedUsername = targetUsername.trim();

    if (trimmedUsername.length === 0) {
      setAnalyzedUsername(null);
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

      params.set("ratingTimeClass", nextTimeClass);

      if (nextTimeClass !== "all") {
        params.set("timeClass", nextTimeClass);
      }

      if (nextOpeningPlayerColor !== "all") {
        params.set("openingPlayerColor", nextOpeningPlayerColor);
      }

      const response = await fetch(`/api/analyze?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || payload.analysis === undefined) {
        throw new Error(payload.error?.message ?? "Analysis failed.");
      }

      setAnalysis(payload.analysis);
      setAnalyzedUsername(payload.analysis.username);
    } catch (error) {
      setAnalyzedUsername(null);
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

    if (hasAnalysis && analyzedUsername !== null) {
      void submitAnalysis(timeClass, activeOpeningPlayerColor, analyzedUsername);
    }
  }

  function selectOpeningPlayerColor(playerColor: PlayerColorFilter) {
    setActiveOpeningPlayerColor(playerColor);

    if (hasAnalysis && analyzedUsername !== null) {
      void submitAnalysis(activeTimeClass, playerColor, analyzedUsername);
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
              placeholder="zac_88"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Analyzing" : "Analyze"}
            </button>
          </div>
        </form>
      </section>

      {errorMessage === null ? null : (
        <section className="error-panel" role="alert">
          {errorMessage}
        </section>
      )}

      <PlayerSummaryPanel
        analysis={analysis}
        results={activeResults}
        activeTimeClass={activeTimeClass}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onSelectTimeClass={selectTimeClass}
      />

      <section className="dashboard-grid" aria-label="Analysis dashboard">
        <RatingPanel points={analysis?.aggregates.ratingTimeline.points ?? []} />
        <OpeningsPanel
          openings={analysis?.aggregates.openingSummary ?? []}
          activePlayerColor={activeOpeningPlayerColor}
          isLoading={isLoading}
          onSelectPlayerColor={selectOpeningPlayerColor}
        />
        <OpponentBucketsPanel buckets={analysis?.aggregates.opponentRatingBuckets.buckets ?? []} />
        <EndingPanel title="Games Won By" entries={analysis?.aggregates.endingBreakdowns.wonBy ?? []} />
        <EndingPanel title="Games Lost By" entries={analysis?.aggregates.endingBreakdowns.lostBy ?? []} />
        <EndingPanel title="Games Drawn By" entries={analysis?.aggregates.endingBreakdowns.drawnBy ?? []} />
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

function PlayerSummaryPanel({
  analysis,
  results,
  activeTimeClass,
  isLoading,
  errorMessage,
  onSelectTimeClass
}: {
  readonly analysis: PlayerAnalysis | null;
  readonly results: ResultBreakdown;
  readonly activeTimeClass: TimeClassFilter;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly onSelectTimeClass: (timeClass: TimeClassFilter) => void;
}) {
  const summary = analysis?.aggregates.summary;
  const totalGames = summary?.totalGames ?? results.total;
  const estimatedTimePlayedSeconds = summary?.estimatedTimePlayedSeconds ?? 0;
  const skippedEstimatedTimeGames = summary?.skippedEstimatedTimeGames ?? 0;

  return (
    <section className="summary-panel" aria-label="Player summary">
      <div className="summary-heading">
        <div>
          <p className="eyebrow">Player Summary</p>
          <h2>{analysis?.username ?? "No player"}</h2>
        </div>
        <div className="status-pill">{statusLabel(isLoading, analysis, errorMessage)}</div>
      </div>

      <div className="summary-stats">
        <Metric label="Total games" value={formatInteger(totalGames)} />
        <Metric
          label="Time played"
          value={formatDuration(estimatedTimePlayedSeconds)}
          title={
            skippedEstimatedTimeGames === 0
              ? "Estimated from Chess.com time controls."
              : `Estimated from Chess.com time controls; ${skippedEstimatedTimeGames} games had no live clock estimate.`
          }
        />
      </div>

      <StackedResultBar results={results} />

      <div className="result-metrics">
        <ResultMetric label="Wins" result="win" count={results.win} percentage={results.percentages.win} />
        <ResultMetric label="Draws" result="draw" count={results.draw} percentage={results.percentages.draw} />
        <ResultMetric label="Losses" result="loss" count={results.loss} percentage={results.percentages.loss} />
      </div>

      <SegmentedControl
        label="Time class"
        values={TIME_CLASS_FILTERS}
        activeValue={activeTimeClass}
        disabled={isLoading}
        onSelect={onSelectTimeClass}
      />
    </section>
  );
}

function RatingPanel({ points }: { readonly points: readonly RatingTimelinePoint[] }) {
  return (
    <article className="panel full-panel">
      <PanelHeader title="ELO Over Time" value={points.length === 0 ? "0 games" : `${formatInteger(points.length)} games`} />
      <RatingLineChart points={points} />
    </article>
  );
}

function RatingLineChart({ points }: { readonly points: readonly RatingTimelinePoint[] }) {
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const normalizedZoomRange = normalizeZoomRange(zoomRange, points.length);
  const visiblePoints =
    normalizedZoomRange === null ? points : points.slice(normalizedZoomRange.start, normalizedZoomRange.end + 1);
  const zoomStartOffset = normalizedZoomRange?.start ?? 0;
  const chartPoints = useMemo(() => buildRatingChartPoints(visiblePoints), [visiblePoints]);
  const path = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const brush = buildBrush(dragStart, dragEnd, visiblePoints.length);

  useEffect(() => {
    setZoomRange(null);
    setDragStart(null);
    setDragEnd(null);
  }, [points]);

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (visiblePoints.length < 2) {
      return;
    }

    const index = indexFromPointer(event, visiblePoints.length);
    setDragStart(index);
    setDragEnd(index);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (dragStart === null) {
      return;
    }

    setDragEnd(indexFromPointer(event, visiblePoints.length));
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (dragStart === null || dragEnd === null) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);

    if (end - start >= 1) {
      setZoomRange({
        start: zoomStartOffset + start,
        end: zoomStartOffset + end
      });
    }

    setDragStart(null);
    setDragEnd(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (points.length === 0) {
    return <div className="chart-empty">No rating data</div>;
  }

  return (
    <div className="rating-chart-frame">
      <svg
        viewBox="0 0 100 56"
        role="img"
        aria-label="ELO rating timeline"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragStart(null);
          setDragEnd(null);
        }}
      >
        <g className="chart-grid" aria-hidden="true">
          <line x1="6" x2="96" y1="8" y2="8" />
          <line x1="6" x2="96" y1="26" y2="26" />
          <line x1="6" x2="96" y1="44" y2="44" />
        </g>
        <polyline points={path} fill="none" className="rating-line" vectorEffect="non-scaling-stroke" />
        {chartPoints.map((chartPoint) => (
          <a
            key={`${chartPoint.point.gameUrl}-${chartPoint.point.playedAt}`}
            href={chartPoint.point.gameUrl}
            target="_blank"
            rel="noreferrer"
          >
            <circle
              className={`rating-point ${chartPoint.point.result}`}
              cx={chartPoint.x}
              cy={chartPoint.y}
              r="1.65"
            />
            <title>
              {`${formatInteger(chartPoint.point.rating)} ELO, ${chartPoint.point.result}, ${formatDate(chartPoint.point.playedAt)}`}
            </title>
          </a>
        ))}
        {brush === null ? null : <rect className="zoom-brush" x={brush.x} y="6" width={brush.width} height="40" />}
      </svg>
      <div className="chart-axis">
        <span>{formatDate(visiblePoints[0]?.playedAt)}</span>
        <span>{ratingRangeLabel(visiblePoints)}</span>
        <span>{formatDate(visiblePoints.at(-1)?.playedAt)}</span>
      </div>
      {normalizedZoomRange === null ? null : (
        <button className="text-button" type="button" onClick={() => setZoomRange(null)}>
          Reset zoom
        </button>
      )}
    </div>
  );
}

function OpeningsPanel({
  openings,
  activePlayerColor,
  isLoading,
  onSelectPlayerColor
}: {
  readonly openings: readonly OpeningSummaryEntry[];
  readonly activePlayerColor: PlayerColorFilter;
  readonly isLoading: boolean;
  readonly onSelectPlayerColor: (playerColor: PlayerColorFilter) => void;
}) {
  return (
    <article className="panel wide-panel">
      <PanelHeader title="Top Openings" value={`${formatInteger(openings.length)} openings`} />
      <SegmentedControl
        label="Opening color perspective"
        values={OPENING_COLOR_FILTERS}
        activeValue={activePlayerColor}
        disabled={isLoading}
        onSelect={onSelectPlayerColor}
      />
      <OpeningBarChart openings={openings} />
    </article>
  );
}

function OpeningBarChart({ openings }: { readonly openings: readonly OpeningSummaryEntry[] }) {
  const maxTotal = Math.max(1, ...openings.map((opening) => opening.counts.total));

  if (openings.length === 0) {
    return <div className="chart-empty">No opening data</div>;
  }

  return (
    <div className="vertical-chart opening-chart" aria-label="Top openings stacked by result">
      {openings.map((opening) => (
        <StackedVerticalBar
          key={opening.openingFamily}
          label={opening.openingFamily}
          total={opening.counts.total}
          maxTotal={maxTotal}
          results={{ ...opening.counts, percentages: opening.percentages }}
        />
      ))}
    </div>
  );
}

function OpponentBucketsPanel({ buckets }: { readonly buckets: readonly OpponentRatingBucket[] }) {
  return (
    <article className="panel wide-panel">
      <PanelHeader title="Result by Opponent Rating" value={`${formatInteger(buckets.length)} ranges`} />
      {buckets.length === 0 ? (
        <div className="chart-empty">No opponent rating data</div>
      ) : (
        <div className="vertical-chart bucket-chart" aria-label="Opponent rating ranges stacked by result percentage">
          {buckets.map((bucket) => (
            <StackedVerticalBar
              key={bucket.label}
              label={bucket.label}
              total={bucket.counts.total}
              maxTotal={bucket.counts.total}
              results={{ ...bucket.counts, percentages: bucket.percentages }}
              normalized
            />
          ))}
        </div>
      )}
    </article>
  );
}

function StackedVerticalBar({
  label,
  total,
  maxTotal,
  results,
  normalized = false
}: {
  readonly label: string;
  readonly total: number;
  readonly maxTotal: number;
  readonly results: ResultBreakdown;
  readonly normalized?: boolean;
}) {
  const height = normalized ? 100 : Math.max(8, (total / maxTotal) * 100);

  return (
    <div className="vertical-bar-item">
      <div className="vertical-bar-shell">
        <div className="vertical-bar-stack" style={{ height: `${height}%` }}>
          <span className="wins" style={{ height: `${results.percentages.win}%` }} title={`${results.win} wins`} />
          <span className="draws" style={{ height: `${results.percentages.draw}%` }} title={`${results.draw} draws`} />
          <span className="losses" style={{ height: `${results.percentages.loss}%` }} title={`${results.loss} losses`} />
        </div>
      </div>
      <strong>{formatInteger(total)}</strong>
      <span>{label}</span>
    </div>
  );
}

function EndingPanel({ title, entries }: { readonly title: string; readonly entries: readonly EndingBreakdownEntry[] }) {
  const total = entries.reduce((currentTotal, entry) => currentTotal + entry.count, 0);

  return (
    <article className="panel">
      <PanelHeader title={title} value={`${formatInteger(total)} games`} />
      <DonutChart entries={entries} />
    </article>
  );
}

function DonutChart({ entries }: { readonly entries: readonly EndingBreakdownEntry[] }) {
  const total = entries.reduce((currentTotal, entry) => currentTotal + entry.count, 0);
  const positiveEntries = entries.filter((entry) => entry.count > 0);
  let offset = 25;

  if (total === 0) {
    return <div className="chart-empty">No ending data</div>;
  }

  return (
    <div className="donut-layout">
      <svg viewBox="0 0 42 42" className="donut-chart" role="img" aria-label="Ending method distribution">
        <circle className="donut-track" cx="21" cy="21" r="15.9155" />
        {positiveEntries.map((entry, index) => {
          const dashOffset = offset;
          offset -= entry.percentage;

          return (
            <circle
              key={entry.ending}
              className="donut-segment"
              cx="21"
              cy="21"
              r="15.9155"
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeDasharray={`${entry.percentage} ${100 - entry.percentage}`}
              strokeDashoffset={dashOffset}
            >
              <title>{`${entry.label}: ${formatInteger(entry.count)} (${formatPercentage(entry.percentage)}%)`}</title>
            </circle>
          );
        })}
        <text x="21" y="21" textAnchor="middle" dominantBaseline="middle">
          {formatInteger(total)}
        </text>
      </svg>
      <div className="donut-legend">
        {entries.map((entry) => (
          <div key={entry.ending} className="legend-row">
            <span style={{ background: donutLegendColor(entry, positiveEntries) }} />
            <small>{entry.label}</small>
            <strong>{formatInteger(entry.count)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function donutLegendColor(
  entry: EndingBreakdownEntry,
  positiveEntries: readonly EndingBreakdownEntry[]
): string {
  const segmentIndex = positiveEntries.findIndex((positiveEntry) => positiveEntry.ending === entry.ending);

  return segmentIndex === -1 ? "#e5ebe2" : (DONUT_COLORS[segmentIndex % DONUT_COLORS.length] ?? "#e5ebe2");
}

function PanelHeader({ title, value }: { readonly title: string; readonly value: string }) {
  return (
    <header className="panel-header">
      <h2>{title}</h2>
      <span>{value}</span>
    </header>
  );
}

function Metric({ label, value, title }: { readonly label: string; readonly value: string; readonly title?: string }) {
  return (
    <div className="metric" title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultMetric({
  label,
  result,
  count,
  percentage
}: {
  readonly label: string;
  readonly result: "draw" | "loss" | "win";
  readonly count: number;
  readonly percentage: number;
}) {
  return (
    <div className={`metric result-metric ${result}`}>
      <span>{label}</span>
      <strong>{formatInteger(count)}</strong>
      <small>{formatPercentage(percentage)}%</small>
    </div>
  );
}

function SegmentedControl<TValue extends string>({
  label,
  values,
  activeValue,
  disabled,
  onSelect
}: {
  readonly label: string;
  readonly values: readonly TValue[];
  readonly activeValue: TValue;
  readonly disabled: boolean;
  readonly onSelect: (value: TValue) => void;
}) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {values.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={activeValue === value}
          onClick={() => onSelect(value)}
          disabled={disabled}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function StackedResultBar({ results }: { readonly results: ResultBreakdown }) {
  return (
    <div className="stacked-bar" aria-label="Result percentages">
      <span className="wins" style={{ width: `${results.percentages.win}%` }} />
      <span className="draws" style={{ width: `${results.percentages.draw}%` }} />
      <span className="losses" style={{ width: `${results.percentages.loss}%` }} />
    </div>
  );
}

function buildRatingChartPoints(points: readonly RatingTimelinePoint[]): ChartPoint[] {
  if (points.length === 1) {
    const [point] = points;

    return point === undefined ? [] : [{ x: 51, y: 26, point }];
  }

  const ratings = points.map((point) => point.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const span = Math.max(1, max - min);

  return points.map((point, index) => {
    const x = 6 + (index / Math.max(1, points.length - 1)) * 90;
    const y = 44 - ((point.rating - min) / span) * 36;

    return {
      x: round(x),
      y: round(y),
      point
    };
  });
}

function normalizeZoomRange(zoomRange: ZoomRange | null, pointCount: number): ZoomRange | null {
  if (zoomRange === null || pointCount < 2) {
    return null;
  }

  const start = Math.max(0, Math.min(zoomRange.start, pointCount - 1));
  const end = Math.max(start, Math.min(zoomRange.end, pointCount - 1));

  return end - start < 1 ? null : { start, end };
}

function buildBrush(start: number | null, end: number | null, pointCount: number): { x: number; width: number } | null {
  if (start === null || end === null || pointCount < 2) {
    return null;
  }

  const minIndex = Math.min(start, end);
  const maxIndex = Math.max(start, end);
  const x = 6 + (minIndex / (pointCount - 1)) * 90;
  const width = ((maxIndex - minIndex) / (pointCount - 1)) * 90;

  return {
    x: round(x),
    width: round(width)
  };
}

function indexFromPointer(event: PointerEvent<SVGSVGElement>, pointCount: number): number {
  const rect = event.currentTarget.getBoundingClientRect();

  if (rect.width <= 0) {
    return 0;
  }

  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

  return Math.round(ratio * (pointCount - 1));
}

function ratingRangeLabel(points: readonly RatingTimelinePoint[]): string {
  if (points.length === 0) {
    return "0 ELO";
  }

  const ratings = points.map((point) => point.rating);

  return `${formatInteger(Math.min(...ratings))}-${formatInteger(Math.max(...ratings))} ELO`;
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

function formatDate(value: string | undefined): string {
  if (value === undefined) {
    return "";
  }

  return value.slice(0, 10);
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatInteger(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function formatPercentage(value: number): string {
  return value.toFixed(1);
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
