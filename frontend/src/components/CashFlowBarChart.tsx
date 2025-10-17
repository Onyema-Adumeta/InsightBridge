"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CashFlowBarChartProps {
  data: {
    operatingCashFlow?: number;
    investingCashFlow?: number;
    financingCashFlow?: number;
    netChangeInCash?: number;
  };
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const CashFlowBarChart: React.FC<CashFlowBarChartProps> = ({ data }) => {
  if (!data) return <div className="text-center text-gray-500">No cash flow data available.</div>;

  const chartData = [
    {
      name: 'Operating',
      value: data.operatingCashFlow || 0,
      color: data.operatingCashFlow && data.operatingCashFlow >= 0 ? '#10b981' : '#ef4444'
    },
    {
      name: 'Investing',
      value: data.investingCashFlow || 0,
      color: data.investingCashFlow && data.investingCashFlow >= 0 ? '#10b981' : '#ef4444'
    },
    {
      name: 'Financing',
      value: data.financingCashFlow || 0,
      color: data.financingCashFlow && data.financingCashFlow >= 0 ? '#10b981' : '#ef4444'
    },
    {
      name: 'Net Change',
      value: data.netChangeInCash || 0,
      color: data.netChangeInCash && data.netChangeInCash >= 0 ? '#3b82f6' : '#f59e0b'
    }
  ];

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number) => formatCurrency(value)}
            labelStyle={{ color: '#111827', fontWeight: 600 }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Operating Activities</div>
          <div className={`text-xl font-bold ${(data.operatingCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.operatingCashFlow || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {(data.operatingCashFlow || 0) >= 0 ? 'Cash generated from operations' : 'Cash used in operations'}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Net Change</div>
          <div className={`text-xl font-bold ${(data.netChangeInCash || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {formatCurrency(data.netChangeInCash || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {(data.netChangeInCash || 0) >= 0 ? 'Overall cash increase' : 'Overall cash decrease'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowBarChart;