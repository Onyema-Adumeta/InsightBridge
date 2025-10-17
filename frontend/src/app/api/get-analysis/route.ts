import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";

function normalizeDocType(s?: string | null) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes("income") || t.includes("profit") || t.includes("p&l")) return "Income Statement";
  if (t.includes("balance")) return "Balance Sheet";
  if (t.includes("cash")) return "Cash Flow Statement";
  return "Unknown";
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backendUrl = `${process.env.FASTAPI_URL}/api/v1/main/analysis_summary?user_id=${userId}`;
    const res = await fetch(backendUrl, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,  // Add for flexibility
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[proxy error] FastAPI response: ${text}`);
      return NextResponse.json({ error: `Upstream error: ${text}` }, { status: res.status });
    }

    const raw = await res.json();
    console.log("[proxy] Raw from FastAPI:", JSON.stringify(raw, null, 2)); // Debug

    const section = raw?.sections?.[0] ?? {}; // Align with CombinedDashboardSummary structure

    const latestFileName =
      raw.latestFileName ??
      section.latestFileName ??
      raw.filename ??
      section.filename ??
      "";

    const documentType = normalizeDocType(
      section.documentType ?? raw.documentType ?? null
    );

    const kpiCardData = section.kpiCardData ?? raw.kpiCardData ?? null;

    let kpiChartData =
      section.kpiChartData ??
      raw.kpiChartData ??
      section.kpi_monthly ??
      raw.kpi_monthly ??
      [];

    const seen = new Set<string>();
    kpiChartData = kpiChartData.filter((r: any) => {
      const key = `${r.period_end_date}|${r.revenue}|${r.expenses}|${r.net_income}|${
        r.predicted ? 1 : 0
      }`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const summaries =
      section.summaries ??
      raw.summaries ??
      section.summary_items ??
      raw.summary_items ??
      [];

    const predictiveAnalysis =
      section.predictiveAnalysis ??
      raw.predictiveAnalysis ??
      section.predictive_analysis ??
      raw.predictive_analysis ??
      { forecast: "", insights: [] };

    const related_explainers =
      section.related_explainers ?? raw.related_explainers ?? [];

    const normalized = {
      latestFileName,
      documentType,
      kpiCardData,
      kpiChartData,
      summaries,
      predictiveAnalysis,
      related_explainers,
    };

    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error("[get-analysis] error:", err);
    return NextResponse.json({ error: `Internal error: ${err.message || "unknown"}` }, {
      status: 500,
    });
  }
}