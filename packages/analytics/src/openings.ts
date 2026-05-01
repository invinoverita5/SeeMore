import type { NormalizedGameRecord } from "@chessinsights/domain";

import {
  compareByCountDescThenNameAsc,
  emptyResultCounts,
  filterByPlayerColor,
  filterByTimeClass,
  incrementResult,
  toPercentages
} from "./shared.js";
import type { OpeningSummaryEntry, OpeningSummaryOptions } from "./types.js";

export function buildOpeningSummary(
  records: readonly NormalizedGameRecord[],
  options: OpeningSummaryOptions = {}
): OpeningSummaryEntry[] {
  const limit = validateLimit(options.limit);
  const entriesByFamily = new Map<string, OpeningSummaryEntry>();
  const recordsByTimeClass = filterByTimeClass(records, options.timeClass);

  for (const record of filterByPlayerColor(recordsByTimeClass, options.playerColor)) {
    const existingEntry = entriesByFamily.get(record.openingFamily) ?? {
      openingFamily: record.openingFamily,
      counts: emptyResultCounts(),
      percentages: toPercentages(emptyResultCounts())
    };
    const counts = incrementResult(existingEntry.counts, record.result);

    entriesByFamily.set(record.openingFamily, {
      ...existingEntry,
      counts,
      percentages: toPercentages(counts)
    });
  }

  const entries = [...entriesByFamily.values()].sort((left, right) =>
    compareByCountDescThenNameAsc(left.openingFamily, left.counts.total, right.openingFamily, right.counts.total)
  );

  return limit === undefined ? entries : entries.slice(0, limit);
}

function validateLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) {
    return undefined;
  }

  if (!Number.isInteger(limit) || limit < 0) {
    throw new TypeError("Opening summary limit must be a non-negative integer.");
  }

  return limit;
}
