import {
  type ChessComArchives,
  type ChessComMonthlyGames,
  type ChessComProfile,
  type ChessComStats,
  normalizeChessComUsername,
  type ProviderResponse
} from "@chessinsights/chesscom-client";
import { normalizeChessComGame } from "@chessinsights/domain";

import { parseMonthlyArchiveUrls } from "./archive-url.js";
import type { ChessComImportClient, ChessComImportResult, ImportOptions, ImportedArchive } from "./types.js";

export async function importChessComPlayer(
  client: ChessComImportClient,
  username: string,
  options: ImportOptions = {}
): Promise<ChessComImportResult> {
  const normalizedUsername = normalizeChessComUsername(username);
  options.onProgress?.({
    type: "import_started",
    username: normalizedUsername
  });

  const profileResponse = await client.getPlayerProfile(normalizedUsername);
  const profile = requireProviderData(profileResponse, "profile");
  options.onProgress?.({
    type: "profile_fetched",
    username: normalizedUsername,
    metadata: profileResponse.metadata
  });

  const statsResponse = await client.getPlayerStats(normalizedUsername);
  const stats = requireProviderData(statsResponse, "stats");
  options.onProgress?.({
    type: "stats_fetched",
    username: normalizedUsername,
    metadata: statsResponse.metadata
  });

  const archivesResponse = await client.getGameArchives(normalizedUsername);
  const archives = requireProviderData(archivesResponse, "archives");
  const { archiveMonths, skippedArchiveUrls } = parseMonthlyArchiveUrls(archives.archives, normalizedUsername);
  options.onProgress?.({
    type: "archives_listed",
    username: normalizedUsername,
    archiveCount: archiveMonths.length,
    skippedArchiveCount: skippedArchiveUrls.length,
    metadata: archivesResponse.metadata
  });

  const importedArchives: ImportedArchive[] = [];
  const records: ChessComImportResult["records"] = [];
  let skippedGames = 0;

  for (const archiveMonth of archiveMonths) {
    const monthlyResponse = await client.getMonthlyGames(normalizedUsername, archiveMonth.year, archiveMonth.month);
    const monthlyGames = requireProviderData(monthlyResponse, "monthly games");

    importedArchives.push({
      url: archiveMonth.url,
      year: archiveMonth.year,
      month: archiveMonth.month,
      gameCount: monthlyGames.games.length,
      metadata: monthlyResponse.metadata
    });

    options.onProgress?.({
      type: "archive_fetched",
      username: normalizedUsername,
      year: archiveMonth.year,
      month: archiveMonth.month,
      gameCount: monthlyGames.games.length,
      metadata: monthlyResponse.metadata
    });

    for (const game of monthlyGames.games) {
      const record = normalizeChessComGame(game, normalizedUsername);

      if (record === null) {
        skippedGames += 1;
        continue;
      }

      records.push(record);
    }
  }

  options.onProgress?.({
    type: "import_completed",
    username: normalizedUsername,
    archiveCount: importedArchives.length,
    recordCount: records.length,
    skippedGames
  });

  return {
    username: normalizedUsername,
    profile,
    stats,
    archivesResponse: archives,
    archives: importedArchives,
    records,
    skippedGames,
    skippedArchiveUrls
  };
}

function requireProviderData<TData>(
  response: ProviderResponse<TData>,
  label: "archives" | "monthly games" | "profile" | "stats"
): TData {
  if (response.data === null) {
    throw new Error(`Chess.com ${label} response did not include data.`);
  }

  return response.data;
}

export type { ChessComArchives, ChessComMonthlyGames, ChessComProfile, ChessComStats };

