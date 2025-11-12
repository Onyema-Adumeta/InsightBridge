// src/app/api/advisor/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const API_BASE = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const FASTAPI_ADVISOR_FULL_PATH =
  process.env.FASTAPI_ADVISOR_FULL_PATH || "/api/v1/advisor/chat";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }

    const question: string = body?.question?.toString() ?? "";
    if (!question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const url = `${API_BASE}${FASTAPI_ADVISOR_FULL_PATH}`;
    // Server-only headers
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.FASTAPI_API_KEY) {
      // Pick one, based on what your FastAPI expects:
      headers["X-API-Key"] = process.env.FASTAPI_API_KEY;
      // or:
      // headers["Authorization"] = `Bearer ${process.env.FASTAPI_API_KEY}`;
    }

    const upstream = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify({ question, prompt: question, user_id: userId }),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "FastAPI error", status: upstream.status, detail: text },
        { status: upstream.status }
      );
    }

    try {
      const json = JSON.parse(text);
      if (typeof json?.plan === "string") return NextResponse.json({ plan: json.plan });
      if (Array.isArray(json?.strategy_plan)) {
        const plan = json.strategy_plan
          .map(
            (it: any) =>
              `### ${it.title ?? "Untitled"}\n**Action:** ${it.action ?? "-"}\n**Justification:** ${it.justification ?? "-"}`
          )
          .join("\n\n");
        return NextResponse.json({ plan, raw: json });
      }
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({ plan: text });
    }
  } catch (err: any) {
    console.error("[ADVISOR_API_ERROR]", err);
    return NextResponse.json(
      { error: "Internal error", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
