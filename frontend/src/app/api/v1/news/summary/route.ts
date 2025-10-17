// frontend/src/app/api/v1/news/summary/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Optional proxy to Python if you later add a backend route.
  try {
    const r = await fetch(`${base}/api/v1/news/summary`, { cache: "no-store" });
    if (r.ok) {
      const json = await r.json();
      return NextResponse.json(json);
    }
  } catch {
    // ignore proxy errors & fall back
  }

  const now = new Date().toLocaleDateString();
  return NextResponse.json([
    {
      id: "1",
      title: "SaaS multiples tick up",
      summary:
        "Market comps improved 2–3% on cloud infra recovery; watch revenue quality and net retention.",
      ts: now,
    },
    {
      id: "2",
      title: "Rates hold steady",
      summary:
        "Funding environment stabilizes; extend runway and prioritize efficient growth (Rule of 40).",
      ts: now,
    },
    {
      id: "3",
      title: "AI infra costs easing",
      summary:
        "GPU supply loosens; margin pressure moderates for AI-heavy workloads.",
      ts: now,
    },
  ]);
}
