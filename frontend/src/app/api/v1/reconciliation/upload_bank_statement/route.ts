// Save as: frontend/src/app/api/v1/reconciliation/upload_bank_statement/route.ts
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

    // Get the form data from the request
    const formData = await request.formData();
    
    // Add user_id to the form data
    formData.set("user_id", userId);

    const backendUrl = `${API_BASE}/api/v1/reconciliation/upload_bank_statement`;
    console.log(`[upload_bank_statement] → ${backendUrl}`);

    const headers: Record<string, string> = {};
    if (process.env.BACKEND_API_KEY) {
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
    }

    // Forward the multipart form data to backend
    const response = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: formData,
    });

    const text = await response.text();
    
    try {
      const json = JSON.parse(text);
      console.log("[upload_bank_statement] ✅", {
        user_id: userId,
        inserted: json?.details?.inserted,
      });
      return NextResponse.json(json, { status: response.status });
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err: any) {
    console.error("[upload_bank_statement] ❌", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message },
      { status: 500 }
    );
  }
}