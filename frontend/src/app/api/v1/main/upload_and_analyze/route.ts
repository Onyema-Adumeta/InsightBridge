// src/app/api/v1/main/upload_and_analyze/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const API_BASE =
  (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const BACKEND_PATH = "/api/v1/main/upload_and_analyze";

export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    // 1) Get Clerk session token
    const { userId: clerkUserId, getToken } = await auth();
    userId = clerkUserId ?? null;
    
    if (!userId) {
      console.error("[upload_and_analyze] Unauthorized: no Clerk userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Get the Clerk JWT token to forward to backend
    const token = await getToken();
    
    if (!token) {
      console.error("[upload_and_analyze] No Clerk token available");
      return NextResponse.json({ error: "Authentication token missing" }, { status: 401 });
    }

    // 3) Read incoming multipart and re-assemble a fresh FormData
    const incoming = await request.formData();
    incoming.set("user_id", userId); // always trust server-side user
    const enhancedMode = String(incoming.get("enhanced_mode")) === "true";
    incoming.set("enhanced_mode", String(enhancedMode));

    const upstreamUrl = `${API_BASE}${BACKEND_PATH}`;
    console.log(`[upload_and_analyze] → ${upstreamUrl} (enhanced=${enhancedMode})`);

    // 4) Prepare headers with Clerk JWT token
    const headers: Record<string, string> = {
      // ✅ CRITICAL: Forward Clerk token to backend
      "Authorization": `Bearer ${token}`
    };

    // Optional: Add API key if you have one (for additional security layer)
    if (process.env.BACKEND_API_KEY) {
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
    }

    console.log("[upload_and_analyze] 🔑 Forwarding auth token to backend");

    // 5) Forward to backend with auth token
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 120_000); // Increased to 2 minutes
    
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

    // 6) Return backend response (prefer JSON)
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
        console.error("[upload_and_analyze] ❌ Backend error:", text);
        return NextResponse.json(
          { error: text || "Backend error" }, 
          { status: upstream.status }
        );
      }
      return new NextResponse(text, { 
        status: upstream.status, 
        headers: { "Content-Type": "text/plain" } 
      });
    }
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "The request timed out. The backend may be busy."
        : err?.message ?? "Unknown internal error.";
    
    console.error("[upload_and_analyze] ❌ Error:", err);
    
    return NextResponse.json(
      { error: "Internal Server Error", details: msg }, 
      { status: 500 }
    );
  }
}