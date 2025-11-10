import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const base = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL/NEXT_PUBLIC_API_URL is not set");
    }

    // Match your FastAPI prefix exactly:
    const r = await fetch(`${base}/api/simulations/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Proxy failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
