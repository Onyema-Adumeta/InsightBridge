// 🚀 Cash Flow Builder - Revolutionary Interactive Forecasting
// Add this as a new tab to CashFlowForecast.tsx

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
    baselineType: 'uploaded',
    periods: []
  });

  const [baselineChoice, setBaselineChoice] = useState<'zero' | 'uploaded' | 'custom'>('uploaded');
  const [forecastMonths, setForecastMonths] = useState(12);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState('');

  // Initialize periods
  useEffect(() => {
    initializePeriods();
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
      const growthFactor = 1 + (0.03 * i); // 3% growth per month
      const revenue = baselineRevenue * growthFactor;
      const expenses = baselineExpenses * (1 + 0.02 * i); // 2% expense growth
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
    
    setScenario(prev => ({ ...prev, periods }));
  };

  const updatePeriod = (periodId: string, field: 'revenue' | 'expenses', value: number) => {
    setScenario(prev => {
      const newPeriods = [...prev.periods];
      const index = newPeriods.findIndex(p => p.id === periodId);
      
      if (index === -1) return prev;
      
      // Update the specific field
      newPeriods[index] = {
        ...newPeriods[index],
        [field]: value,
        type: 'manual'
      };
      
      // Recalculate cash flow and balances from this point forward
      let runningBalance = index === 0 
        ? (baselineChoice === 'uploaded' ? 232606 : 0)
        : newPeriods[index - 1].balance;
      
      for (let i = index; i < newPeriods.length; i++) {
        const period = newPeriods[i];
        period.cashFlow = period.revenue - period.expenses;
        runningBalance += period.cashFlow;
        period.balance = runningBalance;
      }
      
      // Re-forecast periods after manual entries
      reforecastFromIndex(newPeriods, index + 1);
      
      return { ...prev, periods: newPeriods };
    });
  };

  const reforecastFromIndex = (periods: CashFlowPeriod[], startIndex: number) => {
    if (startIndex >= periods.length) return;
    
    // Find the last manual entry before startIndex
    let lastManualIndex = startIndex - 1;
    while (lastManualIndex >= 0 && periods[lastManualIndex].type === 'forecast') {
      lastManualIndex--;
    }
    
    if (lastManualIndex < 0) return;
    
    // Calculate growth rates from manual entries
    const revenueGrowth = calculateGrowthRate(periods.slice(0, startIndex), 'revenue');
    const expenseGrowth = calculateGrowthRate(periods.slice(0, startIndex), 'expenses');
    
    // Apply forecast
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
    if (periods.length < 2) return 0.03; // Default 3%
    
    const manualPeriods = periods.filter(p => p.type === 'manual');
    if (manualPeriods.length < 2) return 0.03;
    
    // Simple linear regression for growth rate
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

  const copyScenario = () => {
    const newScenario = {
      ...scenario,
      id: Date.now().toString(),
      name: `${scenario.name} (Copy)`
    };
    console.log('Scenario copied:', newScenario);
    alert('Scenario copied! (Feature coming soon)');
  };

  const exportToExcel = () => {
    // Create CSV
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
    
    // Simulate AI response
    const responses = [
      {
        question: 'revenue',
        answer: `Based on your current trajectory, I detect a ${(calculateGrowthRate(scenario.periods, 'revenue') * 100).toFixed(1)}% monthly revenue growth rate. To accelerate this to 15% MoM, consider: 1) Hiring 1-2 sales reps (Cost: $120K/yr, Expected lift: +$25K/mo by Month 6), 2) Increasing marketing spend by 50% (Cost: +$8K/mo, Expected lift: +$15K/mo).`
      },
      {
        question: 'hire',
        answer: `If you hire 3 engineers in Q2 at average $150K salary, here's the impact: Cost: $450K annually ($37.5K/mo starting Month 4). Based on your current eng:revenue ratio of 1:8, this could generate +$300K annual revenue (+$25K/mo). Runway impact: Extends by 2 months if revenue lift materializes, reduces by 4 months if it doesn't. Recommendation: Hire 2 now, 1 in Month 6 based on traction.`
      },
      {
        question: 'runway',
        answer: `Your current runway is ${Math.round(scenario.periods[scenario.periods.length - 1].balance / (scenario.periods[2].expenses - scenario.periods[2].revenue))} months. To extend it: 1) Reduce burn by 20% → +${Math.round(0.2 * scenario.periods[2].expenses / 1000)}K/mo saved → +3 months runway, 2) Accelerate collections by 15 days → +${Math.round(scenario.periods[0].revenue * 0.5 / 1000)}K one-time boost, 3) Optimize vendor payments → +15 days float → saves ~${Math.round(scenario.periods[0].expenses * 0.15 / 1000)}K/mo in opportunity cost.`
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
    <div className="space-y-6">
      {/* Header */}
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
              onClick={copyScenario}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Scenario
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Baseline Selection */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setBaselineChoice('zero')}
            className={`p-4 rounded-xl border-2 transition-all ${
              baselineChoice === 'zero'
                ? 'border-indigo-500 bg-white shadow-lg'
                : 'border-slate-200 bg-white/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-slate-900">Start Fresh</span>
            </div>
            <p className="text-sm text-slate-600">Build from zero, no assumptions</p>
          </button>

          <button
            onClick={() => setBaselineChoice('uploaded')}
            className={`p-4 rounded-xl border-2 transition-all ${
              baselineChoice === 'uploaded'
                ? 'border-emerald-500 bg-white shadow-lg'
                : 'border-slate-200 bg-white/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-slate-900">Use Your Data</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">Recommended</span>
            </div>
            <p className="text-sm text-slate-600">Pre-fill with uploaded financials</p>
            <p className="text-xs text-emerald-700 mt-1 font-medium">$233K cash, $8.5K/mo revenue</p>
          </button>

          <button
            onClick={() => setBaselineChoice('custom')}
            className={`p-4 rounded-xl border-2 transition-all ${
              baselineChoice === 'custom'
                ? 'border-purple-500 bg-white shadow-lg'
                : 'border-slate-200 bg-white/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="font-bold text-slate-900">Custom Start</span>
            </div>
            <p className="text-sm text-slate-600">Enter your own baseline values</p>
          </button>
        </div>

        {/* Forecast Period Selector */}
        <div className="mt-4 flex items-center gap-4">
          <label className="text-sm font-semibold text-slate-700">Forecast Horizon:</label>
          <select
            value={forecastMonths}
            onChange={(e) => setForecastMonths(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={18}>18 months</option>
            <option value={24}>24 months</option>
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Chart View
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalRevenue, true)}</div>
          <div className="text-xs text-slate-500 mt-1">{forecastMonths} months</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-600 mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses, true)}</div>
          <div className="text-xs text-slate-500 mt-1">{forecastMonths} months</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-600 mb-1">Net Cash Flow</div>
          <div className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow, true)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Cumulative</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-600 mb-1">Ending Balance</div>
          <div className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.endingBalance, true)}</div>
          <div className="text-xs text-slate-500 mt-1">Month {forecastMonths}</div>
        </div>
      </div>

      {/* Main Table/Chart Area */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                  <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Confidence</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">Actions</th>
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
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{period.month}</td>
                    <td className="px-4 py-3 text-right">
                      {editingPeriod === period.id ? (
                        <input
                          type="number"
                          value={period.revenue}
                          onChange={(e) => updatePeriod(period.id, 'revenue', Number(e.target.value))}
                          className="w-24 px-2 py-1 text-sm text-right border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-semibold text-emerald-600">
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
                          className="w-24 px-2 py-1 text-sm text-right border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(period.expenses)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${
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
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
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
                        <span className={`text-sm font-semibold ${getConfidenceColor(period.confidence || 0)}`}>
                          {period.confidence}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingPeriod === period.id ? (
                        <button
                          onClick={stopEditing}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditing(period.id)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cash Balance Projection</h3>
            <p className="text-sm text-slate-600">Green bars = Manual input, Blue bars = AI forecast</p>
          </div>
          
          <div className="relative h-64">
            {/* Simple bar chart visualization */}
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
                        className={`w-full rounded-t transition-all hover:opacity-80 cursor-pointer ${
                          period.type === 'manual'
                            ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                            : 'bg-gradient-to-t from-blue-500 to-blue-400'
                        }`}
                        style={{ height: `${heightPercent}%`, minHeight: '20px' }}
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
              <div className="w-4 h-4 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded"></div>
              <span className="text-sm text-slate-600">Manual Input ({summary.manualPeriods} months)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-400 rounded"></div>
              <span className="text-sm text-slate-600">AI Forecast ({summary.forecastPeriods} months)</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Copilot */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">🤖 AI Copilot</h3>
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
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
              >
                Ask
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {setCopilotQuestion('How can I improve my revenue growth?'); askCopilot();}}
                className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-50"
              >
                💡 Improve revenue growth
              </button>
              <button
                onClick={() => {setCopilotQuestion('What if I hire 3 people?'); askCopilot();}}
                className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-50"
              >
                👥 Hiring impact
              </button>
              <button
                onClick={() => {setCopilotQuestion('How can I extend my runway?'); askCopilot();}}
                className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-50"
              >
                🎯 Extend runway
              </button>
            </div>

            <div className="mt-4 p-4 bg-purple-100/50 rounded-xl border border-purple-200">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <span className="font-semibold">Pro Tip:</span> Manual entries improve AI accuracy. The more periods you fill, the smarter the forecast!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          How to Use Cash Flow Builder
        </h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
            <div>
              <div className="font-semibold text-slate-900">Choose Baseline</div>
              <div className="text-slate-600">Start with uploaded data or fresh</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
            <div>
              <div className="font-semibold text-slate-900">Edit Periods</div>
              <div className="text-slate-600">Click edit icon to input actual/projected values</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
            <div>
              <div className="font-semibold text-slate-900">AI Forecasts Rest</div>
              <div className="text-slate-600">AI extends pattern intelligently with confidence scores</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}