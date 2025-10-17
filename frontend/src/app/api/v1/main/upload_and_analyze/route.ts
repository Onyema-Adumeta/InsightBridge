import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// (Optional) If backend can take a while:
// export const maxDuration = 60;

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.error("[API Route] Unauthorized: No userId from Clerk.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incomingFormData = await request.formData();

    // Always trust server-side user id
    incomingFormData.set("user_id", userId);

    // Enhanced mode: read from client form data if sent; default false
    const enhancedMode = String(incomingFormData.get("enhanced_mode")) === "true";
    incomingFormData.set("enhanced_mode", String(enhancedMode));

    const backendUrl = `${BACKEND_API_URL}/api/v1/main/upload_and_analyze`;
    console.log(
      `[API Route] Forwarding file for user: ${userId} to ${backendUrl} (Enhanced: ${enhancedMode})`
    );

    // Add a timeout so the request doesn't hang forever
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const response = await fetch(backendUrl, {
      method: "POST",
      body: incomingFormData,
      signal: controller.signal,
      // NOTE: do NOT set "Content-Type" when sending FormData; fetch will set boundary
    }).catch((err) => {
      throw new Error(`Upstream fetch failed: ${err?.message || String(err)}`);
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // Try to parse JSON error; if it fails, use text
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        const txt = await response.text().catch(() => "");
        errorBody = txt ? { error: txt } : { error: "Backend returned an invalid response." };
      }
      console.error(`[API Route] Backend error (${response.status}):`, errorBody);
      return NextResponse.json(errorBody, { status: response.status });
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text();
      throw new Error(`Backend returned non-JSON body: ${txt?.slice(0, 180) ?? "N/A"}`);
    }

    // Enrich for UI
    return NextResponse.json({
      ...data,
      processing_info: {
        enhanced_mode_used: enhancedMode,
        processing_time: data.processing_time || null,
        data_quality_score: data.validation_score || null,
      },
    });
  } catch (error: any) {
    const message = error?.name === "AbortError"
      ? "Timed out contacting backend."
      : error?.message || "Internal Server Error";
    console.error("[API Route] An unexpected error occurred:", error);
    return NextResponse.json({ error: "Internal Server Error", details: message }, { status: 500 });
  }
}

const data = await response.json();

console.log('[API Route] ✅ Backend response:', {
  user_id: userId,
  filename: data.latestFileName,
  hasKPIs: !!data.kpis,
});

// Enrich for UI
return NextResponse.json({
  ...data,
  processing_info: {
    enhanced_mode_used: enhancedMode,
    processing_time: data.processing_time || null,
    data_quality_score: data.validation_score || null,
  },
});