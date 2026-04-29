import type { EndingCategory, NormalizedResult } from "./types.js";

const LOSS_RESULT_CODES = new Set(["abandoned", "checkmated", "lose", "resigned", "timeout"]);

const ENDING_BY_CODE = new Map<string, EndingCategory>([
  ["abandoned", "abandoned"],
  ["agreed", "agreement"],
  ["checkmated", "checkmate"],
  ["50move", "fifty_move"],
  ["insufficient", "insufficient_material"],
  ["repetition", "repetition"],
  ["resigned", "resignation"],
  ["stalemate", "stalemate"],
  ["timeout", "timeout"],
  ["timevsinsufficient", "time_vs_insufficient_material"]
]);

export function normalizeResultCode(resultCode: string): string {
  return resultCode.trim().toLowerCase();
}

export function mapResultCode(resultCode: string): NormalizedResult {
  const normalizedCode = normalizeResultCode(resultCode);

  if (normalizedCode === "win") {
    return "win";
  }

  if (LOSS_RESULT_CODES.has(normalizedCode)) {
    return "loss";
  }

  return "draw";
}

export function classifyEnding(playerResultCode: string, opponentResultCode: string): EndingCategory {
  const resultCodes = [playerResultCode, opponentResultCode].map(normalizeResultCode);

  for (const resultCode of resultCodes) {
    const ending = ENDING_BY_CODE.get(resultCode);
    if (ending !== undefined) {
      return ending;
    }
  }

  return "unknown";
}

