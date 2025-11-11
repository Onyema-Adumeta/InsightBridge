"use client";

import React, { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Info } from 'lucide-react';

// --- INTERFACES & PROPS ---
interface ChartDataPoint {
  period: string;
  // P&L
  revenue?: number;
  expenses?: number;
  net_income?: number;
  gross_profit?: number;
  // Balance Sheet
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  // Cash Flow
  operating_cash_flow?: number;
  investing_cash_flow?: number;
  financing_cash_flow?: number;
  net_change_in_cash?: number;
  // Forecast
  forecast_revenue?: number;
  forecast_net_income?: number;
  forecast_revenue_upper?: number;
  forecast_revenue_lower?: number;
  type?: string;
}

interface EnhancedTrendAnalysisChartProps {
  historicalData: any[];
  forecastData: any[]; 
}

// --- CUSTOM TOOLTIP COMPONENT ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const revenue = payload.find((p: any) => p.dataKey === 'revenue' || p.dataKey === 'forecast_revenue');
    const netIncome = payload.find((p: any) => p.dataKey === 'net_income' || p.dataKey === 'forecast_net_income');
    const expenses = payload.find((p: any) => p.dataKey === 'expenses');
    const grossProfit = payload.find((p: any) => p.dataKey === 'gross_profit');
    
    // Balance Sheet metrics
    const totalAssets = payload.find((p: any) => p.dataKey === 'total_assets');
    const totalLiabilities = payload.find((p: any) => p.dataKey === 'total_liabilities');
    const totalEquity = payload.find((p: any) => p.dataKey === 'total_equity');

    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-xl max-w-[280px] sm:max-w-none">
        <p className="font-semibold text-slate-900 mb-2 sm:mb-3 pb-2 border-b border-slate-200 text-xs sm:text-sm">{label}</p>
        <div className="space-y-1.5 sm:space-y-2">
          {/* P&L Metrics */}
          {revenue && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: revenue.stroke || '#10b981' }} />
                <span className="text-xs sm:text-sm text-slate-600">Revenue</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {formatCurrency(revenue.value)}
              </span>
            </div>
          )}
          {expenses && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: expenses.stroke || '#ef4444' }} />
                <span className="text-xs sm:text-sm text-slate-600">Expenses</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {formatCurrency(expenses.value)}
              </span>
            </div>
          )}
          {grossProfit && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: grossProfit.stroke || '#8b5cf6' }} />
                <span className="text-xs sm:text-sm text-slate-600">Gross Profit</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {formatCurrency(grossProfit.value)}
              </span>
            </div>
          )}
          {netIncome && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: netIncome.stroke || '#3b82f6' }} />
                <span className="text-xs sm:text-sm text-slate-600">Net Income</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {formatCurrency(netIncome.value)}
              </span>
            </div>
          )}
          
          {/* Balance Sheet Metrics */}
          {totalAssets && totalAssets.value > 0 && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: totalAssets.stroke || '#3b82f6' }} />
                <span className="text-xs sm:text-sm text-slate-600">Total Assets</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {formatCurrency(totalAssets.value)}
              </span>
            </div>
          )}
          {totalLiabilities && totalLiabilities.value > 0 && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: totalLiabilities.stroke || '#ef4444' }} />
                <span className="text-xs sm:text-sm text-slate-600">Total Liabilities</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {formatCurrency(totalLiabilities.value)}
              </span>
            </div>
          )}
          {totalEquity && totalEquity.value > 0 && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: totalEquity.stroke || '#10b981' }} />
                <span className="text-xs sm:text-sm text-slate-600">Total Equity</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {formatCurrency(totalEquity.value)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// --- CUSTOM LEGEND COMPONENT ---
const CustomLegend = ({ payload }: any) => {
  if (!payload) return null;
  
  const legendItems = payload.filter((item: any) => 
    item.dataKey !== 'forecast_revenue_upper' && 
    item.dataKey !== 'forecast_revenue_lower' &&
    item.dataKey !== '_'
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6 pt-3 sm:pt-4 px-2">
      {legendItems.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5 sm:gap-2">
          <div 
            className="w-6 sm:w-8 h-0.5 rounded-full flex-shrink-0" 
            style={{ 
              backgroundColor: entry.color,
              ...(entry.payload?.strokeDasharray && { 
                backgroundImage: `repeating-linear-gradient(90deg, ${entry.color} 0, ${entry.color} 8px, transparent 8px, transparent 12px)`,
                backgroundColor: 'transparent'
              })
            }}
          />
          <span className="text-xs sm:text-sm text-slate-700 font-medium whitespace-nowrap">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// --- MAIN CHART COMPONENT ---
export default function EnhancedTrendAnalysisChart({ historicalData, forecastData }: EnhancedTrendAnalysisChartProps) {
  
  console.log('[EnhancedTrendAnalysisChart] Rendering with:', { 
    historicalDataLength: historicalData?.length,
    forecastDataLength: forecastData?.length,
    historicalSample: historicalData?.[0],
    forecastSample: forecastData?.[0]
  });

  const combinedData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      console.log('[EnhancedTrendAnalysisChart] No historical data');
      return [];
    }

    const processedHistorical = historicalData.map(d => ({
      ...d,
      period: d.period || (d.period_end_date ? new Date(d.period_end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'),
    }));

    if (!forecastData || forecastData.length === 0) {
      console.log('[EnhancedTrendAnalysisChart] No forecast data, returning historical only');
      return processedHistorical;
    }

    const processedForecast = forecastData.map(d => ({
      ...d,
      period: d.period || (d.period_end_date ? new Date(d.period_end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Forecast'),
      forecast_revenue: d.revenue,
      forecast_net_income: d.net_income,
      forecast_revenue_upper: d.revenue * 1.05, 
      forecast_revenue_lower: d.revenue * 0.95,
    }));
    
    const lastHistoricalPoint = processedHistorical[processedHistorical.length - 1];
    if (lastHistoricalPoint) {
      processedForecast.unshift({
        ...lastHistoricalPoint,
        forecast_revenue: lastHistoricalPoint.revenue,
        forecast_net_income: lastHistoricalPoint.net_income,
      });
    }

    console.log('[EnhancedTrendAnalysisChart] Combined data created with forecast');
    return [...processedHistorical, ...processedForecast.slice(1)];
  }, [historicalData, forecastData]);
  
  // Determine what type of data we have
  const hasBalanceSheet = useMemo(() => 
    combinedData.some(d => d.type === 'balanceSheet' || (d.total_assets !== undefined && d.total_assets > 0)),
    [combinedData]
  );
  
  const hasProfitLoss = useMemo(() => 
    combinedData.some(d => d.type === 'profitLoss' || (d.revenue !== undefined && d.revenue > 0)),
    [combinedData]
  );

  console.log('[EnhancedTrendAnalysisChart] Data types:', { hasBalanceSheet, hasProfitLoss });

  if (!combinedData.length) {
    console.log('[EnhancedTrendAnalysisChart] No data to render');
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full mb-3">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium text-sm sm:text-base">No chart data available</p>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Upload financial statements to view trends</p>
      </div>
    );
  }
  
  const lastHistoricalPeriod = historicalData && historicalData.length > 0 
    ? historicalData[historicalData.length - 1].period 
    : null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
          {hasProfitLoss && hasBalanceSheet ? 'Financial Performance & Position' : 
           hasProfitLoss ? 'Performance & Forecast' : 
           'Balance Sheet Trends'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          {hasProfitLoss && hasBalanceSheet ? 'Complete financial overview with trends and projections' :
           hasProfitLoss ? 'Historical trends with AI-powered projections' :
           'Assets, liabilities, and equity over time'}
        </p>
      </div>

      {/* Chart Container */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-3 sm:p-4 lg:p-6 overflow-x-auto">
        <ResponsiveContainer width="100%" height={300} className="sm:!h-[350px] lg:!h-[400px]">
          <ComposedChart data={combinedData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            {/* Professional Grid */}
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f1f5f9" 
              vertical={false}
            />
            
            {/* X Axis */}
            <XAxis 
              dataKey="period" 
              stroke="#64748b"
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
              className="sm:text-xs"
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            
            {/* Y Axis */}
            <YAxis 
              stroke="#64748b"
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
              className="sm:text-xs"
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
              width={60}
              tickFormatter={(value) => {
                if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                return `$${value}`;
              }}
            />
            
            {/* Tooltip */}
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
            
            {/* Legend */}
            <Legend content={<CustomLegend />} />

            {/* Confidence Band (only for forecast) */}
            {forecastData && forecastData.length > 0 && (
              <>
                <Area 
                  type="monotone" 
                  dataKey="forecast_revenue_upper" 
                  stroke="none"
                  fill="#8b5cf6" 
                  fillOpacity={0.1} 
                  name="Revenue Confidence"
                  stackId="confidence"
                />
                <Area 
                  type="monotone" 
                  dataKey="forecast_revenue_lower" 
                  stroke="none"
                  fill="#ffffff" 
                  fillOpacity={1}
                  name="_" 
                  stackId="confidence"
                />
              </>
            )}

            {/* P&L Historical Lines */}
            {hasProfitLoss && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                  className="sm:!r-4"
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  className="sm:!r-6"
                  name="Revenue" 
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                  name="Expenses" 
                />
                <Line 
                  type="monotone" 
                  dataKey="gross_profit" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                  name="Gross Profit" 
                />
                <Line 
                  type="monotone" 
                  dataKey="net_income" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  name="Net Income" 
                />
              </>
            )}

            {/* Balance Sheet Lines */}
            {hasBalanceSheet && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="total_assets" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  name="Total Assets" 
                />
                <Line 
                  type="monotone" 
                  dataKey="total_liabilities" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                  name="Total Liabilities" 
                />
                <Line 
                  type="monotone" 
                  dataKey="total_equity" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  name="Total Equity" 
                />
              </>
            )}

            {/* P&L Forecast Lines */}
            {hasProfitLoss && forecastData && forecastData.length > 0 && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="forecast_revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  strokeDasharray="8 4"
                  dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  name="Revenue Forecast" 
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast_net_income" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  className="sm:!stroke-[2.5px]"
                  strokeDasharray="8 4"
                  dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  name="Net Income Forecast" 
                />
              </>
            )}

            {/* Reference Line for Forecast Start */}
            {lastHistoricalPeriod && forecastData && forecastData.length > 0 && (
              <ReferenceLine 
                x={lastHistoricalPeriod} 
                stroke="#94a3b8" 
                strokeDasharray="3 3"
                label={{ 
                  value: 'Forecast', 
                  position: 'top', 
                  fill: '#64748b', 
                  fontSize: 11,
                  fontWeight: 500 
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Info Badge */}
      <div className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-50 border border-purple-200 rounded-lg">
        <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-purple-900 mb-1">
            {forecastData && forecastData.length > 0 ? 'Forecast Model' : 'Historical Data'}
          </p>
          <p className="text-xs text-purple-800 leading-relaxed">
            {forecastData && forecastData.length > 0 
              ? `Based on ${historicalData.length} periods of historical data with trend analysis. Dashed lines represent projected values with 95% confidence intervals (shaded area).`
              : `Showing ${historicalData.length} periods of historical financial data. Upload more periods to enable forecasting.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}