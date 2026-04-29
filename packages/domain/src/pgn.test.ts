import { describe, expect, it } from "vitest";

import { countFullMovesFromPgn, countPlyFromPgn, readPgnHeader } from "./pgn.js";

describe("PGN helpers", () => {
  it("reads escaped PGN header values", () => {
    const pgn = String.raw`[Opening "Queen's Gambit Declined: Albin Countergambit"]
[Annotator "A \"quoted\" value"]

1. d4 d5 2. c4 e5 0-1`;

    expect(readPgnHeader(pgn, "Opening")).toBe("Queen's Gambit Declined: Albin Countergambit");
    expect(readPgnHeader(pgn, "Annotator")).toBe('A "quoted" value');
  });

  it("counts mainline plies while ignoring comments, annotations, variations, and result tokens", () => {
    const pgn = `[Event "Live Chess"]

1. e4! {mainline} e5 (1... c5 2. Nf3) 2. Nf3 $1 Nc6 3. Bb5 a6 1-0`;

    expect(countPlyFromPgn(pgn)).toBe(6);
    expect(countFullMovesFromPgn(pgn)).toBe(3);
  });
});

