import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// (Optional) If backend can take a while:
// export const maxDuration = 60;

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let enhancedMode = false;

  try {
    // 1. Authenticate the request
    const authResult = await auth();
    userId = authResult?.userId;

    if (!userId) {
      console.error("[API Route] Unauthorized: No userId from Clerk.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Prepare Form Data
    const incomingFormData = await request.formData();
    
    // Always trust the server-side user ID
    incomingFormData.set("user_id", userId);

    // Check for enhanced mode flag
    enhancedMode = String(incomingFormData.get("enhanced_mode")) === "true";
    incomingFormData.set("enhanced_mode", String(enhancedMode));

    const backendUrl = `${BACKEND_API_URL}/api/v1/main/upload_and_analyze`;
    console.log(
      `[API Route] Forwarding file for user: ${userId} to ${backendUrl} (Enhanced: ${enhancedMode})`
    );

    // 3. Forward to Backend with Timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000); // 60-second timeout

    const response = await fetch(backendUrl, {
      method: "POST",
      body: incomingFormData,
      signal: controller.signal,
      // NOTE: Do NOT set "Content-Type" when sending FormData; 
      // fetch sets the correct boundary automatically.
    }).catch((err) => {
      // Handle network errors (e.g., backend is down)
      throw new Error(`Upstream fetch failed: ${err?.message || String(err)}`);
    });

    clearTimeout(timeout); // Clear the timeout if the request succeeded

    // 4. Handle Backend Error Response
    if (!response.ok) {
      let errorBody: any;
      try {
        // Try to parse a JSON error message from the backend
        errorBody = await response.json();
      } catch {
        // Fallback to text if JSON parsing fails
        const txt = await response.text().catch(() => "");
        errorBody = txt ? { error: txt } : { error: "Backend returned an invalid response." };
      }
      console.error(`[API Route] Backend error (${response.status}):`, errorBody);
      return NextResponse.json(errorBody, { status: response.status });
    }

    // 5. Handle Backend Success Response
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      // Handle case where backend returns 200 OK but invalid JSON
      const txt = await response.text().catch(() => "N/A");
      throw new Error(`Backend returned non-JSON body: ${txt?.slice(0, 180)}`);
    }

    // Log the successful response (This was moved from the duplicate code)
    console.log('[API Route] ✅ Backend response:', {
      user_id: userId,
      filename: data.latestFileName,
      hasKPIs: !!data.kpis,
    });

    // 6. Enrich and Return to Client
    return NextResponse.json({
      ...data,
      processing_info: {
        enhanced_mode_used: enhancedMode,
        processing_time: data.processing_time || null,
        data_quality_score: data.validation_score || null,
      },
    });

  } catch (error: any) {
    // 7. Handle All Other Errors (Timeout, etc.)
    const message = error?.name === "AbortError"
      ? "The request timed out. The backend may be busy."
      : error?.message || "An unknown internal error occurred.";
      
    console.error("[API Route] An unexpected error occurred:", error);
    return NextResponse.json({ error: "Internal Server Error", details: message }, { status: 500 });
  }
}