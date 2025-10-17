"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MetricData {
  name: string;
  value: number;
  color: string;
}

interface SinglePeriodData {
  period: string;
  chartType: 'bar';
  metrics: MetricData[];
  type: 'profitLoss' | 'balanceSheet' | 'cashFlow';
}

interface MultiPeriodData {
  period: string;
  chartType: 'line';
  revenue?: number;
  expenses?: number;
  net_income?: number;
  gross_profit?: number;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  operating_cash_flow?: number;
  investing_cash_flow?: number;
  financing_cash_flow?: number;
  predicted: boolean;
  type: 'profitLoss' | 'balanceSheet' | 'cashFlow';
}

type ChartData = SinglePeriodData | MultiPeriodData;

interface AdaptiveFinancialChartProps {
  chartData: ChartData[];
  title?: string;
  subtitle?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
        <p className="font-semibold text-slate-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm flex items-center justify-between gap-4" style={{ color: entry.color }}>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold">{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================================
// SINGLE PERIOD BAR CHART
// ============================================================================

const SinglePeriodBarChart: React.FC<{ data: SinglePeriodData }> = ({ data }) => {
  const chartData = data.metrics;

  return (
    <div className="w-full">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <span className="w-3 h-3 rounded-full bg-purple-400"></span>
          <span>Single Period Snapshot</span>
        </div>
        <span className="text-slate-400">•</span>
        <span className="text-xs text-slate-600">{data.period}</span>
      </div>
    </div>
  );
};

// ============================================================================
// MULTI-PERIOD LINE CHART
// ============================================================================

const MultiPeriodLineChart: React.FC<{ data: MultiPeriodData[] }> = ({ data }) => {
  const chartType = data[0]?.type || 'profitLoss';

  // Define which metrics to show based on chart type
  const getMetricConfig = () => {
    switch (chartType) {
      case 'profitLoss':
        return [
          { key: 'revenue', name: 'Revenue', color: '#10b981' },
          { key: 'expenses', name: 'Expenses', color: '#ef4444' },
          { key: 'gross_profit', name: 'Gross Profit', color: '#8b5cf6' },
          { key: 'net_income', name: 'Net Income', color: '#3b82f6' }
        ];
      case 'balanceSheet':
        return [
          { key: 'total_assets', name: 'Total Assets', color: '#3b82f6' },
          { key: 'total_liabilities', name: 'Total Liabilities', color: '#ef4444' },
          { key: 'total_equity', name: 'Total Equity', color: '#10b981' }
        ];
      case 'cashFlow':
        return [
          { key: 'operating_cash_flow', name: 'Operating', color: '#10b981' },
          { key: 'investing_cash_flow', name: 'Investing', color: '#f59e0b' },
          { key: 'financing_cash_flow', name: 'Financing', color: '#3b82f6' }
        ];
      default:
        return [];
    }
  };

  const metrics = getMetricConfig();

  return (
    <div className="w-full">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            {metrics.map((metric) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                strokeWidth={2.5}
                name={metric.name}
                dot={{ fill: metric.color, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: metric.color, stroke: '#fff', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <span className="w-3 h-3 rounded-full bg-blue-400"></span>
          <span>Multi-Period Trend</span>
        </div>
        <span className="text-slate-400">•</span>
        <span className="text-xs text-slate-600">{data.length} periods</span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN ADAPTIVE CHART COMPONENT
// ============================================================================

const AdaptiveFinancialChart: React.FC<AdaptiveFinancialChartProps> = ({
  chartData,
  title = 'Performance & Forecast',
  subtitle
}) => {
  // Debug logging
  console.log('[AdaptiveFinancialChart] ===== FULL DEBUG =====');
  console.log('1. Raw data:', chartData);
  console.log('2. Is array?:', Array.isArray(chartData));
  console.log('3. Length:', chartData?.length);
  console.log('4. First item:', chartData?.[0]);
  console.log('5. First item type:', typeof chartData?.[0]);
  console.log('6. Chart type:', chartData?.[0]?.chartType);
  console.log('7. Has metrics?:', chartData?.[0]?.metrics);
  console.log('8. Metrics length:', chartData?.[0]?.metrics?.length);

  // Handle empty data
  if (!chartData || chartData.length === 0) {
    console.log('❌ No data - showing empty state');
    return (
      <div className="w-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        </div>
        <div className="w-full h-80 flex items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-500">No chart data available</p>
            <p className="text-xs text-slate-400">Upload a financial document to see charts</p>
          </div>
        </div>
      </div>
    );
  }

  const firstDataPoint = chartData[0];
  const isSinglePeriod = firstDataPoint.chartType === 'bar';
  
  console.log('9. Is single period (bar)?:', isSinglePeriod);
  console.log('10. Will render:', isSinglePeriod ? 'BAR CHART' : 'LINE CHART');
  console.log('[AdaptiveFinancialChart] ===== END DEBUG =====');

  // Auto-generate subtitle if not provided
  const autoSubtitle = isSinglePeriod
    ? 'Snapshot comparison of key financial metrics'
    : 'Historical trends with AI-powered projections';

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle || autoSubtitle}</p>
      </div>

      {isSinglePeriod ? (
        <SinglePeriodBarChart data={firstDataPoint as SinglePeriodData} />
      ) : (
        <MultiPeriodLineChart data={chartData as MultiPeriodData[]} />
      )}
    </div>
  );
};

export default AdaptiveFinancialChart;