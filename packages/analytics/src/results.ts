import type { NormalizedGameRecord } from "@chessinsights/domain";

import { emptyResultCounts, filterByTimeClass, incrementResult, toResultBreakdown } from "./shared.js";
import type { ResultBreakdown, TimeClassFilter } from "./types.js";

export function buildResultBreakdown(
  records: readonly NormalizedGameRecord[],
  options: TimeClassFilter = {}
): ResultBreakdown {
  const counts = filterByTimeClass(records, options.timeClass).reduce(
    (currentCounts, record) => incrementResult(currentCounts, record.result),
    emptyResultCounts()
  );

  return toResultBreakdown(counts);
}

