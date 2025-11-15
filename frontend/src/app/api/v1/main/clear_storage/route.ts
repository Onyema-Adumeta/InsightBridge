// Save as: frontend/src/app/api/v1/main/clear_storage/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
  (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function POST(request: NextRequest) {
  try {
    // 1) Auth via Clerk - GET TOKEN HERE
    const { userId, getToken } = await auth();
    if (!userId) {
      console.error("[clear_storage] Unauthorized: no Clerk userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Build backend URL
    const backendUrl = `${API_BASE}/api/v1/main/clear_storage`;
    console.log(`[clear_storage] → ${backendUrl} for user ${userId}`);

    // 3) Get the auth token
    const token = await getToken();

    // 4) Server-side headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add Authorization header
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("[clear_storage] 🔑 Forwarding auth token to backend");
    } else if (process.env.BACKEND_API_KEY) {
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
    }

    // 5) Forward to backend with user_id
    const response = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[clear_storage] Backend error ${response.status}:`, text);
      return NextResponse.json(
        { error: "Backend error", details: text },
        { status: response.status }
      );
    }

    // 6) Return success
    const data = await response.json();
    console.log("[clear_storage] ✅", { user_id: userId });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[clear_storage] ❌", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message },
      { status: 500 }
    );
  }
}