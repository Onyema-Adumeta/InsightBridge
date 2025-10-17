"use client";

import React from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface KpiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiLabel: string;
  kpiValue: string;
  historicalData?: Array<{ period: string; value: number }>;
  delta?: number;
  deltaPercentage?: number;
}

export const KpiDetailModal: React.FC<KpiDetailModalProps> = ({
  isOpen,
  onClose,
  kpiLabel,
  kpiValue,
  historicalData = [],
  delta,
  deltaPercentage
}) => {
  if (!isOpen) return null;

  const isPositive = delta && delta > 0;
  const hasData = historicalData.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{kpiLabel}</h3>
            <p className="text-3xl font-bold text-blue-400 mt-2">{kpiValue}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Delta Section */}
          {delta !== undefined && deltaPercentage !== undefined && (
            <div className="flex items-center space-x-4 bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                {isPositive ? (
                  <TrendingUp className="w-6 h-6 text-green-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <p className="text-sm text-slate-400">Change from previous period</p>
                  <p className={`text-xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{deltaPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-slate-400">Absolute change</p>
                <p className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{delta.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Historical Trend</h4>
            {hasData ? (
              <div className="bg-slate-900/30 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historicalData}>
                    <XAxis 
                      dataKey="period" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-slate-900/30 rounded-lg p-8 text-center">
                <p className="text-slate-400">No historical data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900/50 px-6 py-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};