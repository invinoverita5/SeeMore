const CHESS_COM_USERNAME_PATTERN = /^[a-z0-9_-]{1,50}$/;
const MIN_ARCHIVE_YEAR = 2007;

export function normalizeChessComUsername(username: string): string {
  const normalizedUsername = username.trim().toLowerCase();

  if (!CHESS_COM_USERNAME_PATTERN.test(normalizedUsername)) {
    throw new TypeError("Chess.com username must be 1-50 characters using letters, numbers, underscores, or hyphens.");
  }

  return normalizedUsername;
}

export function formatArchiveYear(year: number): string {
  if (!Number.isInteger(year) || year < MIN_ARCHIVE_YEAR || year > 9999) {
    throw new TypeError(`Chess.com archive year must be an integer between ${MIN_ARCHIVE_YEAR} and 9999.`);
  }

  return String(year).padStart(4, "0");
}

export function formatArchiveMonth(month: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new TypeError("Chess.com archive month must be an integer from 1 to 12.");
  }

  return String(month).padStart(2, "0");
}

