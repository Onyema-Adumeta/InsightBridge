"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AnalysisData } from './types';

interface AnalysisContextType {
  analysisData: AnalysisData | null;
  isLoading: boolean;
  error: string | null;
  refreshAnalysisData: () => Promise<void>;
  updateAnalysisData: (newData: AnalysisData) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

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

    if (!out.kpiSummary?.kpis?.length && out.kpiCardData) {
      const kpis = Object.entries(out.kpiCardData).map(([key, value]: [string, any]) => ({
        label: value?.label || key.replace(/_/g, ' '),
        value: value?.value || String(value),
      }));
      out.kpiSummary = { documentType: out.documentType ?? null, kpis };
    }

    return out as AnalysisData;
  } catch (err) {
    console.error('Failed to normalize analysis data:', err);
    return null;
  }
}

export const AnalysisProvider = ({ children }: { children: ReactNode }) => {
  const { userId, isLoaded, getToken } = useAuth();  // ← ADDED getToken HERE
  
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAnalysisData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error("User is not authenticated.");
      }
      
      const response = await fetch(`/api/v1/main/analysis_summary?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // If 404, user just hasn't uploaded data yet - this is fine, not an error
      if (response.status === 404) {
        setAnalysisData(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch analysis: ${errorText || response.statusText}`);
      }
      
      const raw = await response.json();
      const normalized = normalizeAnalysis(raw);

      if (normalized === null) {
        // Empty or invalid data - not an error, just no uploads yet
        setAnalysisData(null);
        setError(null);
      } else {
        setAnalysisData(normalized);
      }
    } catch (err: any) {
      console.error('Failed to fetch analysis data:', err);
      setError(err.message || 'An unknown error occurred');
      setAnalysisData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, getToken]);  // ← ADDED getToken to dependencies

  const updateAnalysisData = useCallback((newData: AnalysisData) => {
    const normalized = normalizeAnalysis(newData);
    if (normalized) {
      setAnalysisData(normalized);
      setError(null);
    } else {
      setError('Failed to process the updated analysis data.');
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (userId) {
      refreshAnalysisData();
    } else {
      setIsLoading(false);
      setAnalysisData(null);
    }
  }, [isLoaded, userId, refreshAnalysisData]);

  const value = {
    analysisData,
    isLoading,
    error,
    refreshAnalysisData,
    updateAnalysisData
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};