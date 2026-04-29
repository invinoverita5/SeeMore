const RESULT_TOKENS = new Set(["*", "0-1", "1-0", "1/2-1/2"]);

export function readPgnHeader(pgn: string, headerName: string): string | null {
  const escapedHeaderName = escapeRegExp(headerName);
  const headerPattern = new RegExp(`\\[${escapedHeaderName}\\s+"((?:\\\\.|[^"\\\\])*)"\\]`);
  const match = headerPattern.exec(pgn);
  const value = match?.[1];

  if (value === undefined) {
    return null;
  }

  return value.replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
}

export function countPlyFromPgn(pgn: string): number {
  const movetext = stripHeaders(pgn);
  const withoutVariations = stripBalancedSections(movetext, "(", ")");
  const withoutComments = stripBalancedSections(withoutVariations, "{", "}");
  const withoutLineComments = withoutComments.replace(/;[^\n\r]*/g, " ");
  const tokens = withoutLineComments.split(/\s+/);

  return tokens.reduce((count, token) => {
    const moveToken = normalizeMoveToken(token);
    return moveToken === null ? count : count + 1;
  }, 0);
}

export function countFullMovesFromPgn(pgn: string): number {
  return Math.ceil(countPlyFromPgn(pgn) / 2);
}

function stripHeaders(pgn: string): string {
  return pgn
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("["))
    .join("\n");
}

function stripBalancedSections(input: string, open: string, close: string): string {
  let depth = 0;
  let output = "";

  for (const character of input) {
    if (character === open) {
      depth += 1;
      output += " ";
      continue;
    }

    if (character === close && depth > 0) {
      depth -= 1;
      output += " ";
      continue;
    }

    if (depth === 0) {
      output += character;
    }
  }

  return output;
}

function normalizeMoveToken(token: string): string | null {
  const withoutMoveNumber = token.trim().replace(/^\d+\.(?:\.\.)?/, "");
  const withoutAnnotations = withoutMoveNumber.replace(/\$\d+/g, "").replace(/[!?]+$/g, "");

  if (withoutAnnotations.length === 0) {
    return null;
  }

  if (RESULT_TOKENS.has(withoutAnnotations)) {
    return null;
  }

  if (/^\d+\.(?:\.\.)?$/.test(withoutAnnotations)) {
    return null;
  }

  return withoutAnnotations;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

