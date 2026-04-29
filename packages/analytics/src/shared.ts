import type { NormalizedGameRecord, NormalizedResult, TimeClass } from "@chessinsights/domain";

import type { ResultBreakdown, ResultCounts, ResultPercentages } from "./types.js";

export const TIME_CLASS_ORDER: readonly TimeClass[] = ["bullet", "blitz", "rapid", "daily"];

export function emptyResultCounts(): ResultCounts {
  return {
    total: 0,
    win: 0,
    loss: 0,
    draw: 0
  };
}

export function incrementResult(counts: ResultCounts, result: NormalizedResult): ResultCounts {
  return {
    ...counts,
    total: counts.total + 1,
    [result]: counts[result] + 1
  };
}

export function toResultBreakdown(counts: ResultCounts): ResultBreakdown {
  return {
    ...counts,
    percentages: toPercentages(counts)
  };
}

export function toPercentages(counts: ResultCounts): ResultPercentages {
  return {
    win: percentage(counts.win, counts.total),
    loss: percentage(counts.loss, counts.total),
    draw: percentage(counts.draw, counts.total)
  };
}

export function percentage(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 1000) / 10;
}

export function filterByTimeClass(
  records: readonly NormalizedGameRecord[],
  timeClass: TimeClass | undefined
): NormalizedGameRecord[] {
  if (timeClass === undefined) {
    return [...records];
  }

  return records.filter((record) => record.timeClass === timeClass);
}

export function compareByCountDescThenNameAsc(
  leftName: string,
  leftCount: number,
  rightName: string,
  rightCount: number
): number {
  if (leftCount !== rightCount) {
    return rightCount - leftCount;
  }

  return leftName.localeCompare(rightName);
}

