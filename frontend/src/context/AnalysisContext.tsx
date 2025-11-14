"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { AnalysisData } from "./types";

interface AnalysisContextType {
  analysisData: AnalysisData | null;
  isLoading: boolean;
  error: string | null;
  refreshAnalysisData: () => Promise<void>;
  updateAnalysisData: (newData: AnalysisData) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(
  undefined
);

/* ---------------- Normalization helpers (unchanged) ---------------- */

function normalizePredictive(raw: any) {
  const pa = raw?.predictiveAnalysis ?? raw?.predictions ?? null;
  if (!pa) return null;

  const forecast = pa?.forecast ?? pa?.summary ?? "";
  const rawInsights = Array.isArray(pa?.insights) ? pa.insights : [];

  const insights = rawInsights.map((x: any) => ({
    title: x?.title ?? x?.topic_name ?? "Insight",
    text: x?.text ?? x?.description ?? "",
    suggestion: x?.suggestion,
  }));

  return { forecast, insights };
}

function normalizeAnalysis(data: any): AnalysisData | null {
  try {
    if (!data || typeof data !== "object") return null;

    const out: Partial<AnalysisData> = { ...data };

    out.documentType = data.documentType ?? data.document_type;
    out.kpiCardData = data.kpiCardData ?? data.kpi_card_data;
    out.kpiChartData = data.kpiChartData ?? data.kpi_chart_data;
    out.health_score = data.health_score ?? data.healthScore;

    out.predictiveAnalysis = normalizePredictive(data);

    // Build kpiSummary from kpiCardData if missing
    if (!out.kpiSummary?.kpis?.length && out.kpiCardData) {
      const kpis = Object.entries(out.kpiCardData).map(
        ([key, value]: [string, any]) => ({
          label: value?.label || key.replace(/_/g, " "),
          value: value?.value || String(value),
        })
      );
      out.kpiSummary = { documentType: out.documentType ?? null, kpis };
    }

    return out as AnalysisData;
  } catch (err) {
    console.error("Failed to normalize analysis data:", err);
    return null;
  }
}

/* ---------------- Provider ---------------- */

export const AnalysisProvider = ({ children }: { children: ReactNode }) => {
  const { userId, isLoaded } = useAuth();

  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAnalysisData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // No Authorization header needed – the Next.js /api route handles auth/proxy.
      const response = await fetch(
        `/api/v1/main/analysis_summary?user_id=${encodeURIComponent(userId)}`,
        { cache: "no-store" }
      );

      // If the backend ever returns 404, treat as "no uploads yet"
      if (response.status === 404) {
        setAnalysisData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[AnalysisContext] Failed to fetch analysis:",
          response.status,
          errorText
        );
        // ❗ Do NOT clear existing analysis data here – just record the error
        setError(
          errorText || `Failed to fetch analysis (HTTP ${response.status})`
        );
        setIsLoading(false);
        return;
      }

      const raw = await response.json();

      // Backend "no data" case: { hasData: false, message: "..." }
      if (raw && raw.hasData === false) {
        setAnalysisData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const normalized = normalizeAnalysis(raw);

      if (normalized === null) {
        // Empty or invalid data - treat as "no uploads yet"
        setAnalysisData(null);
        setError(null);
      } else {
        setAnalysisData(normalized);
        setError(null);
      }
    } catch (err: any) {
      console.error("[AnalysisContext] Failed to fetch analysis data:", err);
      // ❗ Again, keep whatever analysisData we already had
      setError(err?.message || "An unknown error occurred while fetching");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updateAnalysisData = useCallback((newData: AnalysisData) => {
    const normalized = normalizeAnalysis(newData);
    if (normalized) {
      setAnalysisData(normalized);
      setError(null);
    } else {
      setError("Failed to process the updated analysis data.");
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (userId) {
      // Initial load / reload
      refreshAnalysisData();
    } else {
      setIsLoading(false);
      setAnalysisData(null);
      setError(null);
    }
  }, [isLoaded, userId, refreshAnalysisData]);

  const value: AnalysisContextType = {
    analysisData,
    isLoading,
    error,
    refreshAnalysisData,
    updateAnalysisData,
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};

/* ---------------- Hook ---------------- */

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
};
