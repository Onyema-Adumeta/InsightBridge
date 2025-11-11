// src/app/api/v1/main/upload_and_analyze/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// export const maxDuration = 60;

const API_BASE =
  (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const BACKEND_PATH = "/api/v1/main/upload_and_analyze";

export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    // 1) Auth via Clerk
    const { userId: clerkUserId } = await auth();
    userId = clerkUserId ?? null;
    if (!userId) {
      console.error("[upload_and_analyze] Unauthorized: no Clerk userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Read incoming multipart and re-assemble a fresh FormData
    const incoming = await request.formData();
    incoming.set("user_id", userId); // always trust server-side user
    const enhancedMode = String(incoming.get("enhanced_mode")) === "true";
    incoming.set("enhanced_mode", String(enhancedMode));

    const upstreamUrl = `${API_BASE}${BACKEND_PATH}`;
    console.log(`[upload_and_analyze] → ${upstreamUrl} (enhanced=${enhancedMode})`);

    // 3) Server-side headers (DON'T expose secrets client-side)
    const headers: Record<string, string> = {};
    if (process.env.BACKEND_API_KEY) {
      // choose one your backend expects:
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
      // or, if your FastAPI expects Bearer:
      // headers["Authorization"] = `Bearer ${process.env.BACKEND_API_KEY}`;
    }

    // 4) Forward to backend (do not set Content-Type; fetch sets boundary)
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 60_000);
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      body: incoming,
      headers,
      cache: "no-store",
      signal: controller.signal,
    }).catch((e) => {
      throw new Error(`Upstream fetch failed: ${e?.message ?? String(e)}`);
    });
    clearTimeout(to);

    // 5) Return backend response (prefer JSON)
    const text = await upstream.text();
    try {
      const json = JSON.parse(text);
      console.log("[upload_and_analyze] ✅", {
        user_id: userId,
        filename: json?.latestFileName,
        hasKPIs: !!json?.kpis,
      });
      return NextResponse.json(
        {
          ...json,
          processing_info: {
            enhanced_mode_used: enhancedMode,
            processing_time: json?.processing_time ?? null,
            data_quality_score: json?.validation_score ?? null,
          },
        },
        { status: upstream.status }
      );
    } catch {
      // non-JSON from backend
      if (!upstream.ok) {
        return NextResponse.json({ error: text || "Backend error" }, { status: upstream.status });
      }
      return new NextResponse(text, { status: upstream.status, headers: { "Content-Type": "text/plain" } });
    }
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "The request timed out. The backend may be busy."
        : err?.message ?? "Unknown internal error.";
    console.error("[upload_and_analyze] ❌", err);
    return NextResponse.json({ error: "Internal Server Error", details: msg }, { status: 500 });
  }
}
