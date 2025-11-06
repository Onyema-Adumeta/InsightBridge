"use client";

import React, { useState } from 'react';
import { 
  ComposedChart, 
  Area, 
  Line,
  Bar,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  ResponsiveContainer 
} from "recharts";

interface SimulationChartProps {
  chartData: any[];
}

export default function SimulationChart({ chartData }: SimulationChartProps) {
  const [activeMetric, setActiveMetric] = useState("all");
  const [showConfidence, setShowConfidence] = useState(true);

  // Custom tooltip with better formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 shadow-xl backdrop-blur-sm">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value !== null && entry.value !== undefined) {
              const value = typeof entry.value === 'number' 
                ? entry.value.toLocaleString('en-US', { 
                    style: 'currency', 
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0 
                  })
                : entry.value;
              
              return (
                <p key={index} style={{ color: entry.color }} className="text-sm">
                  {`${entry.name}: ${value}`}
                  {entry.payload?.confidence && (
                    <span className="text-xs text-gray-400 ml-2">
                      ({Math.round(entry.payload.confidence * 100)}% confidence)
                    </span>
                  )}
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  // Custom legend with enhanced styling
  const CustomLegend = ({ payload }: any) => {
    const legendItems = [
      { value: "Historical Revenue", color: "#10b981", description: "Actual revenue from your financial data" },
      { value: "Historical Expenses", color: "#ef4444", description: "Actual expenses from your financial data" },
      { value: "Baseline Net Income", color: "#6366f1", description: "Net income without simulation changes" },
      { value: "Simulated Net Income", color: "#f59e0b", description: "Projected net income with simulation scenarios" },
      { value: "Differential", color: "#8b5cf6", description: "Difference between baseline and simulated results" }
    ];

    return (
      <div className="flex justify-center mt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          {legendItems.map((item, index) => {
            const isActive = payload?.some((p: any) => p.value === item.value);
            return (
              <div 
                key={index} 
                className={`flex items-center ${isActive ? 'opacity-100' : 'opacity-50'}`}
                title={item.description}
              >
                <div 
                  className="w-3 h-3 rounded mr-2 flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-300 text-xs">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Filter metrics based on selection
  const getVisibleMetrics = () => {
    switch (activeMetric) {
      case "revenue":
        return ["revenue"];
      case "expenses": 
        return ["expenses"];
      case "net_income":
        return ["net_income", "Baseline Forecast", "Simulated Net Income"];
      case "comparison":
        return ["Baseline Forecast", "Simulated Net Income", "Differential"];
      default:
        return ["all"];
    }
  };

  const visibleMetrics = getVisibleMetrics();

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-wrap gap-3 justify-center items-center">
        <div className="flex gap-2">
          {[
            { key: "all", label: "All Metrics" },
            { key: "revenue", label: "Revenue Only" },
            { key: "expenses", label: "Expenses Only" },
            { key: "net_income", label: "Net Income" },
            { key: "comparison", label: "Comparison" }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setActiveMetric(option.key)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                activeMetric === option.key
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setShowConfidence(!showConfidence)}
          className={`px-3 py-1 rounded-full text-sm transition-all ${
            showConfidence
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {showConfidence ? "Hide" : "Show"} Confidence
        </button>
      </div>

      {/* Enhanced Chart */}
      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <defs>
              {/* Enhanced gradients */}
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="netIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af" 
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12} 
              tickFormatter={(value) => {
                if (typeof value === 'number') {
                  return Math.abs(value) > 999 
                    ? `$${(value/1000).toFixed(0)}k` 
                    : `$${value.toFixed(0)}`;
                }
                return value;
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />

            {/* Historical Revenue Area */}
            {(activeMetric === "all" || activeMetric === "revenue") && (
              <Area
                type="monotone"
                dataKey="revenue"
                name="Historical Revenue"
                stroke="#10b981"
                fill="url(#revenueGradient)"
                strokeWidth={2}
                connectNulls={false}
              />
            )}

            {/* Historical Expenses Area */}
            {(activeMetric === "all" || activeMetric === "expenses") && (
              <Area
                type="monotone"
                dataKey="expenses" 
                name="Historical Expenses"
                stroke="#ef4444"
                fill="url(#expensesGradient)"
                strokeWidth={2}
                connectNulls={false}
              />
            )}

            {/* Baseline Forecast Line */}
            {(activeMetric === "all" || activeMetric === "net_income" || activeMetric === "comparison") && (
              <Line
                type="monotone"
                dataKey="Baseline Forecast"
                name="Baseline Net Income"
                stroke="#6366f1"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
            )}

            {/* Simulated Net Income Line */}
            {(activeMetric === "all" || activeMetric === "net_income" || activeMetric === "comparison") && (
              <Line
                type="monotone"
                dataKey="Simulated Net Income"
                name="Simulated Net Income" 
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }}
                connectNulls={false}
              />
            )}

            {/* Differential Bar */}
            {(activeMetric === "all" || activeMetric === "comparison") && (
              <Bar
                dataKey="Differential"
                name="Differential"
                fill="#8b5cf6"
                fillOpacity={0.7}
                radius={[2, 2, 0, 0]}
              />
            )}

            {/* Confidence Range (if enabled) */}
            {showConfidence && activeMetric !== "expenses" && activeMetric !== "revenue" && (
              <Area
                type="monotone"
                dataKey="revenue_range.upper"
                name="Confidence Range"
                stroke="transparent"
                fill="#6366f1"
                fillOpacity={0.1}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Insights */}
      <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Chart Insights</h4>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-gray-400">
          <div>
            <span className="font-medium text-blue-400">Historical Data:</span>
            <p>Solid areas show your actual financial performance</p>
          </div>
          <div>
            <span className="font-medium text-yellow-400">Projections:</span>
            <p>Lines show baseline vs simulated forecasts</p>
          </div>
          <div>
            <span className="font-medium text-purple-400">Impact:</span>
            <p>Bars show the differential between scenarios</p>
          </div>
        </div>
      </div>
    </div>
  );
}