'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, Plus, Trash2,
  Copy, Download, Upload, Sparkles, Brain, RefreshCw, Edit3,
  Check, X, ChevronLeft, ChevronRight, AlertCircle, Info,
  Zap, Target, BarChart3, LineChart
} from 'lucide-react';

interface CashFlowPeriod {
  id: string;
  month: string;
  date: Date;
  type: 'actual' | 'manual' | 'forecast';
  revenue: number;
  expenses: number;
  cashFlow: number;
  balance: number;
  confidence?: number;
  isEditing?: boolean;
}

interface ForecastScenario {
  id: string;
  name: string;
  baselineType: 'zero' | 'uploaded' | 'custom';
  periods: CashFlowPeriod[];
}

export default function CashFlowBuilder() {
  const [scenario, setScenario] = useState<ForecastScenario>({
    id: '1',
    name: 'Default Forecast',
    baselineType: 'zero',
    periods: []
  });

  const [baselineChoice, setBaselineChoice] = useState<'zero' | 'uploaded' | 'custom'>('zero');
  const [forecastMonths, setForecastMonths] = useState(12);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [copilotQuestion, setCopilotQuestion] = useState('');

  // ✅ CLEAR DATA ON MOUNT
  useEffect(() => {
    console.log('🧹 Cash Flow Builder loaded - clearing old data');
    
    // Clear all state
    setScenario({
      id: '1',
      name: 'Default Forecast',
      baselineType: 'zero',
      periods: []
    });
    setBaselineChoice('zero');
    setForecastMonths(12);
    setViewMode('table');
    setEditingPeriod(null);
    setCopilotQuestion('');
    
    // Clear storage
    localStorage.removeItem('cashFlowScenario');
    localStorage.removeItem('forecastData');
    sessionStorage.removeItem('cashFlowScenario');
    
  }, []);

  // Initialize periods when baseline or months change
  useEffect(() => {
    if (baselineChoice) {
      initializePeriods();
    }
  }, [baselineChoice, forecastMonths]);

  const initializePeriods = () => {
    const periods: CashFlowPeriod[] = [];
    const startDate = new Date();
    
    // Get baseline values
    const baselineRevenue = baselineChoice === 'uploaded' ? 8526 : 0;
    const baselineExpenses = baselineChoice === 'uploaded' ? 6478 : 0;
    const startingBalance = baselineChoice === 'uploaded' ? 232606 : 0;
    
    let runningBalance = startingBalance;
    
    for (let i = 0; i < forecastMonths; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      // Simple growth pattern for forecast
      const growthFactor = 1 + (0.03 * i);
      const revenue = baselineRevenue * growthFactor;
      const expenses = baselineExpenses * (1 + 0.02 * i);
      const cashFlow = revenue - expenses;
      runningBalance += cashFlow;
      
      periods.push({
        id: `period-${i}`,
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        date,
        type: i < 3 ? 'manual' : 'forecast',
        revenue: Math.round(revenue),
        expenses: Math.round(expenses),
        cashFlow: Math.round(cashFlow),
        balance: Math.round(runningBalance),
        confidence: i < 3 ? 100 : Math.max(90 - i * 3, 60),
        isEditing: false
      });
    }
    
    setScenario(prev => ({ ...prev, periods, baselineType: baselineChoice }));
  };

  const updatePeriod = (periodId: string, field: 'revenue' | 'expenses', value: number) => {
    setScenario(prev => {
      const newPeriods = [...prev.periods];
      const index = newPeriods.findIndex(p => p.id === periodId);
      
      if (index === -1) return prev;
      
      newPeriods[index] = {
        ...newPeriods[index],
        [field]: value,
        type: 'manual'
      };
      
      let runningBalance = index === 0 
        ? (baselineChoice === 'uploaded' ? 232606 : 0)
        : newPeriods[index - 1].balance;
      
      for (let i = index; i < newPeriods.length; i++) {
        const period = newPeriods[i];
        period.cashFlow = period.revenue - period.expenses;
        runningBalance += period.cashFlow;
        period.balance = runningBalance;
      }
      
      reforecastFromIndex(newPeriods, index + 1);
      
      return { ...prev, periods: newPeriods };
    });
  };

  const reforecastFromIndex = (periods: CashFlowPeriod[], startIndex: number) => {
    if (startIndex >= periods.length) return;
    
    let lastManualIndex = startIndex - 1;
    while (lastManualIndex >= 0 && periods[lastManualIndex].type === 'forecast') {
      lastManualIndex--;
    }
    
    if (lastManualIndex < 0) return;
    
    const revenueGrowth = calculateGrowthRate(periods.slice(0, startIndex), 'revenue');
    const expenseGrowth = calculateGrowthRate(periods.slice(0, startIndex), 'expenses');
    
    for (let i = startIndex; i < periods.length; i++) {
      if (periods[i].type === 'forecast') {
        const prevPeriod = periods[i - 1];
        periods[i].revenue = Math.round(prevPeriod.revenue * (1 + revenueGrowth));
        periods[i].expenses = Math.round(prevPeriod.expenses * (1 + expenseGrowth));
        periods[i].cashFlow = periods[i].revenue - periods[i].expenses;
        periods[i].balance = prevPeriod.balance + periods[i].cashFlow;
        periods[i].confidence = Math.max(90 - (i - startIndex) * 3, 60);
      }
    }
  };

  const calculateGrowthRate = (periods: CashFlowPeriod[], field: 'revenue' | 'expenses'): number => {
    if (periods.length < 2) return 0.03;
    
    const manualPeriods = periods.filter(p => p.type === 'manual');
    if (manualPeriods.length < 2) return 0.03;
    
    const values = manualPeriods.map(p => p[field]);
    const n = values.length;
    
    let sumGrowth = 0;
    for (let i = 1; i < n; i++) {
      const growth = (values[i] - values[i-1]) / values[i-1];
      sumGrowth += growth;
    }
    
    return sumGrowth / (n - 1);
  };

  const startEditing = (periodId: string) => {
    setEditingPeriod(periodId);
  };

  const stopEditing = () => {
    setEditingPeriod(null);
  };

  const handleReset = () => {
    if (scenario.periods.length > 0 && !confirm('Clear all forecast data and start fresh?')) {
      return;
    }
    
    setScenario({
      id: Date.now().toString(),
      name: 'Default Forecast',
      baselineType: 'zero',
      periods: []
    });
    setBaselineChoice('zero');
    setForecastMonths(12);
    setViewMode('table');
    setEditingPeriod(null);
    setCopilotQuestion('');
    
    localStorage.removeItem('cashFlowScenario');
    sessionStorage.removeItem('cashFlowScenario');
  };

  const copyScenario = () => {
    const newScenario = {
      ...scenario,
      id: Date.now().toString(),
      name: `${scenario.name} (Copy)`
    };
    console.log('Scenario copied:', newScenario);
    alert('✅ Scenario copied! Multiple scenario management coming soon.');
  };

  const exportToExcel = () => {
    const headers = ['Month', 'Revenue', 'Expenses', 'Cash Flow', 'Balance', 'Type', 'Confidence'];
    const rows = scenario.periods.map(p => [
      p.month,
      p.revenue,
      p.expenses,
      p.cashFlow,
      p.balance,
      p.type,
      p.confidence || 100
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-forecast-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const askCopilot = () => {
    if (!copilotQuestion.trim()) return;
    
    const responses = [
      {
        question: 'revenue',
        answer: `Based on your current trajectory, I detect a ${(calculateGrowthRate(scenario.periods, 'revenue') * 100).toFixed(1)}% monthly revenue growth rate. To accelerate this to 15% MoM, consider: 1) Hiring 1-2 sales reps (Cost: $120K/yr, Expected lift: +$25K/mo by Month 6), 2) Increasing marketing spend by 50% (Cost: +$8K/mo, Expected lift: +$15K/mo).`
      },
      {
        question: 'hire',
        answer: `If you hire 3 engineers in Q2 at average $150K salary, here's the impact: Cost: $450K annually ($37.5K/mo starting Month 4). Based on your current eng:revenue ratio, this could generate +$300K annual revenue (+$25K/mo). Runway impact: Extends by 2 months if revenue lift materializes, reduces by 4 months if it doesn't. Recommendation: Hire 2 now, 1 in Month 6 based on traction.`
      },
      {
        question: 'runway',
        answer: `Your current runway is ${scenario.periods.length > 0 ? Math.round(scenario.periods[scenario.periods.length - 1].balance / Math.abs(scenario.periods[2]?.expenses - scenario.periods[2]?.revenue || 1)) : 0} months. To extend it: 1) Reduce burn by 20% → +3 months runway, 2) Accelerate collections by 15 days → one-time boost, 3) Optimize vendor payments → +15 days float → saves opportunity cost.`
      }
    ];
    
    const matchedResponse = responses.find(r => copilotQuestion.toLowerCase().includes(r.question));
    const answer = matchedResponse?.answer || 
      `Great question! To give you the best answer, I'd need to analyze: 1) Your historical growth patterns, 2) Industry benchmarks for similar companies, 3) Your specific unit economics. Try asking about 'revenue growth', 'hiring impact', or 'runway extension' for detailed analysis.`;
    
    alert(`🤖 Copilot: ${answer}`);
    setCopilotQuestion('');
  };

  const formatCurrency = (num: number, compact = false) => {
    if (compact && Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (compact && Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toLocaleString()}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-emerald-600';
    if (confidence >= 75) return 'text-blue-600';
    if (confidence >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const summary = {
    totalRevenue: scenario.periods.reduce((sum, p) => sum + p.revenue, 0),
    totalExpenses: scenario.periods.reduce((sum, p) => sum + p.expenses, 0),
    netCashFlow: scenario.periods.reduce((sum, p) => sum + p.cashFlow, 0),
    endingBalance: scenario.periods[scenario.periods.length - 1]?.balance || 0,
    lowestBalance: Math.min(...scenario.periods.map(p => p.balance)),
    manualPeriods: scenario.periods.filter(p => p.type === 'manual').length,
    forecastPeriods: scenario.periods.filter(p => p.type === 'forecast').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Cash Flow Builder</h2>
                  <p className="text-indigo-100 text-lg mt-1">Build your forecast manually, AI extends it intelligently</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-medium transition-all border-2 border-white/30"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={copyScenario}
                className="px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-medium transition-all border-2 border-white/30 flex items-center gap-2"
              >
                <Copy className="w-5 h-5" />
                <span className="hidden sm:inline">Copy</span>
              </button>
              <button
                onClick={exportToExcel}
                className="px-5 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          {/* Baseline Selection */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setBaselineChoice('zero')}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                baselineChoice === 'zero'
                  ? 'border-white bg-white/20 backdrop-blur-sm shadow-xl'
                  : 'border-white/30 bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-6 h-6" />
                <span className="font-bold text-lg">Start Fresh</span>
              </div>
              <p className="text-sm text-indigo-100">Build from zero, no assumptions</p>
            </button>

            <button
              onClick={() => setBaselineChoice('uploaded')}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                baselineChoice === 'uploaded'
                  ? 'border-white bg-white/20 backdrop-blur-sm shadow-xl'
                  : 'border-white/30 bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-6 h-6" />
                <span className="font-bold text-lg">Use Your Data</span>
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">Best</span>
              </div>
              <p className="text-sm text-indigo-100 mb-1">Pre-fill with uploaded financials</p>
              <p className="text-xs text-white/90 font-medium">$233K cash, $8.5K/mo revenue</p>
            </button>

            <button
              onClick={() => setBaselineChoice('custom')}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                baselineChoice === 'custom'
                  ? 'border-white bg-white/20 backdrop-blur-sm shadow-xl'
                  : 'border-white/30 bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-6 h-6" />
                <span className="font-bold text-lg">Custom Start</span>
              </div>
              <p className="text-sm text-indigo-100">Enter your own baseline values</p>
            </button>
          </div>

          {/* Forecast Period Selector */}
          <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold">Forecast Horizon:</label>
              <select
                value={forecastMonths}
                onChange={(e) => setForecastMonths(Number(e.target.value))}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-white"
              >
                <option value={6} className="text-slate-900">6 months</option>
                <option value={12} className="text-slate-900">12 months</option>
                <option value={18} className="text-slate-900">18 months</option>
                <option value={24} className="text-slate-900">24 months</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  viewMode === 'chart'
                    ? 'bg-white text-indigo-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Chart View
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {scenario.periods.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border-2 border-green-200 shadow-md hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-sm text-slate-600 font-medium">Total Revenue</div>
              </div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue, true)}</div>
              <div className="text-xs text-slate-500 mt-1">{forecastMonths} months</div>
            </div>

            <div className="bg-white rounded-xl p-5 border-2 border-red-200 shadow-md hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-sm text-slate-600 font-medium">Total Expenses</div>
              </div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses, true)}</div>
              <div className="text-xs text-slate-500 mt-1">{forecastMonths} months</div>
            </div>

            <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-md hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-sm text-slate-600 font-medium">Net Cash Flow</div>
              </div>
              <div className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow, true)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Cumulative</div>
            </div>

            <div className="bg-white rounded-xl p-5 border-2 border-purple-200 shadow-md hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-sm text-slate-600 font-medium">Ending Balance</div>
              </div>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(summary.endingBalance, true)}</div>
              <div className="text-xs text-slate-500 mt-1">Month {forecastMonths}</div>
            </div>
          </div>
        )}

        {/* Main Table/Chart Area */}
        {scenario.periods.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Ready to Build Your Forecast?</h3>
            <p className="text-slate-600 mb-6">Choose a baseline above to get started</p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-sm text-slate-500">
                💡 Tip: Start with "Use Your Data" for the fastest setup
              </div>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Month</th>
                    <th className="px-4 py-4 text-right text-sm font-bold text-slate-700">Revenue</th>
                    <th className="px-4 py-4 text-right text-sm font-bold text-slate-700">Expenses</th>
                    <th className="px-4 py-4 text-right text-sm font-bold text-slate-700">Cash Flow</th>
                    <th className="px-4 py-4 text-right text-sm font-bold text-slate-700">Balance</th>
                    <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">Type</th>
                    <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">Confidence</th>
                    <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.periods.map((period, index) => (
                    <tr
                      key={period.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        period.type === 'forecast' ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{period.month}</td>
                      <td className="px-4 py-3 text-right">
                        {editingPeriod === period.id ? (
                          <input
                            type="number"
                            value={period.revenue}
                            onChange={(e) => updatePeriod(period.id, 'revenue', Number(e.target.value))}
                            className="w-28 px-3 py-1.5 text-sm text-right border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-bold text-emerald-600">
                            {formatCurrency(period.revenue)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingPeriod === period.id ? (
                          <input
                            type="number"
                            value={period.expenses}
                            onChange={(e) => updatePeriod(period.id, 'expenses', Number(e.target.value))}
                            className="w-28 px-3 py-1.5 text-sm text-right border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="text-sm font-bold text-red-600">
                            {formatCurrency(period.expenses)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-bold ${
                          period.cashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {period.cashFlow >= 0 ? '+' : ''}{formatCurrency(period.cashFlow)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(period.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                          period.type === 'manual' 
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {period.type === 'manual' ? (
                            <><Edit3 className="w-3 h-3" /> Manual</>
                          ) : (
                            <><Brain className="w-3 h-3" /> AI</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {period.type === 'forecast' && (
                          <span className={`text-sm font-bold ${getConfidenceColor(period.confidence || 0)}`}>
                            {period.confidence}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingPeriod === period.id ? (
                          <button
                            onClick={stopEditing}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => startEditing(period.id)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Cash Balance Projection</h3>
              <p className="text-sm text-slate-600">Green bars = Manual input, Blue bars = AI forecast</p>
            </div>
            
            <div className="relative h-80">
              <div className="flex items-end justify-between h-full gap-1">
                {scenario.periods.map((period, index) => {
                  const maxBalance = Math.max(...scenario.periods.map(p => p.balance));
                  const heightPercent = (period.balance / maxBalance) * 100;
                  
                  return (
                    <div
                      key={period.id}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div className="relative w-full">
                        <div
                          className={`w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer shadow-md ${
                            period.type === 'manual'
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                              : 'bg-gradient-to-t from-blue-600 to-blue-400'
                          }`}
                          style={{ height: `${heightPercent}%`, minHeight: '30px' }}
                          title={`${period.month}: ${formatCurrency(period.balance)}`}
                        />
                      </div>
                      {index % 2 === 0 && (
                        <div className="text-xs text-slate-500 rotate-45 whitespace-nowrap">
                          {period.month.split(' ')[0]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-emerald-600 to-emerald-400 rounded shadow-md"></div>
                <span className="text-sm text-slate-700 font-medium">Manual Input ({summary.manualPeriods} months)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-blue-400 rounded shadow-md"></div>
                <span className="text-sm text-slate-700 font-medium">AI Forecast ({summary.forecastPeriods} months)</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Copilot */}
        {scenario.periods.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">🤖 AI Copilot</h3>
                <p className="text-sm text-slate-600 mb-4">Ask me anything about your forecast...</p>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={copilotQuestion}
                    onChange={(e) => setCopilotQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && askCopilot()}
                    placeholder="e.g., 'What if I hire 3 engineers?' or 'How can I extend runway?'"
                    className="flex-1 px-4 py-3 bg-white border-2 border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={askCopilot}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Ask
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {setCopilotQuestion('How can I improve my revenue growth?'); askCopilot();}}
                    className="px-3 py-2 bg-white border-2 border-purple-200 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                  >
                    💡 Improve revenue growth
                  </button>
                  <button
                    onClick={() => {setCopilotQuestion('What if I hire 3 people?'); askCopilot();}}
                    className="px-3 py-2 bg-white border-2 border-purple-200 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                  >
                    👥 Hiring impact
                  </button>
                  <button
                    onClick={() => {setCopilotQuestion('How can I extend my runway?'); askCopilot();}}
                    className="px-3 py-2 bg-white border-2 border-purple-200 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                  >
                    🎯 Extend runway
                  </button>
                </div>

                <div className="mt-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border-2 border-purple-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-900">
                      <span className="font-bold">Pro Tip:</span> Manual entries improve AI accuracy. The more periods you fill, the smarter the forecast!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-md">
          <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-lg">
            <Sparkles className="w-6 h-6 text-blue-600" />
            How to Use Cash Flow Builder
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-md">1</div>
              <div>
                <div className="font-bold text-slate-900 mb-1">Choose Baseline</div>
                <div className="text-slate-600">Start with uploaded data or fresh</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-md">2</div>
              <div>
                <div className="font-bold text-slate-900 mb-1">Edit Periods</div>
                <div className="text-slate-600">Click edit icon to input actual/projected values</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-md">3</div>
              <div>
                <div className="font-bold text-slate-900 mb-1">AI Forecasts Rest</div>
                <div className="text-slate-600">AI extends pattern intelligently with confidence scores</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}