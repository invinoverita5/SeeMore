import type { TimeClass } from "./types.js";

const SUPPORTED_TIME_CLASSES = new Set<TimeClass>(["bullet", "blitz", "rapid", "daily"]);

export function classifyTimeClass(rawTimeClass: string | undefined): TimeClass | null {
  if (rawTimeClass === undefined) {
    return null;
  }

  const normalizedTimeClass = rawTimeClass.trim().toLowerCase();

  if (SUPPORTED_TIME_CLASSES.has(normalizedTimeClass as TimeClass)) {
    return normalizedTimeClass as TimeClass;
  }

  return null;
}

