"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import AppSidebar from "@/components/AppSidebar";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Area,
  Bar,
} from "recharts";

/* ---------------- Icons ---------------- */
const BoltIcon = ({ className = "h-5 w-5 mr-2" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
      clipRule="evenodd"
    />
  </svg>
);

const BeakerIcon = ({ className = "h-5 w-5 mr-2" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-7.954 0l-2.387.477a2 2 0 00-1.022.547m3.228 4.014a5.953 5.953 0 01-2.228-2.228M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const TrendingUpIcon = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const SparklesIcon = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

/* ---------------- Small UI ---------------- */
const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
  </div>
);

const ScenarioCheckbox: React.FC<{
  scenario: any;
  isChecked: boolean;
  onChange: () => void;
  isRecommended?: boolean;
  suggestion?: string;
}> = ({ scenario, isChecked, onChange, isRecommended = false, suggestion }) => (
  <div
    onClick={onChange}
    className={`relative p-4 border rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
      isChecked
        ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 shadow-lg shadow-indigo-500/25"
        : "bg-gray-700/50 border-gray-600 hover:border-gray-500 hover:bg-gray-700"
    } ${isRecommended ? "ring-2 ring-yellow-400/50" : ""}`}
  >
    {isRecommended && (
      <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
        AI Recommended
      </div>
    )}
    <div className="flex items-center">
      <div
        className={`w-6 h-6 rounded-lg flex-shrink-0 mr-3 flex items-center justify-center transition-all ${
          isChecked ? "bg-white shadow-lg" : "bg-gray-800 border-2 border-gray-500"
        }`}
      >
        {isChecked && (
          <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </svg>
        )}
      </div>
      <div>
        <span className="text-sm font-medium">{scenario.label}</span>
        {scenario.description && <p className="text-xs text-gray-400 mt-1">{scenario.description}</p>}
        {suggestion && <p className="text-xs text-yellow-300 mt-1 font-medium">{suggestion}</p>}
      </div>
    </div>
  </div>
);

/* ---------------- Results Block ---------------- */
const SimulationResultsDisplay: React.FC<{
  results: any;
  baselineData: any;
}> = ({ results, baselineData }) => {
  if (!results) return null;

  const baselineRevenue = baselineData?.kpis?.profitLoss?.totalRevenue || 1_000_000;
  const baselineMargin = baselineData?.kpis?.profitLoss?.grossMargin || 12.6;

  const revenueChange = results.key_metrics?.total_revenue_change || 0;
  const marginChange = (results.key_metrics?.avg_margin || 0) - baselineMargin;
  const projectedRevenue = baselineRevenue * (1 + revenueChange / 100);

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      LOW: "text-green-400",
      MODERATE: "text-yellow-400",
      MEDIUM: "text-orange-400",
      HIGH: "text-red-400",
      CRITICAL: "text-red-600",
    };
    return colors[risk] || "text-gray-400";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="h-6 w-6 text-purple-400" />
          <h2 className="text-2xl font-bold">Simulation Results</h2>
        </div>
        <p className="text-slate-300">{results.summary}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Change */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Revenue Change</span>
            {revenueChange > 0 ? (
              <TrendingUpIcon className="h-5 w-5 text-green-400" />
            ) : (
              <TrendingDownIcon className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className={`text-3xl font-bold ${revenueChange > 0 ? "text-green-400" : "text-red-400"}`}>
            {revenueChange > 0 ? "+" : ""}
            {revenueChange.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-slate-400">${(projectedRevenue / 1_000_000).toFixed(2)}M projected</div>
        </div>

        {/* Margin Change */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Margin Change</span>
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className={`text-3xl font-bold ${marginChange > 0 ? "text-green-400" : "text-red-400"}`}>
            {marginChange > 0 ? "+" : ""}
            {marginChange.toFixed(1)} pts
          </div>
          <div className="mt-2 text-xs text-slate-400">{(results.key_metrics?.avg_margin || 0).toFixed(1)}% avg margin</div>
        </div>

        {/* NPV */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Net Present Value</span>
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className={`text-3xl font-bold ${(results.key_metrics?.npv || 0) > 0 ? "text-green-400" : "text-red-400"}`}>
            ${((results.key_metrics?.npv || 0) / 1_000_000).toFixed(2)}M
          </div>
          <div className="mt-2 text-xs text-slate-400">{(results.key_metrics?.roi || 0).toFixed(1)}% ROI</div>
        </div>

        {/* Risk */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Risk Assessment</span>
            <svg
              className={`h-5 w-5 ${getRiskColor(results.key_metrics?.risk_level || "MODERATE")}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className={`text-2xl font-bold ${getRiskColor(results.key_metrics?.risk_level || "MODERATE")}`}>
            {results.key_metrics?.risk_level || "MODERATE"}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {(results.key_metrics?.probability_of_success || 0)}% success rate
          </div>
        </div>
      </div>

      {/* Revenue Projection Bars */}
      {results.simulated_forecast_data && results.simulated_forecast_data.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <h3 className="text-lg font-semibold">Revenue Projection</h3>
          </div>
          <div className="relative h-64">
            <div className="flex items-end justify-between h-full gap-2">
              {results.simulated_forecast_data.map((d: any, idx: number) => {
                const maxRevenue = Math.max(...results.simulated_forecast_data.map((x: any) => x.revenue || 0), 1);
                const heightPercent = ((d.revenue || 0) / maxRevenue) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full group">
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="font-semibold text-blue-400">${((d.revenue || 0) / 1000).toFixed(0)}K</div>
                        <div className="text-slate-400">Margin: {(d.gross_margin || 0).toFixed(1)}%</div>
                        <div className="text-slate-400">Profit: ${((d.net_income || 0) / 1000).toFixed(0)}K</div>
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 -rotate-45 origin-top-left mt-4">
                      {d.period_end_date ? new Date(d.period_end_date).toLocaleDateString("en-US", { month: "short" }) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Impacts */}
      {Array.isArray(results.impacts) && results.impacts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Key Impacts</h3>
          <div className="space-y-3">
            {results.impacts.map((impact: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-slate-300">{impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {results.recommendation && (
        <div
          className={`border rounded-xl p-6 ${
            results.recommendation.includes("PROCEED") && !results.recommendation.includes("CAUTION")
              ? "bg-green-500/10 border-green-500/30"
              : results.recommendation.includes("CAUTION")
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {results.recommendation.includes("PROCEED") && !results.recommendation.includes("CAUTION") ? (
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            Strategic Recommendation
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">{results.recommendation}</p>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Before vs. After Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Metric</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Baseline</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Projected</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="py-3 px-4">Annual Revenue</td>
                <td className="text-right py-3 px-4 text-slate-300">
                  ${(baselineRevenue / 1_000_000).toFixed(2)}M
                </td>
                <td className="text-right py-3 px-4 text-slate-300">
                  ${(projectedRevenue / 1_000_000).toFixed(2)}M
                </td>
                <td className="text-right py-3 px-4">
                  <span className={`font-semibold ${revenueChange > 0 ? "text-green-400" : "text-red-400"}`}>
                    {revenueChange > 0 ? "+" : ""}
                    {revenueChange.toFixed(1)}%
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-3 px-4">Gross Margin</td>
                <td className="text-right py-3 px-4 text-slate-300">{baselineMargin.toFixed(1)}%</td>
                <td className="text-right py-3 px-4 text-slate-300">
                  {(results.key_metrics?.avg_margin || 0).toFixed(1)}%
                </td>
                <td className="text-right py-3 px-4">
                  <span className={`font-semibold ${marginChange > 0 ? "text-green-400" : "text-red-400"}`}>
                    {marginChange > 0 ? "+" : ""}
                    {marginChange.toFixed(1)} pts
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4">ROI</td>
                <td className="text-right py-3 px-4 text-slate-300">-</td>
                <td className="text-right py-3 px-4 text-slate-300">{(results.key_metrics?.roi || 0).toFixed(1)}%</td>
                <td className="text-right py-3 px-4">
                  <span className="font-semibold text-green-400">New</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Role selector ---------------- */
const RoleBasedAnalysisSelector: React.FC<{ selectedRole: string; onRoleChange: (role: string) => void }> = ({
  selectedRole,
  onRoleChange,
}) => (
  <div className="bg-gray-800/50 p-4 rounded-lg mb-4">
    <label className="block text-sm font-medium text-gray-300 mb-2">
      <SparklesIcon className="inline h-4 w-4 mr-1" />
      Analysis Detail Level
    </label>
    <select
      value={selectedRole}
      onChange={(e) => onRoleChange(e.target.value)}
      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    >
      <option value="executive">Executive Summary - Strategic insights for leadership</option>
      <option value="manager">Management Analysis - Operational insights for managers</option>
      <option value="accountant">Financial Analysis - Detailed financial metrics</option>
      <option value="bookkeeper">Transaction Analysis - Data quality and records focus</option>
    </select>
    <p className="text-xs text-gray-400 mt-1">Choose your role for tailored insights and recommendations</p>
  </div>
);

/* ---------------- Scenarios ---------------- */
type SimKey =
  | "lose_customer"
  | "marketing_spend"
  | "hiring"
  | "supply_cost_spike"
  | "pricing_change"
  | "cogs_reduction"
  | "new_product_launch"
  | "automation"
  | "tax_optimization"
  | "seasonality"
  | "market_expansion";

const SCENARIOS: { key: SimKey; label: string; description: string; category: string }[] = [
  { key: "lose_customer", label: "Lose a Major Customer", description: "Model impact of losing key revenue sources", category: "risk" },
  { key: "marketing_spend", label: "Increase Marketing Spend", description: "Investment in marketing with 3:1 ROI assumption", category: "growth" },
  { key: "hiring", label: "Hire New Staff", description: "Add team members with salary and benefits", category: "operations" },
  { key: "supply_cost_spike", label: "Supply Cost Spike", description: "Unexpected increase in supply chain costs", category: "risk" },
  { key: "pricing_change", label: "Change Pricing", description: "Price adjustments with demand elasticity", category: "revenue" },
  { key: "cogs_reduction", label: "Reduce COGS", description: "Cost optimization through efficiency", category: "operations" },
  { key: "new_product_launch", label: "New Product Launch", description: "Launch new product with revenue and costs", category: "growth" },
  { key: "automation", label: "Business Automation", description: "Technology investment for efficiency gains", category: "technology" },
  { key: "tax_optimization", label: "Tax Optimization", description: "Strategic tax planning to reduce burden", category: "finance" },
  { key: "seasonality", label: "Seasonal Impact", description: "Model seasonal business fluctuations", category: "planning" },
  { key: "market_expansion", label: "Market Expansion", description: "Enter new markets with ramp-up costs", category: "growth" },
];

/* ---------------- Interactive Chart ---------------- */
const InteractiveChart: React.FC<{ chartData: any[]; type?: string }> = ({ chartData, type = "area" }) => {
  const [activeMetric, setActiveMetric] = useState("comparison");

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 shadow-xl">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey.replace("_", " ")}: ${entry.value?.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {["comparison", "revenue", "expenses", "net_income"].map((metric) => (
          <button
            key={metric}
            onClick={() => setActiveMetric(metric)}
            className={`px-3 py-1 rounded-full text-sm transition-all ${
              activeMetric === metric ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {metric === "comparison" ? "COMPARISON VIEW" : metric.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {(activeMetric === "comparison" || activeMetric === "revenue") && (
              <Line
                type="monotone"
                dataKey="Baseline Forecast"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Baseline Revenue"
              />
            )}

            {(activeMetric === "comparison" || activeMetric === "revenue") && (
              <Line
                type="monotone"
                dataKey="Simulated Net Income"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                name="Simulated Revenue"
              />
            )}

            {activeMetric === "comparison" && <Bar dataKey="Differential" fill="#8b5cf6" fillOpacity={0.7} name="Delta (Difference)" />}

            {activeMetric === "revenue" && (
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Revenue" />
            )}

            {activeMetric === "expenses" && (
              <Area type="monotone" dataKey="expenses" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Expenses" />
            )}

            {activeMetric === "net_income" && (
              <Line type="monotone" dataKey="net_income" stroke="#6366f1" strokeWidth={3} dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }} name="Net Income" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Dashed lines = Baseline forecast | Solid lines = Simulated results | Bars = Delta (difference)
      </div>
    </div>
  );
};

/* ---------------- Main Component ---------------- */
export default function ActionsHubPage() {
  const router = useRouter();
  const { userId } = useAuth();

  const [activeView, setActiveView] = useState<"workflows" | "simulations">("simulations");
  const [selectedRole, setSelectedRole] = useState("manager");

  const [activeSimulations, setActiveSimulations] = useState<Record<SimKey, boolean>>({
    lose_customer: false,
    marketing_spend: false,
    hiring: false,
    supply_cost_spike: false,
    pricing_change: false,
    cogs_reduction: false,
    new_product_launch: false,
    automation: false,
    tax_optimization: false,
    seasonality: false,
    market_expansion: false,
  });

  const [simulationParams, setSimulationParams] = useState({
    newHires: 2,
    avgSalary: 65000,
    customerRevenueLoss: 30000,
    marketingSpendIncrease: 5000,
    supplyCostIncrease: 12,
    priceChangePercentage: 10,
    cogsReductionPercentage: 8,
    newProductRevenue: 15000,
    newProductCOGS: 4000,
    laborCostReduction: 120000,
    technologyInvestment: 80000,
    efficiencyGainPercentage: 18,
    taxSavingsPercentage: 5,
    implementationCost: 10000,
    seasonalBoostPercentage: 20,
    durationMonths: 3,
    newMarketRevenue: 40000,
    expansionCosts: 25000,
    rampUpMonths: 6,
  });

  const [analysisDataLocal, setAnalysisDataLocal] = useState<any>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch baseline analysis for charts
  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (!userId) return;
      try {
        const response = await fetch(`/api/v1/main/analysis_summary`);
        if (response.ok) {
          const data = await response.json();
          setAnalysisDataLocal(data);
        }
      } catch (err) {
        console.warn("Failed to fetch analysis data:", err);
      }
    };
    fetchAnalysisData();
  }, [userId]);

  // Suggestions auto-fill
  useEffect(() => {
    const activeScenarios = Object.keys(activeSimulations).filter((k) => activeSimulations[k as SimKey]);
    if (activeScenarios.length === 0) {
      setSmartSuggestions(null);
      return;
    }
    (async () => {
      try {
        const response = await fetch("/api/simulations/smart-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarios: activeScenarios }),
        });
        if (response.ok) {
          const data = await response.json();
          setSmartSuggestions(data);

          const newParams = { ...simulationParams };
          activeScenarios.forEach((scenario) => {
            const suggestion = data.suggestions?.[scenario];
            if (suggestion) {
              Object.keys(suggestion).forEach((param) => {
                if (param !== "rationale" && typeof suggestion[param] === "number" && param in newParams) {
                  (newParams as any)[param] = suggestion[param];
                }
              });
            }
          });
          setSimulationParams(newParams);
        }
      } catch (err) {
        console.warn("Smart suggestions failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSimulations]);

  const toggleSimulation = (simKey: SimKey) => {
    setActiveSimulations((prev) => ({ ...prev, [simKey]: !prev[simKey] }));
    setSimulationResult(null);
  };

  const handleSimParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const integerFields = ["newHires", "durationMonths", "rampUpMonths"];
    const numericValue = integerFields.includes(name) ? parseInt(value, 10) : parseFloat(value);
    setSimulationParams((prev) => ({ ...prev, [name]: isNaN(numericValue) ? 0 : numericValue }));
  };

  const parseServerError = async (res: Response) => {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (Array.isArray(data?.detail)) {
        msg = data.detail
          .map((e: any) =>
            typeof e === "string" ? e : `${e.index !== undefined ? `[${e.index}] ` : ""}${e.field ?? ""} ${e.msg ?? ""}`.trim()
          )
          .join(" | ");
      } else if (typeof data?.detail === "string") {
        msg = data.detail;
      } else if (data?.detail) {
        msg = JSON.stringify(data.detail);
      }
    } catch {
      /* keep default */
    }
    return msg;
  };

  type ChartRow = {
    date: string;
    revenue?: number;
    expenses?: number;
    net_income?: number;
    "Baseline Forecast"?: number;
    "Simulated Net Income"?: number | null;
    Differential?: number | null;
  };

  const chartData = useMemo<ChartRow[]>(() => {
    const rows = (analysisDataLocal as any)?.kpiChartData ?? [];

    const baselineSeries = Array.isArray(rows) && rows.length ? rows.filter((r: any) => r?.predicted) || rows : [];

    const base: ChartRow[] = baselineSeries.map((item: any) => ({
      date: item?.period_end_date
        ? new Date(item.period_end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : item?.period ?? "",
      "Baseline Forecast": Number(item?.net_income ?? 0) || 0,
      revenue: Number(item?.revenue ?? item?.total_revenue ?? 0) || 0,
      expenses: Number(item?.expenses ?? item?.total_expenses ?? 0) || 0,
      net_income: Number(item?.net_income ?? 0) || 0,
    }));

    const simPoints: any[] = (simulationResult as any)?.visualization_data ?? [];
    if (!simPoints.length) return base;

    const simMap = new Map<string, any>();
    simPoints.forEach((p) => {
      const key = p?.period_end_date
        ? new Date(p.period_end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : base.at(-1)?.date;
      if (key) simMap.set(key, p);
    });

    return base.map((pt) => {
      const sim = simMap.get(pt.date);
      const simNI = sim?.net_income ?? null;
      const diff = simNI !== null ? simNI - (pt["Baseline Forecast"] ?? 0) : null;
      return {
        ...pt,
        "Simulated Net Income": simNI,
        Differential: diff,
        revenue: sim?.revenue ?? pt.revenue,
        expenses: sim?.expenses ?? pt.expenses,
        net_income: sim?.net_income ?? pt.net_income,
      };
    });
  }, [analysisDataLocal, simulationResult]);

  const runSimulation = async () => {
    setIsLoading(true);
    setError("");
    setSimulationResult(null);

    const activeScenarios = Object.keys(activeSimulations).filter((k) => activeSimulations[k as SimKey]) as SimKey[];
    if (activeScenarios.length === 0) {
      setError("Please select at least one scenario.");
      setIsLoading(false);
      return;
    }

    const payload: Array<{ simulation_type: string; parameters: any }> = [];

    activeScenarios.forEach((simType) => {
      let parameters: any = {};
      switch (simType) {
        case "hiring":
          parameters = { newHires: simulationParams.newHires, avgSalary: simulationParams.avgSalary };
          break;
        case "lose_customer":
          parameters = { customerRevenueLoss: simulationParams.customerRevenueLoss };
          break;
        case "marketing_spend":
          parameters = { marketingSpendIncrease: simulationParams.marketingSpendIncrease };
          break;
        case "supply_cost_spike":
          parameters = { supplyCostIncrease: simulationParams.supplyCostIncrease };
          break;
        case "pricing_change":
          parameters = { priceChangePercentage: simulationParams.priceChangePercentage };
          break;
        case "cogs_reduction":
          parameters = { cogsReductionPercentage: simulationParams.cogsReductionPercentage };
          break;
        case "new_product_launch":
          parameters = { newProductRevenue: simulationParams.newProductRevenue, newProductCOGS: simulationParams.newProductCOGS };
          break;
        case "automation":
          parameters = {
            laborCostReduction: simulationParams.laborCostReduction,
            technologyInvestment: simulationParams.technologyInvestment,
            efficiencyGainPercentage: simulationParams.efficiencyGainPercentage,
          };
          break;
        case "tax_optimization":
          parameters = { taxSavingsPercentage: simulationParams.taxSavingsPercentage, implementationCost: simulationParams.implementationCost };
          break;
        case "seasonality":
          parameters = { seasonalBoostPercentage: simulationParams.seasonalBoostPercentage, durationMonths: simulationParams.durationMonths };
          break;
        case "market_expansion":
          parameters = {
            newMarketRevenue: simulationParams.newMarketRevenue,
            expansionCosts: simulationParams.expansionCosts,
            rampUpMonths: simulationParams.rampUpMonths,
          };
          break;
      }
      payload.push({ simulation_type: simType, parameters });
    });

    try {
      const res = await fetch("/api/simulations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: payload, detail_level: selectedRole }),
      });

      if (!res.ok) {
        const msg = await parseServerError(res);
        throw new Error(msg);
      }

      const data = await res.json();
      setSimulationResult(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToAdvisor = () => {
    if (!simulationResult) return;
    const prompt = `Based on a financial simulation where we model the impact of '${simulationResult.summary?.toLowerCase()}', our projected impacts are: ${simulationResult.impacts?.join(
      ", "
    )}. Draft a detailed business strategy and action plan.`;
    sessionStorage.setItem("advisorPrompt", prompt);
    router.push("/strategic-advisor");
  };

  const handleExport = () => {
    if (!simulationResult) return;
    const exportData = {
      simulation: simulationResult,
      selectedRole,
      scenarios: activeSimulations,
      parameters: simulationParams,
      timestamp: new Date().toISOString(),
    };
    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "simulation-analysis.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const anyScenarioSelected = Object.values(activeSimulations).some(Boolean);

  return (
    <>
      <AppSidebar />
      <div className="ml-64 min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-900">
        <div className="p-4 md:p-8 text-white">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Actions Hub</h1>
            <p className="text-gray-400 mt-2 text-lg">AI-powered business simulations with advanced analytics</p>
          </header>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-8 justify-center space-x-6">
            <button
              className={`flex items-center px-6 py-3 text-lg rounded-t-lg transition-all ${
                activeView === "workflows"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
              onClick={() => setActiveView("workflows")}
            >
              <BoltIcon /> Workflows
            </button>
            <button
              className={`flex items-center px-6 py-3 text-lg rounded-t-lg transition-all ${
                activeView === "simulations"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
              onClick={() => setActiveView("simulations")}
            >
              <BeakerIcon /> Smart Simulations
            </button>
          </div>

          {/* Simulations */}
          {activeView === "simulations" && (
            <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
              {/* Role Selection */}
              <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
                <RoleBasedAnalysisSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />
              </div>

              {/* Scenario Selection */}
              <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <SparklesIcon className="mr-2 h-5 w-5" />
                  1. Select Scenarios to Analyze
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SCENARIOS.map((scenario) => (
                    <ScenarioCheckbox
                      key={scenario.key}
                      scenario={scenario}
                      isChecked={activeSimulations[scenario.key]}
                      onChange={() => toggleSimulation(scenario.key)}
                      isRecommended={!!smartSuggestions?.suggestions?.[scenario.key]?.rationale}
                      suggestion={smartSuggestions?.suggestions?.[scenario.key]?.rationale}
                    />
                  ))}
                </div>
              </div>

              {/* Parameters */}
              {anyScenarioSelected && (
                <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center">
                      <SparklesIcon className="mr-2" />
                      2. AI-Optimized Parameters
                    </h2>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      {showAdvanced ? "Hide Advanced" : "Show Advanced"}
                    </button>
                  </div>

                  {/* Suggestions */}
                  {smartSuggestions && (
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-blue-400 mb-2">
                        <SparklesIcon className="inline h-4 w-4 mr-1" />
                        AI Recommendations:
                      </h3>
                      <div className="space-y-2 text-sm">
                        {Object.entries(smartSuggestions.suggestions || {}).map(([key, suggestion]: any) => (
                          <div key={key} className="text-gray-300 bg-gray-800/30 p-2 rounded">
                            <span className="font-medium text-blue-400">{String(key).replace("_", " ")}:</span>{" "}
                            {suggestion?.rationale}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inputs */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {Object.keys(activeSimulations)
                      .filter((key) => activeSimulations[key as SimKey])
                      .map((scenarioType) => (
                        <div key={scenarioType} className="bg-gray-900/50 p-4 rounded-lg">
                          <h3 className="font-semibold mb-3 capitalize text-indigo-400">{scenarioType.replace("_", " ")} Parameters</h3>

                          {scenarioType === "hiring" && (
                            <div className="space-y-3">
                              <LabeledNumber name="newHires" label="New Hires" value={simulationParams.newHires} onChange={handleSimParamChange} />
                              <LabeledNumber name="avgSalary" label="Average Salary ($)" value={simulationParams.avgSalary} onChange={handleSimParamChange} />
                            </div>
                          )}

                          {scenarioType === "lose_customer" && (
                            <LabeledNumber
                              name="customerRevenueLoss"
                              label="Monthly Revenue Loss ($)"
                              value={simulationParams.customerRevenueLoss}
                              onChange={handleSimParamChange}
                            />
                          )}

                          {scenarioType === "marketing_spend" && (
                            <LabeledNumber
                              name="marketingSpendIncrease"
                              label="Additional Monthly Marketing Spend ($)"
                              value={simulationParams.marketingSpendIncrease}
                              onChange={handleSimParamChange}
                            />
                          )}

                          {scenarioType === "supply_cost_spike" && (
                            <LabeledNumber
                              name="supplyCostIncrease"
                              label="Cost Increase Percentage (%)"
                              value={simulationParams.supplyCostIncrease}
                              onChange={handleSimParamChange}
                            />
                          )}

                          {scenarioType === "pricing_change" && (
                            <LabeledNumber
                              name="priceChangePercentage"
                              label="Price Change Percentage (%)"
                              value={simulationParams.priceChangePercentage}
                              onChange={handleSimParamChange}
                            />
                          )}

                          {scenarioType === "cogs_reduction" && (
                            <LabeledNumber
                              name="cogsReductionPercentage"
                              label="COGS Reduction Percentage (%)"
                              value={simulationParams.cogsReductionPercentage}
                              onChange={handleSimParamChange}
                            />
                          )}

                          {scenarioType === "new_product_launch" && (
                            <div className="space-y-3">
                              <LabeledNumber name="newProductRevenue" label="Monthly Revenue ($)" value={simulationParams.newProductRevenue} onChange={handleSimParamChange} />
                              <LabeledNumber name="newProductCOGS" label="Monthly COGS ($)" value={simulationParams.newProductCOGS} onChange={handleSimParamChange} />
                            </div>
                          )}

                          {scenarioType === "automation" && (
                            <div className="space-y-3">
                              <LabeledNumber
                                name="laborCostReduction"
                                label="Annual Labor Cost Reduction ($)"
                                value={simulationParams.laborCostReduction}
                                onChange={handleSimParamChange}
                              />
                              <LabeledNumber
                                name="technologyInvestment"
                                label="Technology Investment ($)"
                                value={simulationParams.technologyInvestment}
                                onChange={handleSimParamChange}
                              />
                              <LabeledNumber
                                name="efficiencyGainPercentage"
                                label="Efficiency Gain (%)"
                                value={simulationParams.efficiencyGainPercentage}
                                onChange={handleSimParamChange}
                              />
                            </div>
                          )}

                          {scenarioType === "tax_optimization" && (
                            <div className="space-y-3">
                              <LabeledNumber
                                name="taxSavingsPercentage"
                                label="Tax Savings Percentage (%)"
                                value={simulationParams.taxSavingsPercentage}
                                onChange={handleSimParamChange}
                              />
                              <LabeledNumber
                                name="implementationCost"
                                label="Implementation Cost ($)"
                                value={simulationParams.implementationCost}
                                onChange={handleSimParamChange}
                              />
                            </div>
                          )}

                          {scenarioType === "seasonality" && (
                            <div className="space-y-3">
                              <LabeledNumber
                                name="seasonalBoostPercentage"
                                label="Seasonal Boost Percentage (%)"
                                value={simulationParams.seasonalBoostPercentage}
                                onChange={handleSimParamChange}
                              />
                              <LabeledNumber
                                name="durationMonths"
                                label="Duration (Months)"
                                value={simulationParams.durationMonths}
                                onChange={handleSimParamChange}
                              />
                            </div>
                          )}

                          {scenarioType === "market_expansion" && (
                            <div className="space-y-3">
                              <LabeledNumber
                                name="newMarketRevenue"
                                label="New Market Revenue ($)"
                                value={simulationParams.newMarketRevenue}
                                onChange={handleSimParamChange}
                              />
                              <LabeledNumber
                                name="expansionCosts"
                                label="Expansion Costs ($)"
                                value={simulationParams.expansionCosts}
                                onChange={handleSimParamChange}
                              />
                              <LabeledNumber
                                name="rampUpMonths"
                                label="Ramp Up Months"
                                value={simulationParams.rampUpMonths}
                                onChange={handleSimParamChange}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Run Button */}
              <div className="text-center">
                <button
                  onClick={runSimulation}
                  disabled={!anyScenarioSelected || isLoading}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center mx-auto transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Running AI Analysis...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="mr-2" />
                      Run Advanced Simulation
                    </>
                  )}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-xl text-center backdrop-blur-sm">
                  <strong>Simulation Error:</strong> {error}
                </div>
              )}

              {/* Results & Chart */}
              {simulationResult && (
                <>
                  <SimulationResultsDisplay results={simulationResult} baselineData={analysisDataLocal} />

                  {chartData.length > 0 && (
                    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
                      <h3 className="text-xl font-bold mb-4">Interactive Forecast Comparison</h3>
                      <InteractiveChart chartData={chartData} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      onClick={handleGoToAdvisor}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
                    >
                      Open in Strategic Advisor
                    </button>
                    <button
                      onClick={handleExport}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
                    >
                      Export Analysis
                    </button>

                    <button
                      onClick={() => {
                        setSimulationResult(null);
                        setActiveSimulations({
                          lose_customer: false,
                          marketing_spend: false,
                          hiring: false,
                          supply_cost_spike: false,
                          pricing_change: false,
                          cogs_reduction: false,
                          new_product_launch: false,
                          automation: false,
                          tax_optimization: false,
                          seasonality: false,
                          market_expansion: false,
                        });
                        setSmartSuggestions(null);
                        setError("");
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
                    >
                      Reset Simulation
                    </button>
                  </div>
                </>
              )}
            </div>
          )} {/* ← closes the conditional correctly */}
        </div>
      </div>
    </>
  );
}

/* ---------------- Small field helper ---------------- */
function LabeledNumber({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
