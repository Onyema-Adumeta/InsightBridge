// app/api/simulations/smart-suggestions/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"; // local fallback

// Match your FastAPI path exactly:
const PATH = process.env.FASTAPI_SMART_SUGGESTIONS_PATH
  || "/api/simulations/smart-suggestions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = `${API_BASE.replace(/\/+$/, "")}${PATH}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await r.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: r.status });
    } catch {
      return new NextResponse(text, {
        status: r.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: "Proxy failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

