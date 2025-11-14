// src/app/api/v1/main/analysis_summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

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
    // Clerk server-side auth
    const { userId: clerkUserId, getToken } = auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get a JWT from Clerk to forward to FastAPI
    let token: string | null = null;
    try {
      // Default session token (good enough for your get_current_user_id)
      token = await getToken();
    } catch (err) {
      console.error("[analysis_summary route] Failed to get Clerk token:", err);
    }

    if (!token) {
      return NextResponse.json(
        { error: "Unable to obtain auth token from Clerk" },
        { status: 401 }
      );
    }

    // Respect ?user_id=... override; otherwise use Clerk user
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id") || clerkUserId;

    const upstreamUrl = `${API_BASE}${UPSTREAM_PATH}?user_id=${encodeURIComponent(
      userId
    )}`;

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        // This is what your FastAPI get_current_user_id expects
        Authorization: `Bearer ${token}`,
      },
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
