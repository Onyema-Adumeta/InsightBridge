"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell, PieChart, Pie, RadialBarChart, RadialBar
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle,
  Download, Upload, RefreshCw, Info, Target, Lightbulb,
  BarChart3, Shield, Zap, Newspaper, Sparkles, Clock,
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle2,
  AlertTriangle, XCircle, BookOpen, Brain, FileText,
  Menu, X, ChevronRight, Award
} from 'lucide-react';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value) => {
  if (!value && value !== 0) return 'N/A';
  return `${value.toFixed(1)}%`;
};

const formatNumber = (value) => {
  if (!value && value !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
};

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================
const KpiCard = ({ title, value, change, trend, isCurrency, isPercent, target, icon: Icon, tooltip }) => {
  const formattedValue = isCurrency 
    ? formatCurrency(value) 
    : isPercent 
    ? formatPercent(value) 
    : formatNumber(value);
  
  const changeColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const bgColor = trend === 'up' ? 'bg-green-50' : trend === 'down' ? 'bg-red-50' : 'bg-gray-50';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            {Icon && <Icon className="w-5 h-5 text-gray-700" />}
          </div>
          <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        </div>
        {tooltip && (
          <div className="group relative">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="hidden group-hover:block absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="text-3xl font-bold text-gray-900">{formattedValue}</div>
        
        {change !== undefined && change !== null && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 ${changeColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="font-semibold text-sm">
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-gray-500">vs previous period</span>
          </div>
        )}
        
        {target && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Target: {isCurrency ? formatCurrency(target) : isPercent ? formatPercent(target) : formatNumber(target)}</span>
              <span className={value >= target ? 'text-green-600' : 'text-orange-600'}>
                {value >= target ? '✓ On track' : '⚠ Below target'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// HEALTH SCORE GAUGE
// ============================================================================
const HealthScoreGauge = ({ score, summary }) => {
  const getScoreColor = (s) => {
    if (s >= 80) return '#22C55E';
    if (s >= 60) return '#EAB308';
    if (s >= 40) return '#F97316';
    return '#EF4444';
  };

  const getScoreLabel = (s) => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const data = [{ name: 'Score', value: score, fill: getScoreColor(score) }];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-600" />
        Financial Health Score
      </h3>
      
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              background
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        
        <div className="text-center -mt-24 mb-16">
          <div className="text-5xl font-bold" style={{ color: getScoreColor(score) }}>
            {score}
          </div>
          <div className="text-sm font-semibold text-gray-600 mt-1">
            {getScoreLabel(score)}
          </div>
        </div>

        {summary && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 w-full">
            <p className="text-sm text-gray-700">{summary}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// BENCHMARK COMPARISON
// ============================================================================
const BenchmarkComparison = ({ data }) => {
  if (!data) return null;

  const benchmarks = [
    {
      metric: 'Gross Margin',
      value: data.grossMargin || 0,
      industry: 65,
      best: 75,
      unit: '%'
    },
    {
      metric: 'Net Margin',
      value: data.netMargin || 0,
      industry: 25,
      best: 35,
      unit: '%'
    },
    {
      metric: 'Current Ratio',
      value: data.currentRatio || 0,
      industry: 2.0,
      best: 3.0,
      unit: 'x'
    },
    {
      metric: 'ROE',
      value: data.roe || 15,
      industry: 15,
      best: 25,
      unit: '%'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Target className="w-5 h-5 text-purple-600" />
        Industry Benchmarks
      </h3>

      <div className="space-y-6">
        {benchmarks.map((item, idx) => {
          const percentage = (item.value / item.best) * 100;
          const industryPercentage = (item.industry / item.best) * 100;
          
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{item.metric}</span>
                <span className="font-bold text-gray-900">
                  {item.value.toFixed(1)}{item.unit}
                </span>
              </div>
              
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
                <div
                  className="absolute h-full border-l-2 border-orange-500"
                  style={{ left: `${industryPercentage}%` }}
                  title="Industry Average"
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Industry: {item.industry}{item.unit}</span>
                <span>Best-in-class: {item.best}{item.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// FORECAST CHART
// ============================================================================
const ForecastChart = ({ historicalData, forecastData }) => {
  if (!historicalData || historicalData.length === 0) return null;

  // Combine historical and forecast data
  const chartData = [...historicalData];
  
  // Add forecast periods if available
  if (forecastData && forecastData.length > 0) {
    forecastData.forEach(item => {
      chartData.push({
        period: item.period,
        revenue: null,
        forecastedRevenue: item.revenue,
        forecastedExpenses: item.expenses,
        forecastedProfit: item.netIncome
      });
    });
  } else {
    // Generate simple forecast based on trend
    const lastPeriods = historicalData.slice(-3);
    const avgRevenue = lastPeriods.reduce((sum, p) => sum + (p.revenue || 0), 0) / lastPeriods.length;
    const avgGrowth = lastPeriods.length > 1 
      ? (lastPeriods[lastPeriods.length - 1].revenue - lastPeriods[0].revenue) / lastPeriods[0].revenue / lastPeriods.length
      : 0.05;

    // Generate 3 forecast periods
    for (let i = 1; i <= 3; i++) {
      const forecastRevenue = avgRevenue * Math.pow(1 + avgGrowth, i);
      chartData.push({
        period: `Forecast ${i}`,
        revenue: null,
        forecastedRevenue: forecastRevenue,
        forecastedExpenses: forecastRevenue * 0.65,
        forecastedProfit: forecastRevenue * 0.35
      });
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-600" />
        Revenue Forecast
      </h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="period" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            
            {/* Historical Revenue */}
            <Area 
              type="monotone" 
              dataKey="revenue" 
              fill="#3B82F6" 
              fillOpacity={0.15} 
              stroke="#3B82F6"
              strokeWidth={3}
              name="Actual Revenue"
            />
            
            {/* Forecasted Revenue */}
            <Area 
              type="monotone" 
              dataKey="forecastedRevenue" 
              fill="#A78BFA" 
              fillOpacity={0.15} 
              stroke="#A78BFA"
              strokeWidth={3}
              strokeDasharray="5 5"
              name="Forecasted Revenue"
            />
            
            {/* Forecasted Profit */}
            <Line 
              type="monotone" 
              dataKey="forecastedProfit" 
              stroke="#10B981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              name="Forecasted Profit"
            />
            
            <ReferenceLine y={0} stroke="#9CA3AF" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-sm text-gray-700">
          📈 <strong>Forecast Model:</strong> Based on {historicalData.length} periods of historical data with trend analysis. 
          Dashed lines represent projected values.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// PREDICTIVE INSIGHTS
// ============================================================================
const PredictiveInsights = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-indigo-600" />
        Predictive Analysis
      </h3>

      <div className="space-y-4">
        {insights.map((insight, idx) => {
          const IconComponent = insight.type === 'success' ? CheckCircle2 
            : insight.type === 'warning' ? AlertTriangle 
            : insight.type === 'danger' ? XCircle 
            : Lightbulb;
          
          const colorClass = insight.type === 'success' ? 'text-green-600 bg-green-50' 
            : insight.type === 'warning' ? 'text-orange-600 bg-orange-50' 
            : insight.type === 'danger' ? 'text-red-600 bg-red-50' 
            : 'text-blue-600 bg-blue-50';

          return (
            <div key={idx} className={`p-4 rounded-lg border ${colorClass.replace('text-', 'border-').replace('-600', '-200')}`}>
              <div className="flex items-start gap-3">
                <IconComponent className={`w-5 h-5 mt-0.5 ${colorClass.split(' ')[0]}`} />
                <div className="flex-1">
                  {insight.title && (
                    <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                  )}
                  <p className="text-sm text-gray-700">{insight.text}</p>
                  {insight.suggestion && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      💡 {insight.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// EXECUTIVE SUMMARY
// ============================================================================
const ExecutiveSummary = ({ summaries }) => {
  if (!summaries || summaries.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-700" />
        Executive Summary
      </h3>

      <div className="space-y-6">
        {summaries.map((item, idx) => (
          <div key={idx} className="space-y-3">
            {item.summary && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">{item.summary}</p>
              </div>
            )}
            
            {item.ai_advice && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">AI Recommendation</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{item.ai_advice}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MICRO-LEARNING EXPLAINERS
// ============================================================================
const MicroLearningCard = ({ term, definition, example }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
         onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <h4 className="font-semibold text-gray-900 text-sm">{term}</h4>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </div>
      
      {isExpanded && (
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <p>{definition}</p>
          {example && (
            <div className="p-2 bg-indigo-50 rounded border border-indigo-100">
              <p className="text-xs"><strong>Example:</strong> {example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MicroLearningSection = () => {
  const explainers = [
    {
      term: "Gross Margin",
      definition: "The percentage of revenue remaining after subtracting cost of goods sold. Higher is better.",
      example: "If you have $100k revenue and $30k COGS, your gross margin is 70%."
    },
    {
      term: "Current Ratio",
      definition: "Measures ability to pay short-term obligations. Ratio of current assets to current liabilities.",
      example: "A ratio of 2.0 means you have $2 in assets for every $1 in liabilities."
    },
    {
      term: "Free Cash Flow",
      definition: "Cash generated after capital expenditures. Shows how much cash is available for growth.",
      example: "Operating cash flow of $500k minus $200k capex = $300k free cash flow."
    },
    {
      term: "EBITDA",
      definition: "Earnings before interest, taxes, depreciation, and amortization. Measures operational performance.",
      example: "Net income + interest + taxes + depreciation + amortization."
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-indigo-600" />
        Financial Literacy Corner
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {explainers.map((item, idx) => (
          <MicroLearningCard key={idx} {...item} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// ANALYTICS CHARTS
// ============================================================================
const AnalyticsCharts = ({ data }) => {
  const [activeTab, setActiveTab] = useState('performance');

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No time-series data available. Upload financial statements to see trends.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'profitability', label: 'Profitability', icon: DollarSign },
    { id: 'cashflow', label: 'Cash Flow', icon: Activity },
    { id: 'balance', label: 'Balance Sheet', icon: Shield }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'performance' && (
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="period" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                fill="#3B82F6" 
                fillOpacity={0.1} 
                stroke="none" 
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={3} 
                dot={{ r: 4 }}
                name="Revenue"
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#EF4444" 
                strokeWidth={2} 
                dot={{ r: 3 }}
                name="Expenses"
              />
              <Line 
                type="monotone" 
                dataKey="netIncome" 
                stroke="#22C55E" 
                strokeWidth={2} 
                dot={{ r: 3 }}
                name="Net Income"
              />
              <ReferenceLine y={0} stroke="#9CA3AF" />
            </ComposedChart>
          )}

          {activeTab === 'profitability' && (
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="period" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="gross_profit" 
                stroke="#14B8A6" 
                strokeWidth={3} 
                dot={{ r: 4 }}
                name="Gross Profit"
              />
              <Line 
                type="monotone" 
                dataKey="ebitda" 
                stroke="#8B5CF6" 
                strokeWidth={2} 
                dot={{ r: 3 }}
                name="EBITDA"
              />
              <Line 
                type="monotone" 
                dataKey="operating_margin" 
                stroke="#F59E0B" 
                strokeWidth={2} 
                dot={{ r: 3 }}
                name="Operating Margin (%)"
              />
            </ComposedChart>
          )}

          {activeTab === 'cashflow' && (
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="period" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ocf" 
                stroke="#22C55E" 
                strokeWidth={3} 
                dot={{ r: 4 }}
                name="Operating Cash Flow"
              />
              <Line 
                type="monotone" 
                dataKey="icf" 
                stroke="#F59E0B" 
                strokeWidth={2} 
                dot={{ r: 3 }}
                name="Investing Cash Flow"
              />
              <Line 
                type="monotone" 
                dataKey="fcf" 
                stroke="#0EA5E9" 
                strokeWidth={2} 
                dot={{ r: 3 }}
                name="Free Cash Flow"
              />
              <ReferenceLine y={0} stroke="#9CA3AF" />
            </ComposedChart>
          )}

          {activeTab === 'balance' && (
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="period" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="assets" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.3}
                name="Total Assets"
              />
              <Area 
                type="monotone" 
                dataKey="liabilities" 
                stroke="#EF4444" 
                fill="#EF4444" 
                fillOpacity={0.3}
                name="Total Liabilities"
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function FinancialDashboard({ 
  analysisData, 
  onUpload, 
  onRefresh, 
  onExport,
  onGenerateReport,
  isLoading 
}) {
  // Extract KPI data
  const kpiData = analysisData?.kpiCardData || {};
  const timeSeriesData = analysisData?.kpiChartData || [];
  const healthScore = analysisData?.health_score || {};
  const benchmarkData = analysisData?.benchmarkAnalysis || kpiData;
  const summaries = analysisData?.summaries || [];
  const predictiveInsights = analysisData?.predictiveAnalysis?.insights || [];

  // File upload handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                {analysisData?.company || 'Company'} • {analysisData?.dateRange || 'All Periods'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="btn-secondary cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".xlsx,.xls,.csv,.json,.pdf"
                  className="hidden"
                  disabled={isLoading}
                />
              </label>

              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={onExport}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>

              <button
                onClick={onGenerateReport}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Revenue"
              value={kpiData.revenue?.value}
              change={kpiData.revenue?.change}
              trend={kpiData.revenue?.trend}
              target={kpiData.revenue?.target}
              isCurrency
              icon={DollarSign}
              tooltip="Total revenue generated during the period"
            />
            <KpiCard
              title="Net Profit"
              value={kpiData.netProfit?.value || kpiData.profit?.value}
              change={kpiData.netProfit?.change || kpiData.profit?.change}
              trend={kpiData.netProfit?.trend || kpiData.profit?.trend}
              target={kpiData.netProfit?.target || kpiData.profit?.target}
              isCurrency
              icon={TrendingUp}
              tooltip="Profit after all expenses and taxes"
            />
            <KpiCard
              title="Gross Margin"
              value={kpiData.grossMargin?.value}
              change={kpiData.grossMargin?.change}
              trend={kpiData.grossMargin?.trend}
              target={kpiData.grossMargin?.target}
              isPercent
              icon={Activity}
              tooltip="Revenue minus cost of goods sold, as percentage"
            />
            <KpiCard
              title="Current Ratio"
              value={kpiData.currentRatio?.value}
              change={kpiData.currentRatio?.change}
              trend={kpiData.currentRatio?.trend}
              target={kpiData.currentRatio?.target}
              icon={Shield}
              tooltip="Ability to pay short-term obligations"
            />
          </div>

          {/* Charts Section */}
          <AnalyticsCharts data={timeSeriesData} />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {summaries.length > 0 && <ExecutiveSummary summaries={summaries} />}
              {predictiveInsights.length > 0 && <PredictiveInsights insights={predictiveInsights} />}
              <MicroLearningSection />
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-6">
              {healthScore.score && (
                <HealthScoreGauge 
                  score={healthScore.score} 
                  summary={healthScore.summary} 
                />
              )}
              <BenchmarkComparison data={benchmarkData} />
            </div>
          </div>

          {/* Additional KPIs Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Operating Expenses"
              value={kpiData.expenses?.value}
              change={kpiData.expenses?.change}
              trend={kpiData.expenses?.trend}
              target={kpiData.expenses?.target}
              isCurrency
              icon={AlertCircle}
              tooltip="Total operating expenses for the period"
            />
            <KpiCard
              title="Cash Flow"
              value={kpiData.cashFlow?.value}
              change={kpiData.cashFlow?.change}
              trend={kpiData.cashFlow?.trend}
              target={kpiData.cashFlow?.target}
              isCurrency
              icon={Activity}
              tooltip="Net cash flow from operations"
            />
            <KpiCard
              title="Net Margin"
              value={kpiData.netMargin?.value}
              change={kpiData.netMargin?.change}
              trend={kpiData.netMargin?.trend}
              target={kpiData.netMargin?.target}
              isPercent
              icon={BarChart3}
              tooltip="Net profit as percentage of revenue"
            />
            <KpiCard
              title="Debt-to-Equity"
              value={kpiData.debtToEquity?.value}
              change={kpiData.debtToEquity?.change}
              trend={kpiData.debtToEquity?.trend}
              target={kpiData.debtToEquity?.target}
              icon={Shield}
              tooltip="Ratio of total debt to shareholder equity"
            />
          </div>

          {/* Recommendations Section */}
          {analysisData?.predictiveAnalysis?.forecast && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-sm border border-indigo-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                AI-Powered Forecast
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {analysisData.predictiveAnalysis.forecast}
              </p>
            </div>
          )}

          {/* Empty State */}
          {!analysisData && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Data Available
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Upload your financial statements (Excel, CSV, PDF) to get started with AI-powered analysis and insights.
              </p>
              <label className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium">
                <Upload className="w-5 h-5" />
                Upload Financial Data
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".xlsx,.xls,.csv,.json,.pdf"
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Processing Financial Data
              </h3>
              <p className="text-sm text-gray-600 text-center">
                Analyzing statements and generating insights...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}