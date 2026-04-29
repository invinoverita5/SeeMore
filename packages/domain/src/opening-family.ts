import { readPgnHeader } from "./pgn.js";

const UNKNOWN_OPENING = "Unknown";

const OPENING_FAMILIES = [
  "Queen's Gambit",
  "King's Indian Defense",
  "Nimzo-Indian Defense",
  "Queen's Indian Defense",
  "Caro-Kann Defense",
  "Sicilian Defense",
  "French Defense",
  "Scandinavian Defense",
  "Alekhine Defense",
  "Philidor Defense",
  "Pirc Defense",
  "Modern Defense",
  "Italian Game",
  "Ruy Lopez",
  "Spanish Game",
  "Scotch Game",
  "Vienna Game",
  "Four Knights Game",
  "Bishop's Opening",
  "English Opening",
  "Reti Opening",
  "Catalan Opening",
  "London System",
  "Slav Defense",
  "Dutch Defense",
  "Benoni Defense",
  "Benko Gambit",
  "King's Pawn Opening",
  "Queen's Pawn Opening",
  "Indian Game"
];

export function extractOpeningName(pgn: string, ecoUrl?: string): string {
  const headerOpening = readPgnHeader(pgn, "Opening");

  if (headerOpening !== null && headerOpening.trim().length > 0) {
    return normalizeOpeningLabel(headerOpening);
  }

  const headerEcoUrl = readPgnHeader(pgn, "ECOUrl");
  const sourceUrl = ecoUrl ?? headerEcoUrl;

  if (sourceUrl === undefined || sourceUrl === null || sourceUrl.trim().length === 0) {
    return UNKNOWN_OPENING;
  }

  return openingNameFromUrl(sourceUrl);
}

export function openingNameFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).at(-1);

    if (lastSegment === undefined) {
      return UNKNOWN_OPENING;
    }

    return openingNameFromPathSegment(lastSegment);
  } catch {
    const rawPath = url.split(/[?#]/)[0] ?? "";
    const fallbackSegment = rawPath.split("/").filter(Boolean).at(-1);

    if (fallbackSegment === undefined) {
      return UNKNOWN_OPENING;
    }

    return openingNameFromPathSegment(fallbackSegment);
  }
}

export function toOpeningFamily(openingName: string): string {
  const normalizedOpeningName = normalizeOpeningLabel(openingName);

  if (normalizedOpeningName === UNKNOWN_OPENING) {
    return UNKNOWN_OPENING;
  }

  const normalizedSearchName = normalizeForSearch(normalizedOpeningName);
  const family = OPENING_FAMILIES.find((candidateFamily) =>
    normalizedSearchName.startsWith(normalizeForSearch(candidateFamily))
  );

  if (family !== undefined) {
    return family;
  }

  return normalizeOpeningLabel(normalizedOpeningName.split(":")[0] ?? normalizedOpeningName);
}

function normalizeOpeningLabel(openingName: string): string {
  const normalizedOpeningName = openingName.replace(/\s+/g, " ").trim();
  return normalizedOpeningName.length === 0 ? UNKNOWN_OPENING : normalizedOpeningName;
}

function openingNameFromPathSegment(pathSegment: string): string {
  try {
    return normalizeOpeningLabel(decodeURIComponent(pathSegment).replace(/-/g, " "));
  } catch {
    return normalizeOpeningLabel(pathSegment.replace(/-/g, " "));
  }
}

function normalizeForSearch(openingName: string): string {
  return openingName
    .toLowerCase()
    .replace(/queens/g, "queen's")
    .replace(/kings/g, "king's")
    .replace(/reti/g, "reti")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
