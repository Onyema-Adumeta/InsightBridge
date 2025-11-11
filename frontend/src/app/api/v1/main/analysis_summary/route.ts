// src/app/api/v1/main/analysis_summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use either BACKEND_API_URL (server) or NEXT_PUBLIC_API_URL (client-exposed) as fallback
const API_BASE =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL || // works in Azure if only NEXT_PUBLIC_* is set
  "http://127.0.0.1:8000";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id") || clerkUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build upstream URL
    const backendUrl = `${API_BASE.replace(/\/+$/, "")}/api/v1/main/analysis_summary?user_id=${encodeURIComponent(
      userId
    )}`;

    // Forward only the headers you truly need
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.BACKEND_API_KEY) {
      // Prefer a custom header for service-to-service auth
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
    }
    // If you really need to forward client auth, uncomment next 3 lines:
    // const fwdAuth = req.headers.get("authorization") || req.headers.get("Authorization");
    // if (fwdAuth) headers["Authorization"] = fwdAuth;

    const upstream = await fetch(backendUrl, { method: "GET", headers, cache: "no-store" });

    const payload = await upstream.json().catch(() => ({}));
    return NextResponse.json(payload, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
