import type { NormalizedGameRecord } from "@chessinsights/domain";

import { filterByTimeClass } from "./shared.js";
import { buildResultBreakdown } from "./results.js";
import type { PlayerSummary, TimeClassFilter } from "./types.js";

export function buildPlayerSummary(
  records: readonly NormalizedGameRecord[],
  options: TimeClassFilter = {}
): PlayerSummary {
  const filteredRecords = filterByTimeClass(records, options.timeClass);

  return {
    totalGames: filteredRecords.length,
    results: buildResultBreakdown(filteredRecords),
    estimatedTimePlayedSeconds: filteredRecords.reduce(
      (totalSeconds, record) => totalSeconds + (record.estimatedTimePlayedSeconds ?? 0),
      0
    ),
    skippedEstimatedTimeGames: filteredRecords.filter((record) => record.estimatedTimePlayedSeconds === null).length
  };
}
