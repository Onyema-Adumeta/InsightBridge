// src/app/api/v1/main/analysis_summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prefer server-only var; fall back to NEXT_PUBLIC for robustness; last resort: localhost (dev)
const API_BASE = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const UPSTREAM_PATH = "/api/v1/main/analysis_summary";

export async function GET(req: NextRequest) {
  try {
    // Get user from Clerk; allow ?user_id=... override (useful for admin tools)
    const { userId: clerkUserId } = await auth();
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id") || clerkUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const upstreamUrl = `${API_BASE}${UPSTREAM_PATH}?user_id=${encodeURIComponent(userId)}`;

    // Only forward what we need; add service key server-side if available
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.BACKEND_API_KEY) {
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
      // If your FastAPI expects Bearer instead, use:
      // headers["Authorization"] = `Bearer ${process.env.BACKEND_API_KEY}`;
    }

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers,
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
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
