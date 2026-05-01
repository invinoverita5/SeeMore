import type { EndingCategory, NormalizedGameRecord, NormalizedResult } from "@chessinsights/domain";

import { filterByTimeClass, percentage } from "./shared.js";
import type { EndingBreakdownEntry, EndingBreakdowns, TimeClassFilter } from "./types.js";

const WIN_LOSS_ENDINGS: readonly EndingCategory[] = ["abandoned", "checkmate", "resignation", "timeout"];
const DRAW_ENDINGS: readonly EndingCategory[] = [
  "agreement",
  "stalemate",
  "repetition",
  "insufficient_material",
  "fifty_move",
  "time_vs_insufficient_material"
];

const ENDING_LABELS: Readonly<Record<EndingCategory, string>> = {
  abandoned: "Abandonment",
  agreement: "Agreement",
  checkmate: "Checkmate",
  fifty_move: "50-move rule",
  insufficient_material: "Insufficient material",
  repetition: "Repetition",
  resignation: "Resignation",
  stalemate: "Stalemate",
  timeout: "Timeout",
  time_vs_insufficient_material: "Time vs insufficient material",
  unknown: "Unknown"
};

export function buildEndingBreakdowns(
  records: readonly NormalizedGameRecord[],
  options: TimeClassFilter = {}
): EndingBreakdowns {
  const filteredRecords = filterByTimeClass(records, options.timeClass);

  return {
    wonBy: buildEntries(filteredRecords, "win", WIN_LOSS_ENDINGS),
    lostBy: buildEntries(filteredRecords, "loss", WIN_LOSS_ENDINGS),
    drawnBy: buildEntries(filteredRecords, "draw", DRAW_ENDINGS)
  };
}

function buildEntries(
  records: readonly NormalizedGameRecord[],
  result: NormalizedResult,
  preferredOrder: readonly EndingCategory[]
): EndingBreakdownEntry[] {
  const matchingRecords = records.filter((record) => record.result === result);
  const total = matchingRecords.length;
  const countsByEnding = new Map<EndingCategory, number>();

  for (const record of matchingRecords) {
    countsByEnding.set(record.ending, (countsByEnding.get(record.ending) ?? 0) + 1);
  }

  const orderedEndings = [
    ...preferredOrder,
    ...[...countsByEnding.keys()].filter((ending) => !preferredOrder.includes(ending)).sort()
  ];

  return orderedEndings
    .map((ending) => {
      const count = countsByEnding.get(ending) ?? 0;

      return {
        ending,
        label: ENDING_LABELS[ending],
        count,
        percentage: percentage(count, total)
      };
    })
    .filter((entry) => entry.count > 0 || preferredOrder.includes(entry.ending));
}
