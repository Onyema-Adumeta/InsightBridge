// src/app/api/v1/main/analysis_summary/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prefer server-only var; fall back to NEXT_PUBLIC; last resort: localhost (dev)
const API_BASE = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const UPSTREAM_PATH = "/api/v1/main/analysis_summary";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // We EXPECT frontend to pass ?user_id=...
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      // No Clerk check here – just a bad request if user_id is missing
      return NextResponse.json(
        { error: "Missing user_id query parameter" },
        { status: 400 }
      );
    }

    const upstreamUrl = `${API_BASE}${UPSTREAM_PATH}?user_id=${encodeURIComponent(
      userId
    )}`;

    // No Authorization header – we rely on DEV fallback in get_current_user_id()
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
    });

    const text = await upstream.text();

    // Try to parse JSON; if not JSON, pass through as text
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err: any) {
    console.error("[analysis_summary route] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
