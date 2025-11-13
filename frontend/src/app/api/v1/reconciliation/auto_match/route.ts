// Save as: frontend/src/app/api/v1/reconciliation/auto_match/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
  (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backendUrl = `${API_BASE}/api/v1/reconciliation/auto_match?user_id=${userId}`;
    console.log(`[auto_match] → ${backendUrl}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.BACKEND_API_KEY) {
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
    }

    const response = await fetch(backendUrl, {
      method: "POST",
      headers,
      cache: "no-store",
    });

    const text = await response.text();
    
    try {
      const json = JSON.parse(text);
      console.log("[auto_match] ✅", {
        user_id: userId,
        matches_found: json?.data?.matches_found || json?.summary?.matches_found,
      });
      return NextResponse.json(json, { status: response.status });
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err: any) {
    console.error("[auto_match] ❌", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message },
      { status: 500 }
    );
  }
}