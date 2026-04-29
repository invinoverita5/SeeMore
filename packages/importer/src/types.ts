import type {
  ChessComArchives,
  ChessComClient,
  ChessComMonthlyGames,
  ChessComProfile,
  ChessComStats,
  ProviderResponseMetadata
} from "@chessinsights/chesscom-client";
import type { NormalizedGameRecord } from "@chessinsights/domain";

export type ChessComImportClient = Pick<
  ChessComClient,
  "getGameArchives" | "getMonthlyGames" | "getPlayerProfile" | "getPlayerStats"
>;

export interface ImportArchiveMonth {
  readonly url: string;
  readonly year: number;
  readonly month: number;
}

export interface ImportedArchive {
  readonly url: string;
  readonly year: number;
  readonly month: number;
  readonly gameCount: number;
  readonly metadata: ProviderResponseMetadata;
}

export interface ChessComImportResult {
  readonly username: string;
  readonly profile: ChessComProfile;
  readonly stats: ChessComStats;
  readonly archivesResponse: ChessComArchives;
  readonly archives: ImportedArchive[];
  readonly records: NormalizedGameRecord[];
  readonly skippedGames: number;
  readonly skippedArchiveUrls: string[];
}

export type ImportProgressEvent =
  | {
      readonly type: "import_started";
      readonly username: string;
    }
  | {
      readonly type: "profile_fetched";
      readonly username: string;
      readonly metadata: ProviderResponseMetadata;
    }
  | {
      readonly type: "stats_fetched";
      readonly username: string;
      readonly metadata: ProviderResponseMetadata;
    }
  | {
      readonly type: "archives_listed";
      readonly username: string;
      readonly archiveCount: number;
      readonly skippedArchiveCount: number;
      readonly metadata: ProviderResponseMetadata;
    }
  | {
      readonly type: "archive_fetched";
      readonly username: string;
      readonly year: number;
      readonly month: number;
      readonly gameCount: number;
      readonly metadata: ProviderResponseMetadata;
    }
  | {
      readonly type: "import_completed";
      readonly username: string;
      readonly archiveCount: number;
      readonly recordCount: number;
      readonly skippedGames: number;
    };

export interface ImportOptions {
  readonly onProgress?: (event: ImportProgressEvent) => void;
}

export type MonthlyGamesResponse = ChessComMonthlyGames;

