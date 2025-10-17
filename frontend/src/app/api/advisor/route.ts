// src/app/api/advisor/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const FASTAPI_ADVISOR_FULL_PATH =
  process.env.FASTAPI_ADVISOR_FULL_PATH || "/api/v1/advisor/chat";
const FASTAPI_API_KEY = process.env.FASTAPI_API_KEY || "";

export async function POST(req: Request) {
  try {
    // ✅ Clerk (async; does NOT use next/headers directly here)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Read JSON body safely
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

    // ✅ Build URL
    const url = `${API_BASE.replace(/\/+$/, "")}${FASTAPI_ADVISOR_FULL_PATH}`;
    console.log("[advisor] calling:", url);

    // ✅ Call FastAPI
    const upstream = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(FASTAPI_API_KEY ? { Authorization: `Bearer ${FASTAPI_API_KEY}` } : {}),
      },
      body: JSON.stringify({ question, prompt: question, user_id: userId }),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "FastAPI error", status: upstream.status, detail: text },
        { status: upstream.status }
      );
    }

    // Try to parse JSON; otherwise return the raw text as plan
    try {
      const json = JSON.parse(text);

      // If backend already returns { plan }
      if (typeof json?.plan === "string") return NextResponse.json({ plan: json.plan });

      // If backend returns an array like strategy_plan[], format it nicely
      if (Array.isArray(json?.strategy_plan)) {
        const plan = json.strategy_plan
          .map(
            (it: any) =>
              `### ${it.title ?? "Untitled"}\n**Action:** ${it.action ?? "-"}\n**Justification:** ${it.justification ?? "-"}`
          )
          .join("\n\n");
        return NextResponse.json({ plan, raw: json });
      }

      // Fallback: pass through JSON
      return NextResponse.json(json);
    } catch {
      // Not JSON → treat text as a finished plan
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