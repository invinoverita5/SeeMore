import type { ProviderErrorKind, ProviderResponseMetadata } from "./types.js";

export class ChessComApiError extends Error {
  readonly kind: ProviderErrorKind;
  readonly status: number;
  readonly metadata: ProviderResponseMetadata;

  constructor(kind: ProviderErrorKind, status: number, metadata: ProviderResponseMetadata) {
    super(`Chess.com PubAPI request failed with ${status} (${kind})`);
    this.name = "ChessComApiError";
    this.kind = kind;
    this.status = status;
    this.metadata = metadata;
  }
}

