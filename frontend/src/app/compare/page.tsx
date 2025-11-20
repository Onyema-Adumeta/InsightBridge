"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Target, BarChart3, Award, AlertTriangle, DollarSign, Activity, Sparkles } from 'lucide-react';

// ✅ CRITICAL FIX: Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

interface PeriodData {
  period: string;
  revenue: number;
  gross_profit: number;
  operating_margin: number;
  net_income: number;
  total_assets?: number;
  operating_cash_flow?: number;
}

interface IndustryBenchmark {
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

const industryBenchmarks: Record<string, IndustryBenchmark> = {
  'SaaS': { grossMargin: 75, operatingMargin: 20, netMargin: 15 },
  'E-Commerce': { grossMargin: 45, operatingMargin: 10, netMargin: 8 },
  'Manufacturing': { grossMargin: 35, operatingMargin: 12, netMargin: 7 },
  'FinTech': { grossMargin: 65, operatingMargin: 25, netMargin: 18 },
  'Healthcare': { grossMargin: 55, operatingMargin: 15, netMargin: 12 },
  'Retail': { grossMargin: 40, operatingMargin: 8, netMargin: 5 }
};

export default function ComparePage() {
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [leftPeriod, setLeftPeriod] = useState<string>('');
  const [rightPeriod, setRightPeriod] = useState<string>('');
  const [comparisonMode, setComparisonMode] = useState<'periods' | 'industry'>('periods');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('SaaS');
  const [isLoading, setIsLoading] = useState(true);
  const [companyContext, setCompanyContext] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchCompanyContext();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const userId = 'user_2xrpbDp0Snom3M43V3xwGGebho3'; // Get from auth
      const response = await fetch(`/api/v1/main/analysis_summary`);
      const data = await response.json();

      if (data?.kpiChartData && data.kpiChartData.length > 0) {
        setPeriodData(data.kpiChartData);
        // Set default selections to last two periods
        if (data.kpiChartData.length >= 2) {
          setLeftPeriod(data.kpiChartData[data.kpiChartData.length - 2].period);
          setRightPeriod(data.kpiChartData[data.kpiChartData.length - 1].period);
        } else if (data.kpiChartData.length === 1) {
          setLeftPeriod(data.kpiChartData[0].period);
          setRightPeriod(data.kpiChartData[0].period);
        }
      }
    } catch (error) {
      console.error('Error fetching period data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyContext = async () => {
    try {
      // ✅ FIXED: Use client-side API URL
      const API_URL = typeof window !== 'undefined' 
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000')
        : 'http://127.0.0.1:8000';
      
      const userId = 1; // Get from auth
      const response = await fetch(`${API_URL}/api/company-context?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setCompanyContext(data);
          setSelectedIndustry(data.industry || 'SaaS');
        }
      }
    } catch (error) {
      console.error('Error fetching company context:', error);
    }
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toLocaleString()}`;
  };

  const calculateChange = (oldValue: number, newValue: number) => {
    if (!oldValue) return { value: '0.0', isPositive: false, isNeutral: true };
    const change = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
    return {
      value: change.toFixed(1),
      isPositive: change > 0,
      isNeutral: Math.abs(change) < 1
    };
  };

  const calculateMargin = (value: number, revenue: number) => {
    if (!revenue) return 0;
    return (value / revenue) * 100;
  };

  const compareToIndustry = (companyValue: number, industryValue: number) => {
    const diff = companyValue - industryValue;
    const percentDiff = (diff / industryValue) * 100;
    
    return {
      diff: diff.toFixed(1),
      percentDiff: percentDiff.toFixed(1),
      status: Math.abs(percentDiff) < 5 ? 'onTarget' : percentDiff > 5 ? 'above' : 'below',
      label: Math.abs(percentDiff) < 5 ? 'At Industry Average' : percentDiff > 5 ? 'Above Industry' : 'Below Industry'
    };
  };

  if (isLoading) {
    return (
      <div className="ml-64 min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  if (periodData.length === 0) {
    return (
      <div className="ml-64 min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Data Available</h2>
          <p className="text-slate-400 mb-6">Upload financial statements to start comparing periods and benchmarking against industry standards.</p>
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const leftData = periodData.find((p) => p.period === leftPeriod);
  const rightData = periodData.find((p) => p.period === rightPeriod);
  const industryData = industryBenchmarks[selectedIndustry];

  if (!leftData || !rightData) return null;

  const leftGrossMargin = calculateMargin(leftData.gross_profit || 0, leftData.revenue);
  const rightGrossMargin = calculateMargin(rightData.gross_profit || 0, rightData.revenue);
  const leftNetMargin = calculateMargin(leftData.net_income || 0, leftData.revenue);
  const rightNetMargin = calculateMargin(rightData.net_income || 0, rightData.revenue);

  const MetricComparisonCard = ({ label, leftValue, rightValue, format = 'currency', icon: Icon }: any) => {
    const change = calculateChange(leftValue, rightValue);
    const displayLeft = format === 'currency' ? formatCurrency(leftValue) : `${leftValue.toFixed(1)}%`;
    const displayRight = format === 'currency' ? formatCurrency(rightValue) : `${rightValue.toFixed(1)}%`;

    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-indigo-500/50 transition-all">
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon className="w-5 h-5 text-indigo-400" />}
          <h3 className="text-sm font-semibold text-slate-300">{label}</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center">
          <div>
            <div className="text-xs text-slate-500 mb-1">{leftPeriod}</div>
            <div className="text-xl font-bold text-white">{displayLeft}</div>
          </div>

          <div className="flex items-center justify-center">
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
              change.isNeutral 
                ? 'bg-slate-700 text-slate-300' 
                : change.isPositive 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
            }`}>
              {!change.isNeutral && (
                change.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-bold">{change.isPositive ? '+' : ''}{change.value}%</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">{rightPeriod}</div>
            <div className="text-xl font-bold text-white">{displayRight}</div>
          </div>
        </div>
      </div>
    );
  };

  const IndustryComparisonCard = ({ label, companyValue, industryValue, icon: Icon }: any) => {
    const comparison = compareToIndustry(companyValue, industryValue);
    
    const statusColors = {
      above: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      onTarget: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      below: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    };

    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon className="w-5 h-5 text-indigo-400" />}
          <h3 className="text-sm font-semibold text-slate-300">{label}</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Your Company</span>
            <span className="text-2xl font-bold text-white">{companyValue.toFixed(1)}%</span>
          </div>

          <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${Math.min((companyValue / (industryValue * 2)) * 100, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Industry Avg</span>
            <span className="text-lg font-semibold text-slate-400">{industryValue}%</span>
          </div>

          <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${statusColors[comparison.status]}`}>
            <span className="text-xs font-semibold">{comparison.label}</span>
            <span className="text-sm font-bold">{comparison.diff > 0 ? '+' : ''}{comparison.diff}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ml-64 min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Financial Comparison</h1>
                <p className="text-sm text-slate-400">Compare periods and benchmark against industry standards</p>
              </div>
            </div>

            {/* Comparison Mode Toggle */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setComparisonMode('periods')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  comparisonMode === 'periods'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Period vs Period
              </button>
              <button
                onClick={() => setComparisonMode('industry')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  comparisonMode === 'industry'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Industry Benchmark
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {comparisonMode === 'periods' ? (
          <>
            {/* Period Selectors */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-400 mb-2">Period 1</label>
                <select
                  value={leftPeriod}
                  onChange={(e) => setLeftPeriod(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {periodData.map((p) => (
                    <option key={p.period} value={p.period}>{p.period}</option>
                  ))}
                </select>
              </div>

              <div className="mt-8">
                <ArrowRight className="w-6 h-6 text-slate-600" />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-400 mb-2">Period 2</label>
                <select
                  value={rightPeriod}
                  onChange={(e) => setRightPeriod(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {periodData.map((p) => (
                    <option key={p.period} value={p.period}>{p.period}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metrics Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricComparisonCard
                label="Total Revenue"
                leftValue={leftData.revenue}
                rightValue={rightData.revenue}
                format="currency"
                icon={DollarSign}
              />
              <MetricComparisonCard
                label="Gross Profit"
                leftValue={leftData.gross_profit || 0}
                rightValue={rightData.gross_profit || 0}
                format="currency"
                icon={TrendingUp}
              />
              <MetricComparisonCard
                label="Gross Margin"
                leftValue={leftGrossMargin}
                rightValue={rightGrossMargin}
                format="percentage"
                icon={Target}
              />
              <MetricComparisonCard
                label="Net Income"
                leftValue={leftData.net_income || 0}
                rightValue={rightData.net_income || 0}
                format="currency"
                icon={Activity}
              />
            </div>
          </>
        ) : (
          <>
            {/* Industry Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-400 mb-2">Select Industry</label>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full max-w-md px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {Object.keys(industryBenchmarks).map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            {/* Industry Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <IndustryComparisonCard
                label="Gross Margin"
                companyValue={rightGrossMargin}
                industryValue={industryData.grossMargin}
                icon={Target}
              />
              <IndustryComparisonCard
                label="Operating Margin"
                companyValue={rightData.operating_margin || 0}
                industryValue={industryData.operatingMargin}
                icon={BarChart3}
              />
              <IndustryComparisonCard
                label="Net Margin"
                companyValue={rightNetMargin}
                industryValue={industryData.netMargin}
                icon={Award}
              />
            </div>

            {/* Context Info */}
            <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-300 mb-2">Industry Benchmarks</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Comparing your most recent period ({rightPeriod}) against {selectedIndustry} industry averages. 
                    {companyContext && ` Your company profile: ${companyContext.companySize} employees, ${companyContext.stage} stage.`}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}