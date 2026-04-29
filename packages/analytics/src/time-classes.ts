import type { NormalizedGameRecord, TimeClass } from "@chessinsights/domain";

import { percentage, TIME_CLASS_ORDER } from "./shared.js";
import type { TimeClassBreakdownEntry } from "./types.js";

export function getMostPlayedTimeClass(records: readonly NormalizedGameRecord[]): TimeClass | null {
  const counts = countByTimeClass(records);

  return TIME_CLASS_ORDER.reduce<TimeClass | null>((currentBest, timeClass) => {
    if (counts[timeClass] === 0) {
      return currentBest;
    }

    if (currentBest === null || counts[timeClass] > counts[currentBest]) {
      return timeClass;
    }

    return currentBest;
  }, null);
}

export function buildTimeClassBreakdown(records: readonly NormalizedGameRecord[]): TimeClassBreakdownEntry[] {
  const counts = countByTimeClass(records);
  const total = records.length;

  return TIME_CLASS_ORDER.map((timeClass) => ({
    timeClass,
    total: counts[timeClass],
    percentage: percentage(counts[timeClass], total)
  }));
}

function countByTimeClass(records: readonly NormalizedGameRecord[]): Record<TimeClass, number> {
  const counts: Record<TimeClass, number> = {
    bullet: 0,
    blitz: 0,
    rapid: 0,
    daily: 0
  };

  for (const record of records) {
    counts[record.timeClass] += 1;
  }

  return counts;
}

