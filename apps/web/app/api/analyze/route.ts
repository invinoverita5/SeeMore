import { analyzeChessComPlayer } from "@chessinsights/analysis";
import { createChessComClient } from "@chessinsights/chesscom-client";
import { NextResponse } from "next/server";

import { parseAnalyzeSearchParams, toAnalyzeErrorResponse } from "../../lib/analyze-request.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const parsedRequest = parseAnalyzeSearchParams(new URL(request.url).searchParams);
    const { username, ...analysisOptions } = parsedRequest;
    const analysis = await analyzeChessComPlayer(createApiClient(), username, analysisOptions);

    return NextResponse.json(
      {
        analysis
      },
      {
        headers: noStoreHeaders()
      }
    );
  } catch (error) {
    const response = toAnalyzeErrorResponse(error);

    return NextResponse.json(response.body, {
      status: response.status,
      headers: noStoreHeaders()
    });
  }
}

function createApiClient() {
  const userAgent = process.env.CHESSINSIGHTS_USER_AGENT;

  if (userAgent === undefined || userAgent.trim().length === 0) {
    return createChessComClient();
  }

  return createChessComClient({
    userAgent
  });
}

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store"
  };
}
