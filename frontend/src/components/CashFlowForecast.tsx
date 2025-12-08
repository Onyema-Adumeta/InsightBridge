// 🚀 Cash Flow Intelligence Platform
// FIXED VERSION - Ready to use!

'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Zap, 
  Calendar, Target, CreditCard, Users, BarChart3, Brain,
  Bell, Download, RefreshCw, ChevronRight, Shield,
  Sparkles, FileText, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface CashFlowForecastProps {
  userId: string;
}

export default function CashFlowForecast({ userId }: CashFlowForecastProps) {
  const { user } = useUser();
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'auto' | 'manual'>('manual');
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'scenarios'>('overview');
  const [inputs, setInputs] = useState({
    current_balance: 50000,
    monthly_revenue: 100000,
    monthly_expenses: 80000
  });

  // Fetch financial data from API
  const fetchFinancialData = async () => {
    setLoadingFinancials(true);
    try {
      const effectiveUserId = user?.id || userId || 'anonymous';
      const apiUrl = `/api/v1/main/analysis_summary?user_id=${effectiveUserId}`;
      
      console.log('[CashFlow] Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error('[CashFlow] API error:', response.status);
        setDataSource('manual');
        setLoadingFinancials(false);
        return;
      }

      const data = await response.json();
      console.log('[CashFlow] ✅ API Response received:', data);

      if (!data || data.error || !data.kpis) {
        console.warn('[CashFlow] No financial data available');
        setDataSource('manual');
        setLoadingFinancials(false);
        return;
      }

      // Extract values
      const currentBalance = data.kpis?.balanceSheet?.cash || 0;
      const monthlyRevenue = (data.kpis?.profitLoss?.totalRevenue || 0) / 12;
      const cogs = data.kpis?.profitLoss?.costOfGoodsSold || 0;
      const opex = data.kpis?.profitLoss?.operatingExpenses || 0;
      const monthlyExpenses = (cogs + opex) / 12;

      console.log('[CashFlow] 📊 Extracted values:', {
        currentBalance,
        monthlyRevenue,
        monthlyExpenses,
        cogs,
        opex
      });

      if (currentBalance > 0 || monthlyRevenue > 0) {
        setInputs({
          current_balance: Math.round(currentBalance),
          monthly_revenue: Math.round(monthlyRevenue),
          monthly_expenses: Math.round(monthlyExpenses)
        });
        setDataSource('auto');
        console.log('[CashFlow] ✅ Using uploaded financial data');
      } else {
        console.warn('[CashFlow] ⚠️ No valid data, using defaults');
        setDataSource('manual');
      }

    } catch (error) {
      console.error('[CashFlow] Fetch error:', error);
      setDataSource('manual');
    } finally {
      setLoadingFinancials(false);
    }
  };

  // Run forecast
  const runForecast = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[CashFlow] 🔮 Running forecast with:', inputs);
      
      const response = await fetch('/api/v1/cash-flow/quick-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });

      if (!response.ok) {
        throw new Error(`Forecast API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Forecast failed');
      }

      setForecast(data);
      console.log('[CashFlow] ✅ Forecast complete');
    } catch (error: any) {
      console.error('[CashFlow] Forecast error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id || userId) {
      fetchFinancialData();
    }
  }, [user?.id, userId]);

  useEffect(() => {
    if (!loadingFinancials && inputs.current_balance >= 0) {
      runForecast();
    }
  }, [inputs, loadingFinancials]);

  // Helper functions
  const formatNumber = (num: any) => {
    const value = Number(num);
    return isNaN(value) ? '0' : value.toLocaleString();
  };

  const formatCurrency = (num: any, compact = false) => {
    const value = Number(num);
    if (isNaN(value)) return '$0';
    if (compact && Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (compact && Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const handleInputChange = (field: keyof typeof inputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs(prev => ({ ...prev, [field]: numValue }));
    setDataSource('manual');
  };

  // Calculate metrics
  const monthlyBurn = inputs.monthly_expenses - inputs.monthly_revenue;
  const runwayMonths = monthlyBurn > 0 ? inputs.current_balance / monthlyBurn : 999;
  const runwayDays = Math.min(Math.round(runwayMonths * 30), 9999);
  const healthScore = runwayMonths > 12 ? 90 : runwayMonths > 6 ? 75 : runwayMonths > 3 ? 50 : 25;
  const isProfitable = monthlyBurn < 0;

  // AI Insights (these will be dynamic later)
  const insights = [
    {
      type: 'opportunity',
      icon: Sparkles,
      title: 'Revenue Acceleration Detected',
      message: `Monthly revenue of ${formatCurrency(inputs.monthly_revenue)} represents strong cash generation`,
      impact: `+${formatCurrency(inputs.monthly_revenue * 0.15)} growth potential`,
      action: 'Analyze growth drivers',
      color: 'emerald'
    },
    {
      type: 'optimization',
      icon: CreditCard,
      title: 'Payment Terms Opportunity',
      message: 'Optimize vendor payment timing to extend working capital',
      impact: `+${formatCurrency(inputs.monthly_expenses * 0.15)} working capital`,
      action: 'Review payment schedules',
      color: 'blue'
    },
    {
      type: 'risk',
      icon: AlertTriangle,
      title: monthlyBurn > 0 ? 'Cash Burn Monitoring' : 'Strong Cash Position',
      message: monthlyBurn > 0 
        ? `Monthly burn of ${formatCurrency(Math.abs(monthlyBurn))} requires monitoring`
        : 'Company is cash flow positive - excellent position',
      impact: monthlyBurn > 0 ? `${runwayMonths.toFixed(1)} months runway` : 'Unlimited runway',
      action: monthlyBurn > 0 ? 'Implement burn reduction plan' : 'Maintain profitability',
      color: monthlyBurn > 0 ? 'red' : 'emerald'
    }
  ];

  if (loadingFinancials) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <p className="mt-4 text-slate-600 font-medium">Loading financial intelligence...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Cash Flow Intelligence</h1>
                <p className="text-sm text-slate-600">AI-powered financial command center</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                dataSource === 'auto' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${dataSource === 'auto' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {dataSource === 'auto' ? 'Live Data' : 'Manual'}
              </div>
              
              <button
                onClick={fetchFinancialData}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-slate-600" />
              </button>
              
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            {(['overview', 'insights', 'scenarios'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  activeTab === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Critical Alert */}
        {runwayMonths < 3 && monthlyBurn > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  🚨 Critical Runway Alert: {runwayDays} Days Remaining
                </h3>
                <p className="text-slate-700 mb-4">
                  At current burn rate of {formatCurrency(monthlyBurn)}/month, cash depletes by {new Date(Date.now() + runwayDays * 86400000).toLocaleDateString()}
                </p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 text-sm">
                    View Action Plan
                  </button>
                  <button className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg font-semibold hover:bg-red-50 text-sm">
                    Get CFO Advice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Health Score */}
              <div className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl">
                    <Shield className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    healthScore >= 75 ? 'bg-emerald-100 text-emerald-700' :
                    healthScore >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {healthScore >= 75 ? 'STRONG' : healthScore >= 50 ? 'MODERATE' : 'AT RISK'}
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">{healthScore}/100</div>
                <div className="text-sm text-slate-600 font-medium">Health Score</div>
                <div className="mt-4 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      healthScore >= 75 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                      healthScore >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                      'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>

              {/* Runway */}
              <div className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  {isProfitable ? (
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {runwayMonths > 99 ? '∞' : runwayMonths.toFixed(1)}
                </div>
                <div className="text-sm text-slate-600 font-medium">Months Runway</div>
                <div className="mt-3 text-sm text-slate-500">
                  {isProfitable ? '🎉 Profitable!' : `${runwayDays} days remaining`}
                </div>
              </div>

              {/* Cash Balance */}
              <div className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {formatCurrency(inputs.current_balance, true)}
                </div>
                <div className="text-sm text-slate-600 font-medium">Current Balance</div>
                {dataSource === 'auto' && (
                  <div className="mt-3 text-sm text-emerald-600 font-medium">From Balance Sheet</div>
                )}
              </div>

              {/* Burn Rate */}
              <div className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {formatCurrency(Math.abs(monthlyBurn), true)}
                </div>
                <div className="text-sm text-slate-600 font-medium">Monthly {monthlyBurn < 0 ? 'Profit' : 'Burn'}</div>
                <div className="mt-3 text-sm text-slate-500">
                  {isProfitable ? '✅ Cash positive' : '⚠️ Cash negative'}
                </div>
              </div>
            </div>

            {/* Cash Waterfall */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Monthly Cash Breakdown</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-slate-700">Monthly Revenue</span>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">
                      +{formatCurrency(inputs.monthly_revenue)}
                    </span>
                  </div>
                  <div className="relative h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-semibold text-slate-700">Monthly Expenses</span>
                    </div>
                    <span className="text-xl font-bold text-red-600">
                      -{formatCurrency(inputs.monthly_expenses)}
                    </span>
                  </div>
                  <div 
                    className="relative h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg"
                    style={{ width: `${(inputs.monthly_expenses / inputs.monthly_revenue) * 100}%` }}
                  />
                </div>

                <div className="border-t-2 border-slate-200 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Net Monthly Cash Flow</span>
                    <span className={`text-2xl font-bold ${
                      monthlyBurn < 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {monthlyBurn < 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyBurn))}
                    </span>
                  </div>
                  <div 
                    className={`relative h-14 rounded-xl shadow-lg ${
                      monthlyBurn < 0 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                        : 'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                    style={{ width: `${Math.min(Math.abs(monthlyBurn / inputs.monthly_revenue) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Feature Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-6 border border-indigo-200">
                <div className="p-3 bg-white rounded-xl w-fit mb-4 shadow-sm">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Payment Optimizer</h3>
                <p className="text-sm text-slate-700 mb-4">
                  AI suggests optimal payment dates to maximize cash float
                </p>
                <div className="text-sm font-bold text-indigo-700 mb-3">
                  Impact: +15% runway extension
                </div>
                <button className="w-full py-2.5 bg-white border border-indigo-300 rounded-lg font-semibold text-indigo-700 hover:bg-indigo-50 text-sm">
                  Coming in Pro - $49/mo
                </button>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-6 border border-emerald-200">
                <div className="p-3 bg-white rounded-xl w-fit mb-4 shadow-sm">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Collections Engine</h3>
                <p className="text-sm text-slate-700 mb-4">
                  Reduce DSO by 15+ days with automated tracking
                </p>
                <div className="text-sm font-bold text-emerald-700 mb-3">
                  Impact: +{formatCurrency(inputs.monthly_revenue * 0.5)} unlocked
                </div>
                <button className="w-full py-2.5 bg-white border border-emerald-300 rounded-lg font-semibold text-emerald-700 hover:bg-emerald-50 text-sm">
                  Coming in Pro - $49/mo
                </button>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200">
                <div className="p-3 bg-white rounded-xl w-fit mb-4 shadow-sm">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Board Reporting</h3>
                <p className="text-sm text-slate-700 mb-4">
                  One-click professional reports. Save 20+ hours/month
                </p>
                <div className="text-sm font-bold text-purple-700 mb-3">
                  Impact: $4K+ CFO time saved
                </div>
                <button className="w-full py-2.5 bg-white border border-purple-300 rounded-lg font-semibold text-purple-700 hover:bg-purple-50 text-sm">
                  Coming in Business - $99/mo
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'insights' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                <Brain className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">AI-Powered Insights</h2>
                <p className="text-sm text-slate-600">Actionable recommendations to improve cash position</p>
              </div>
            </div>

            <div className="space-y-4">
              {insights.map((insight, idx) => (
                <div key={idx} className={`p-6 rounded-xl border-2 hover:shadow-lg transition-all cursor-pointer ${
                  insight.color === 'emerald' ? 'bg-emerald-50 border-emerald-200' :
                  insight.color === 'blue' ? 'bg-blue-50 border-blue-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      insight.color === 'emerald' ? 'bg-emerald-100' :
                      insight.color === 'blue' ? 'bg-blue-100' :
                      'bg-red-100'
                    }`}>
                      <insight.icon className={`w-6 h-6 ${
                        insight.color === 'emerald' ? 'text-emerald-700' :
                        insight.color === 'blue' ? 'text-blue-700' :
                        'text-red-700'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-lg mb-2">{insight.title}</h3>
                      <p className="text-slate-700 mb-3">{insight.message}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-slate-600">Impact: </span>
                          <span className={`font-bold ${
                            insight.color === 'emerald' ? 'text-emerald-700' : 'text-indigo-700'
                          }`}>{insight.impact}</span>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg font-medium hover:bg-slate-50 text-sm">
                          {insight.action}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Scenario Planning</h2>
            <p className="text-slate-600 mb-8">Compare different growth scenarios (Coming in Pro Plan)</p>
            
            <div className="grid grid-cols-3 gap-6">
              {['Conservative (-20%)', 'Base Case', 'Growth (+30%)'].map((name, idx) => (
                <div key={idx} className="p-6 rounded-xl border-2 bg-slate-50 border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-4">{name}</h3>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div>Coming soon...</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
              <h4 className="font-bold text-slate-900 mb-2">✨ Unlock Advanced Scenarios</h4>
              <p className="text-sm text-slate-700 mb-4">
                Model hiring plans, fundraising rounds, and market changes with interactive sliders
              </p>
              <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 text-sm">
                Upgrade to Professional - $49/mo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}