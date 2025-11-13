// Save as: frontend/src/app/api/v1/reconciliation/bank_transactions/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
  (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backendUrl = `${API_BASE}/api/v1/reconciliation/bank_transactions?user_id=${userId}`;
    console.log(`[bank_transactions] → ${backendUrl}`);

    const headers: Record<string, string> = {};
    if (process.env.BACKEND_API_KEY) {
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
    }

    const response = await fetch(backendUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const text = await response.text();
    
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: response.status });
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err: any) {
    console.error("[bank_transactions] ❌", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message },
      { status: 500 }
    );
  }
}

// DELETE specific transaction
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get transaction ID from query params
    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get("id");

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    const backendUrl = `${API_BASE}/api/v1/reconciliation/bank_transactions/${transactionId}`;
    console.log(`[delete_transaction] → ${backendUrl}`);

    const headers: Record<string, string> = {};
    if (process.env.BACKEND_API_KEY) {
      headers["X-API-Key"] = process.env.BACKEND_API_KEY;
    }

    const response = await fetch(backendUrl, {
      method: "DELETE",
      headers,
    });

    const text = await response.text();
    
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: response.status });
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err: any) {
    console.error("[delete_transaction] ❌", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message },
      { status: 500 }
    );
  }
}