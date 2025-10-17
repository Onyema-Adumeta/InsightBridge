"use client";

import { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, BarChart3, Download, Plus, Calendar } from 'lucide-react';

export default function TrendAnalysisPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mom');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const periodOptions = [
    { value: 'mom', label: 'Month over Month' },
    { value: 'qoq', label: 'Quarter over Quarter' },
    { value: 'yoy', label: 'Year over Year' },
    { value: 'custom', label: 'Custom Period' }
  ];

  const handleCompare = async () => {
    setIsLoading(true);
    // TODO: Fetch data from your API
    // const response = await fetch('/api/trend-analysis', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     period: selectedPeriod,
    //     startDate,
    //     endDate,
    //     compareStartDate,
    //     compareEndDate,
    //     metrics: selectedMetrics
    //   })
    // });
    // const data = await response.json();
    setIsLoading(false);
  };

  return (
    <div className="ml-64 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Trend Analysis</h1>
                <p className="text-sm text-slate-600">Compare metrics across different time periods</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Period Selection Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Select Comparison Period
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Period Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comparison Type
              </label>
              <div className="grid grid-cols-4 gap-3">
                {periodOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedPeriod(option.value)}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedPeriod === option.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Current Period
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Compare To Period
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={compareStartDate}
                        onChange={(e) => setCompareStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={compareEndDate}
                        onChange={(e) => setCompareEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleCompare}
              disabled={isLoading}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition font-medium"
            >
              {isLoading ? 'Loading...' : 'Run Comparison'}
            </button>
          </div>
        </div>

        {/* Metrics Selection Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Select Metrics to Compare
            </h2>
            <button className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm font-medium">
              <Plus className="w-4 h-4" />
              Add Metric
            </button>
          </div>
          <div className="p-6">
            <div className="text-center py-12 text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">Select metrics from your dashboard to compare</p>
              <p className="text-xs text-slate-400 mt-1">Connect your data source to get started</p>
            </div>
          </div>
        </div>

        {/* Comparison Results Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Comparison Results</h2>
          </div>
          <div className="p-6">
            <div className="text-center py-16 text-slate-500">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-base font-medium mb-2">No comparison data yet</p>
              <p className="text-sm text-slate-400">Configure periods and run a comparison to see results</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}