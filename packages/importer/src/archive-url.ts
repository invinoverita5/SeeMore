import { formatArchiveMonth, formatArchiveYear, normalizeChessComUsername } from "@chessinsights/chesscom-client";

import type { ImportArchiveMonth } from "./types.js";

const CHESS_COM_API_ORIGIN = "https://api.chess.com";

export function parseMonthlyArchiveUrl(url: string, username: string): ImportArchiveMonth | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.origin !== CHESS_COM_API_ORIGIN) {
    return null;
  }

  const expectedUsername = normalizeChessComUsername(username);
  const segments = parsedUrl.pathname.split("/").filter(Boolean);

  if (
    segments.length !== 6 ||
    segments[0] !== "pub" ||
    segments[1] !== "player" ||
    segments[2]?.toLowerCase() !== expectedUsername ||
    segments[3] !== "games"
  ) {
    return null;
  }

  const year = Number(segments[4]);
  const month = Number(segments[5]);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  try {
    formatArchiveYear(year);
    formatArchiveMonth(month);
  } catch {
    return null;
  }

  return {
    url: parsedUrl.href,
    year,
    month
  };
}

export function parseMonthlyArchiveUrls(
  archiveUrls: readonly string[],
  username: string
): { readonly archiveMonths: ImportArchiveMonth[]; readonly skippedArchiveUrls: string[] } {
  const archiveMonths: ImportArchiveMonth[] = [];
  const skippedArchiveUrls: string[] = [];
  const seenArchiveKeys = new Set<string>();

  for (const archiveUrl of archiveUrls) {
    const archiveMonth = parseMonthlyArchiveUrl(archiveUrl, username);

    if (archiveMonth === null) {
      skippedArchiveUrls.push(archiveUrl);
      continue;
    }

    const archiveKey = `${archiveMonth.year}-${archiveMonth.month}`;

    if (seenArchiveKeys.has(archiveKey)) {
      continue;
    }

    seenArchiveKeys.add(archiveKey);
    archiveMonths.push(archiveMonth);
  }

  return {
    archiveMonths,
    skippedArchiveUrls
  };
}
