// src/types.ts

/** A single Key Performance Indicator. */
export interface Kpi {
  label: string;
  value: string;
}

/** The data structure for the main KPI cards. */
export interface KpiCardData {
  total_revenue: Kpi;
  gross_profit: Kpi;
  operating_margin: Kpi;
  net_income: Kpi;
  // Add other potential KPI card values here if needed
  [key: string]: Kpi; 
}

/** The financial health score and its summary. */
export interface HealthScore {
  score: number;
  summary: string;
}

/** A single AI-generated insight with a title, text, and suggestion. */
export interface Insight {
  title?: string;
  text: string;
  suggestion?: string;
}

/** The predictive analysis section containing a forecast summary and insights. */
export interface PredictiveAnalysis {
  forecast: string;
  insights: Insight[];
}

/** A comparison between your value and an industry benchmark. */
export interface BenchmarkValue {
  label: string;
  your_value: number;
  benchmark_value: number;
}

/** The full benchmark analysis for a specific industry. */
export interface BenchmarkAnalysis {
  industry: string;
  benchmarks: Record<string, BenchmarkValue>;
}

/** A simple summary of KPIs derived from kpiCardData. */
export interface KpiSummary {
  documentType: string | null;
  kpis: Kpi[];
}

/**
 * The main data structure for the entire analysis response from your API.
 * This is the primary blueprint for your dashboard's data.
 */
export interface AnalysisData {
  latestFileName?: string;
  documentType?: string;
  kpiCardData?: KpiCardData;
  health_score?: HealthScore;
  kpiChartData?: any[]; // You can define a stricter type for chart data points if desired
  summaries?: { summary: string; ai_advice: string; }[];
  predictiveAnalysis?: PredictiveAnalysis;
  benchmarkAnalysis?: BenchmarkAnalysis;
  kpiSummary?: KpiSummary;
}