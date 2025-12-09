// 🚀 Cash Flow Intelligence Platform
// FIXED VERSION - Ready to use!

'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Zap, 
  Calendar, Target, CreditCard, Users, BarChart3, Brain,
  Bell, Download, RefreshCw, ChevronRight, Shield,
  Sparkles, FileText, ArrowUpRight, ArrowDownRight, Edit3, Check
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
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'scenarios' | 'builder'>('overview');
  const [inputs, setInputs] = useState({
    current_balance: 50000,
    monthly_revenue: 100000,
    monthly_expenses: 80000
  });

  // Scenario state - Interactive controls
  const [scenarioSettings, setScenarioSettings] = useState({
    conservative: { revenueMultiplier: 0.8, expenseMultiplier: 0.95 },
    growth: { revenueMultiplier: 1.3, expenseMultiplier: 1.15 }
  });

  // Builder state
  const [builderPeriods, setBuilderPeriods] = useState<Array<{
    id: string;
    month: string;
    revenue: number;
    expenses: number;
    type: 'manual' | 'forecast';
    isEditing: boolean;
  }>>([]);
  const [forecastHorizon, setForecastHorizon] = useState(12);
  const [baselineType, setBaselineType] = useState<'uploaded' | 'zero'>('uploaded');

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

  // Initialize Builder periods when tab changes or baseline changes
  useEffect(() => {
    if (activeTab === 'builder') {
      initializeBuilderPeriods();
    }
  }, [activeTab, forecastHorizon, baselineType, inputs]);

  const initializeBuilderPeriods = () => {
    const periods = [];
    const baseRevenue = baselineType === 'uploaded' ? inputs.monthly_revenue : 0;
    const baseExpenses = baselineType === 'uploaded' ? inputs.monthly_expenses : 0;
    
    for (let i = 0; i < forecastHorizon; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // First 3 months are manual, rest are forecast
      const type = i < 3 ? 'manual' : 'forecast';
      const growthFactor = i === 0 ? 1 : 1 + (0.03 * i); // 3% monthly growth
      
      periods.push({
        id: `period-${i}`,
        month: monthName,
        revenue: Math.round(baseRevenue * growthFactor),
        expenses: Math.round(baseExpenses * (1 + 0.02 * i)), // 2% expense growth
        type,
        isEditing: false
      });
    }
    
    setBuilderPeriods(periods);
  };

  const updateBuilderPeriod = (periodId: string, field: 'revenue' | 'expenses', value: number) => {
    setBuilderPeriods(prev => {
      const newPeriods = [...prev];
      const index = newPeriods.findIndex(p => p.id === periodId);
      
      if (index === -1) return prev;
      
      // Update the field
      newPeriods[index] = {
        ...newPeriods[index],
        [field]: value,
        type: 'manual'
      };
      
      // Recalculate forecast for remaining periods
      const manualPeriods = newPeriods.filter((p, i) => i <= index && p.type === 'manual');
      if (manualPeriods.length >= 2) {
        // Calculate growth rate from manual entries
        const revenueGrowth = (manualPeriods[manualPeriods.length - 1].revenue - manualPeriods[0].revenue) / 
                             manualPeriods[0].revenue / (manualPeriods.length - 1);
        const expenseGrowth = (manualPeriods[manualPeriods.length - 1].expenses - manualPeriods[0].expenses) / 
                             manualPeriods[0].expenses / (manualPeriods.length - 1);
        
        // Apply to forecast periods
        for (let i = index + 1; i < newPeriods.length; i++) {
          if (newPeriods[i].type === 'forecast') {
            const periodsFromLast = i - index;
            newPeriods[i].revenue = Math.round(newPeriods[index].revenue * (1 + revenueGrowth * periodsFromLast));
            newPeriods[i].expenses = Math.round(newPeriods[index].expenses * (1 + expenseGrowth * periodsFromLast));
          }
        }
      }
      
      return newPeriods;
    });
  };

  const toggleEditPeriod = (periodId: string) => {
    setBuilderPeriods(prev => prev.map(p => 
      p.id === periodId ? { ...p, isEditing: !p.isEditing } : { ...p, isEditing: false }
    ));
  };

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
            {(['overview', 'insights', 'scenarios', 'builder'] as const).map((tab) => (
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
          <div className="space-y-6">
            {/* Scenario Header */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                      <BarChart3 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900">Scenario Planning</h2>
                      <p className="text-slate-600 mt-1">Compare different growth scenarios side-by-side</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white/90 backdrop-blur rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-slate-900">Conservative</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Revenue {((scenarioSettings.conservative.revenueMultiplier - 1) * 100).toFixed(0)}%, 
                    Expenses {((scenarioSettings.conservative.expenseMultiplier - 1) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-4 bg-white/90 backdrop-blur rounded-xl border-2 border-blue-500 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-slate-900">Base Case</span>
                    <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">Current</span>
                  </div>
                  <p className="text-sm text-slate-600">Current trajectory</p>
                </div>
                <div className="p-4 bg-white/90 backdrop-blur rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-900">Growth</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Revenue +{((scenarioSettings.growth.revenueMultiplier - 1) * 100).toFixed(0)}%, 
                    Expenses +{((scenarioSettings.growth.expenseMultiplier - 1) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Scenario Comparison Cards */}
            <div className="grid grid-cols-3 gap-6">
              {/* Conservative Scenario */}
              <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 border-b border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                    <h3 className="font-bold text-slate-900 text-lg">Conservative</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Recession scenario</p>
                  
                  {/* Interactive Controls */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">Revenue Change</label>
                        <span className="text-xs font-bold text-red-600">
                          {((scenarioSettings.conservative.revenueMultiplier - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1"
                        step="0.05"
                        value={scenarioSettings.conservative.revenueMultiplier}
                        onChange={(e) => setScenarioSettings(prev => ({
                          ...prev,
                          conservative: { ...prev.conservative, revenueMultiplier: Number(e.target.value) }
                        }))}
                        className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">Expense Change</label>
                        <span className="text-xs font-bold text-slate-600">
                          {((scenarioSettings.conservative.expenseMultiplier - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1"
                        step="0.05"
                        value={scenarioSettings.conservative.expenseMultiplier}
                        onChange={(e) => setScenarioSettings(prev => ({
                          ...prev,
                          conservative: { ...prev.conservative, expenseMultiplier: Number(e.target.value) }
                        }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Monthly Revenue</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(Math.round(inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier))}
                    </div>
                    <div className="text-xs text-slate-500">
                      {((scenarioSettings.conservative.revenueMultiplier - 1) * 100).toFixed(0)}% from current
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Monthly Expenses</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(Math.round(inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier))}
                    </div>
                    <div className="text-xs text-slate-500">
                      {((scenarioSettings.conservative.expenseMultiplier - 1) * 100).toFixed(0)}% from current
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600 mb-1">Monthly {
                      (inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier - 
                       inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier) < 0 ? 'Burn' : 'Profit'
                    }</div>
                    <div className={`text-2xl font-bold ${
                      (inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier - 
                       inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier) < 0 
                        ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {formatCurrency(Math.abs(Math.round(
                        inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier - 
                        inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier
                      )))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Runway</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {(() => {
                        const burn = inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier - 
                                    inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier;
                        if (burn >= 0) return '∞';
                        return (inputs.current_balance / Math.abs(burn)).toFixed(1);
                      })()} mo
                    </div>
                    <div className="text-xs text-red-600 font-semibold">
                      {(() => {
                        const burn = inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier - 
                                    inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier;
                        const baseBurn = inputs.monthly_revenue - inputs.monthly_expenses;
                        if (burn >= 0) return 'Cash positive!';
                        const conservativeRunway = inputs.current_balance / Math.abs(burn);
                        const baseRunway = inputs.current_balance / Math.abs(baseBurn);
                        const diff = baseRunway - conservativeRunway;
                        return diff > 0 ? `-${diff.toFixed(1)} months` : `+${Math.abs(diff).toFixed(1)} months`;
                      })()}
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="text-sm font-semibold text-slate-700 mb-2">Key Actions:</div>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Cut non-essential spend</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Freeze hiring</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Accelerate collections</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Base Case Scenario */}
              <div className="bg-white rounded-2xl border-2 border-blue-400 shadow-lg overflow-hidden ring-2 ring-blue-200">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border-b border-blue-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-lg">Base Case</h3>
                    <span className="ml-auto px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">Current</span>
                  </div>
                  <p className="text-sm text-slate-600">Current trajectory</p>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Monthly Revenue</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(inputs.monthly_revenue)}
                    </div>
                    <div className="text-xs text-slate-500">Current baseline</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Monthly Expenses</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(inputs.monthly_expenses)}
                    </div>
                    <div className="text-xs text-slate-500">Current baseline</div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600 mb-1">Monthly {monthlyBurn < 0 ? 'Profit' : 'Burn'}</div>
                    <div className={`text-2xl font-bold ${monthlyBurn < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(monthlyBurn))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Runway</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {runwayMonths > 99 ? '∞' : runwayMonths.toFixed(1)} mo
                    </div>
                    <div className="text-xs text-blue-600 font-semibold">Baseline scenario</div>
                  </div>

                  <div className="pt-4">
                    <div className="text-sm font-semibold text-slate-700 mb-2">Key Actions:</div>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Maintain current pace</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Monitor KPIs closely</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Optimize operations</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Scenario */}
              <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 border-b border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 text-lg">Growth</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Aggressive expansion</p>
                  
                  {/* Interactive Controls */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">Revenue Change</label>
                        <span className="text-xs font-bold text-emerald-600">
                          +{((scenarioSettings.growth.revenueMultiplier - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="2"
                        step="0.05"
                        value={scenarioSettings.growth.revenueMultiplier}
                        onChange={(e) => setScenarioSettings(prev => ({
                          ...prev,
                          growth: { ...prev.growth, revenueMultiplier: Number(e.target.value) }
                        }))}
                        className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">Expense Change</label>
                        <span className="text-xs font-bold text-slate-600">
                          +{((scenarioSettings.growth.expenseMultiplier - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="1.5"
                        step="0.05"
                        value={scenarioSettings.growth.expenseMultiplier}
                        onChange={(e) => setScenarioSettings(prev => ({
                          ...prev,
                          growth: { ...prev.growth, expenseMultiplier: Number(e.target.value) }
                        }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Monthly Revenue</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(Math.round(inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier))}
                    </div>
                    <div className="text-xs text-slate-500">
                      +{((scenarioSettings.growth.revenueMultiplier - 1) * 100).toFixed(0)}% from current
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Monthly Expenses</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(Math.round(inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier))}
                    </div>
                    <div className="text-xs text-slate-500">
                      +{((scenarioSettings.growth.expenseMultiplier - 1) * 100).toFixed(0)}% from current
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600 mb-1">Monthly {
                      (inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier - 
                       inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier) > 0 ? 'Profit' : 'Burn'
                    }</div>
                    <div className={`text-2xl font-bold ${
                      (inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier - 
                       inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier) > 0 
                        ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(Math.round(
                        inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier - 
                        inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier
                      )))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Runway</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {(() => {
                        const profit = inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier - 
                                      inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier;
                        if (profit > 0) return '∞';
                        return (inputs.current_balance / Math.abs(profit)).toFixed(1);
                      })()} mo
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold">
                      {(() => {
                        const profit = inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier - 
                                      inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier;
                        if (profit > 0) return 'Cash positive!';
                        const baseBurn = inputs.monthly_revenue - inputs.monthly_expenses;
                        const growthRunway = inputs.current_balance / Math.abs(profit);
                        const baseRunway = inputs.current_balance / Math.abs(baseBurn);
                        const diff = growthRunway - baseRunway;
                        return diff > 0 ? `+${diff.toFixed(1)} months` : `-${Math.abs(diff).toFixed(1)} months`;
                      })()}
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="text-sm font-semibold text-slate-700 mb-2">Key Actions:</div>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Hire 2-3 sales reps</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Increase marketing 50%</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Expand to new markets</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Summary */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Scenario Comparison Summary</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Metric</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-red-700">Conservative</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-blue-700">Base Case</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-emerald-700">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">Monthly Revenue</td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-red-600">
                        {formatCurrency(Math.round(inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier))}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600">
                        {formatCurrency(inputs.monthly_revenue)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-emerald-600">
                        {formatCurrency(Math.round(inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier))}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">Monthly Expenses</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-700">
                        {formatCurrency(Math.round(inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier))}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-700">
                        {formatCurrency(inputs.monthly_expenses)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-700">
                        {formatCurrency(Math.round(inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier))}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">Cash Flow</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-red-600">
                        {formatCurrency(Math.round(
                          inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier - 
                          inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier
                        ))}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">
                        {formatCurrency(Math.round(inputs.monthly_revenue - inputs.monthly_expenses))}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">
                        {formatCurrency(Math.round(
                          inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier - 
                          inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier
                        ))}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">Runway (months)</td>
                      <td className="px-4 py-3 text-center text-lg font-bold text-red-700">
                        {(() => {
                          const burn = inputs.monthly_revenue * scenarioSettings.conservative.revenueMultiplier - 
                                      inputs.monthly_expenses * scenarioSettings.conservative.expenseMultiplier;
                          if (burn >= 0) return '∞';
                          return (inputs.current_balance / Math.abs(burn)).toFixed(1);
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center text-lg font-bold text-blue-700">
                        {runwayMonths > 99 ? '∞' : runwayMonths.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center text-lg font-bold text-emerald-700">
                        {(() => {
                          const profit = inputs.monthly_revenue * scenarioSettings.growth.revenueMultiplier - 
                                        inputs.monthly_expenses * scenarioSettings.growth.expenseMultiplier;
                          if (profit > 0) return '∞';
                          return (inputs.current_balance / Math.abs(profit)).toFixed(1);
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Advanced Scenarios Upsell */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-lg mb-2">✨ Unlock Advanced Scenario Modeling</h4>
                  <p className="text-sm text-slate-700 mb-4">
                    Create custom scenarios with interactive sliders, model hiring plans, fundraising rounds, and market changes
                  </p>
                  <div className="flex items-center gap-3">
                    <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg">
                      Upgrade to Professional - $49/mo
                    </button>
                    <span className="text-sm text-slate-600">or</span>
                    <button className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg font-semibold hover:bg-purple-50 text-sm">
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'builder' && (
          <div className="space-y-6">
            {/* Builder Header */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-indigo-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900">Cash Flow Builder</h2>
                      <p className="text-slate-600 mt-1">Build your forecast manually, AI extends it intelligently</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const csv = [
                        ['Month', 'Revenue', 'Expenses', 'Cash Flow', 'Balance', 'Type'].join(','),
                        ...builderPeriods.map(p => {
                          const cashFlow = p.revenue - p.expenses;
                          const balance = builderPeriods.slice(0, builderPeriods.indexOf(p) + 1)
                            .reduce((sum, period) => sum + (period.revenue - period.expenses), 
                                   baselineType === 'uploaded' ? inputs.current_balance : 0);
                          return [p.month, p.revenue, p.expenses, cashFlow, balance, p.type].join(',');
                        })
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `cash-flow-forecast-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Baseline Selection */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => setBaselineType('uploaded')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    baselineType === 'uploaded'
                      ? 'border-emerald-500 bg-white shadow-lg'
                      : 'border-slate-200 bg-white/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-900">Use Your Data</span>
                    {baselineType === 'uploaded' && (
                      <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">Active</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">Start with uploaded financials</p>
                  {dataSource === 'auto' && (
                    <p className="text-xs text-emerald-700 mt-1 font-medium">
                      {formatCurrency(inputs.current_balance, true)} cash, {formatCurrency(inputs.monthly_revenue, true)}/mo revenue
                    </p>
                  )}
                </button>

                <button
                  onClick={() => setBaselineType('zero')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    baselineType === 'zero'
                      ? 'border-indigo-500 bg-white shadow-lg'
                      : 'border-slate-200 bg-white/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-slate-900">Start Fresh</span>
                    {baselineType === 'zero' && (
                      <span className="ml-auto px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">Active</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">Build from scratch, no assumptions</p>
                </button>
              </div>

              {/* Forecast Controls */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-slate-700">Forecast Horizon:</label>
                <select
                  value={forecastHorizon}
                  onChange={(e) => setForecastHorizon(Number(e.target.value))}
                  className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                  <option value={18}>18 months</option>
                  <option value={24}>24 months</option>
                </select>

                <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    AI detecting patterns from your inputs
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              {(() => {
                const totalRevenue = builderPeriods.reduce((sum, p) => sum + p.revenue, 0);
                const totalExpenses = builderPeriods.reduce((sum, p) => sum + p.expenses, 0);
                const netCashFlow = totalRevenue - totalExpenses;
                const startBalance = baselineType === 'uploaded' ? inputs.current_balance : 0;
                const endingBalance = startBalance + netCashFlow;
                
                return (
                  <>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
                      <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue, true)}</div>
                      <div className="text-xs text-slate-500 mt-1">{forecastHorizon} months</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="text-sm text-slate-600 mb-1">Total Expenses</div>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses, true)}</div>
                      <div className="text-xs text-slate-500 mt-1">{forecastHorizon} months</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="text-sm text-slate-600 mb-1">Net Cash Flow</div>
                      <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow, true)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Cumulative</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="text-sm text-slate-600 mb-1">Ending Balance</div>
                      <div className="text-2xl font-bold text-indigo-600">{formatCurrency(endingBalance, true)}</div>
                      <div className="text-xs text-slate-500 mt-1">Month {forecastHorizon}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Interactive Forecast Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Interactive Forecast</h3>
                <p className="text-sm text-slate-600 mt-1">Click edit icon to modify any period. AI will recalculate forecast automatically.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">Month</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">Revenue</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">Expenses</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">Cash Flow</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">Balance</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Type</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {builderPeriods.map((period, index) => {
                      const cashFlow = period.revenue - period.expenses;
                      const balance = builderPeriods.slice(0, index + 1)
                        .reduce((sum, p) => sum + (p.revenue - p.expenses), 
                               baselineType === 'uploaded' ? inputs.current_balance : 0);
                      
                      return (
                        <tr
                          key={period.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            period.type === 'forecast' ? 'bg-blue-50/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{period.month}</td>
                          <td className="px-4 py-3 text-right">
                            {period.isEditing ? (
                              <input
                                type="number"
                                value={period.revenue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateBuilderPeriod(period.id, 'revenue', val === '' ? 0 : Number(val));
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '') {
                                    updateBuilderPeriod(period.id, 'revenue', 0);
                                  }
                                }}
                                className="w-32 px-3 py-2 text-sm font-semibold text-right text-emerald-600 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                                autoFocus
                                placeholder="0"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-emerald-600">
                                {formatCurrency(period.revenue)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {period.isEditing ? (
                              <input
                                type="number"
                                value={period.expenses}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateBuilderPeriod(period.id, 'expenses', val === '' ? 0 : Number(val));
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '') {
                                    updateBuilderPeriod(period.id, 'expenses', 0);
                                  }
                                }}
                                className="w-32 px-3 py-2 text-sm font-semibold text-right text-red-600 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                                placeholder="0"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-red-600">
                                {formatCurrency(period.expenses)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-semibold ${
                              cashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {cashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlow)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-slate-900">
                              {formatCurrency(balance)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              period.type === 'manual' 
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {period.type === 'manual' ? (
                                <><Edit3 className="w-3 h-3" /> Manual</>
                              ) : (
                                <><Brain className="w-3 h-3" /> AI {90 - index * 2}%</>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleEditPeriod(period.id)}
                              className={`p-1.5 rounded transition-colors ${
                                period.isEditing 
                                  ? 'text-emerald-600 hover:bg-emerald-50' 
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                              title={period.isEditing ? 'Done editing' : 'Edit period'}
                            >
                              {period.isEditing ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Edit3 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Charts */}
            <div className="grid grid-cols-2 gap-6">
              {/* Forecast Trend Chart */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Forecast Trend
                </h3>
                <div className="space-y-1">
                  {builderPeriods.map((period, index) => {
                    const cashFlow = period.revenue - period.expenses;
                    const maxValue = Math.max(...builderPeriods.map(p => Math.max(p.revenue, p.expenses)));
                    const revenueWidth = (period.revenue / maxValue) * 100;
                    const expenseWidth = (period.expenses / maxValue) * 100;
                    
                    return (
                      <div key={period.id} className="group">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-600 w-16">{period.month}</span>
                          <div className="flex-1 flex gap-1">
                            {/* Revenue Bar */}
                            <div className="relative h-8 bg-emerald-100 rounded transition-all group-hover:bg-emerald-200" style={{ width: `${revenueWidth}%` }}>
                              <div className="absolute inset-0 flex items-center justify-end pr-2">
                                <span className="text-xs font-semibold text-emerald-700">{formatCurrency(period.revenue, true)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-transparent w-16">.</span>
                          <div className="flex-1 flex gap-1">
                            {/* Expense Bar */}
                            <div className="relative h-8 bg-red-100 rounded transition-all group-hover:bg-red-200" style={{ width: `${expenseWidth}%` }}>
                              <div className="absolute inset-0 flex items-center justify-end pr-2">
                                <span className="text-xs font-semibold text-red-700">{formatCurrency(period.expenses, true)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {index < builderPeriods.length - 1 && <div className="h-2"></div>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                    <span className="text-slate-600">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-slate-600">Expenses</span>
                  </div>
                </div>
              </div>

              {/* Sankey Flow Diagram */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Cash Flow Sankey
                </h3>
                {(() => {
                  const totalRevenue = builderPeriods.reduce((sum, p) => sum + p.revenue, 0);
                  const totalExpenses = builderPeriods.reduce((sum, p) => sum + p.expenses, 0);
                  const netFlow = totalRevenue - totalExpenses;
                  const startBalance = baselineType === 'uploaded' ? inputs.current_balance : 0;
                  const endBalance = startBalance + netFlow;
                  
                  return (
                    <div className="space-y-6">
                      {/* Starting Balance */}
                      <div>
                        <div className="text-sm font-semibold text-slate-700 mb-2">Starting Balance</div>
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-white">{formatCurrency(startBalance, true)}</div>
                        </div>
                      </div>

                      {/* Flow Arrows */}
                      <div className="relative">
                        <div className="absolute left-1/2 top-0 w-1 h-full bg-slate-200 -translate-x-1/2"></div>
                        
                        {/* Revenue In */}
                        <div className="relative mb-6">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-3 text-right">
                              <div className="text-xs font-semibold text-emerald-100 mb-1">Total Revenue In</div>
                              <div className="text-xl font-bold text-white">{formatCurrency(totalRevenue, true)}</div>
                            </div>
                            <div className="w-8 flex justify-center">
                              <ArrowDownRight className="w-6 h-6 text-emerald-600" />
                            </div>
                          </div>
                        </div>

                        {/* Expenses Out */}
                        <div className="relative">
                          <div className="flex items-center gap-3">
                            <div className="w-8 flex justify-center">
                              <ArrowUpRight className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1 bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-3">
                              <div className="text-xs font-semibold text-red-100 mb-1">Total Expenses Out</div>
                              <div className="text-xl font-bold text-white">{formatCurrency(totalExpenses, true)}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ending Balance */}
                      <div>
                        <div className="text-sm font-semibold text-slate-700 mb-2">Ending Balance</div>
                        <div className={`bg-gradient-to-r rounded-lg p-4 text-center ${
                          endBalance > startBalance 
                            ? 'from-emerald-500 to-emerald-600' 
                            : endBalance < startBalance 
                            ? 'from-red-500 to-red-600'
                            : 'from-slate-500 to-slate-600'
                        }`}>
                          <div className="text-2xl font-bold text-white">{formatCurrency(endBalance, true)}</div>
                          <div className="text-xs font-semibold text-white/80 mt-1">
                            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, true)} net flow
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                How AI Forecasting Works
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                  <div>
                    <div className="font-semibold text-slate-900">You Edit Periods</div>
                    <div className="text-slate-600">Click edit on any month to change revenue/expenses</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                  <div>
                    <div className="font-semibold text-slate-900">AI Detects Pattern</div>
                    <div className="text-slate-600">Calculates growth rate from your manual entries</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                  <div>
                    <div className="font-semibold text-slate-900">Auto-Forecasts Future</div>
                    <div className="text-slate-600">Extends pattern to remaining months with confidence scores</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}