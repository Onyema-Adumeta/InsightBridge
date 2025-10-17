"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  assets: '#3b82f6',
  liabilities: '#ef4444',
  equity: '#22c55e',
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

interface BalanceSheetPieChartProps {
  data?: {
    total_assets?: number;
    total_liabilities?: number;
    total_equity?: number;
  };
}

const BalanceSheetPieChart: React.FC<BalanceSheetPieChartProps> = ({ data }) => {
  if (!data) return <div className="text-center text-gray-500">No balance sheet data available.</div>;

  const totalAssets = data.total_assets || 0;
  const totalLiabilities = data.total_liabilities || 0;
  const equity = data.total_equity || (totalAssets - totalLiabilities);

  if (totalAssets === 0) {
    return <div className="text-center text-gray-500">No balance sheet data to display.</div>;
  }

  const pieData = [
    { name: 'Total Liabilities', value: totalLiabilities, color: COLORS.liabilities },
    { name: 'Shareholders\' Equity', value: equity, color: COLORS.equity },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
        Assets = Liabilities + Equity
      </h3>
      <h4 className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-4">
        {formatCurrency(totalAssets)}
      </h4>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#fff'
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend
            wrapperStyle={{ color: '#9ca3af' }}
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            label={(entry) => `${((entry.value / totalAssets) * 100).toFixed(0)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Additional metrics */}
      <div className="mt-4 grid grid-cols-2 gap-4 w-full max-w-md text-sm">
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <div className="text-gray-600 dark:text-gray-400">Liabilities</div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalLiabilities)}
          </div>
          <div className="text-xs text-gray-500">
            {((totalLiabilities / totalAssets) * 100).toFixed(1)}% of assets
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <div className="text-gray-600 dark:text-gray-400">Equity</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatCurrency(equity)}
          </div>
          <div className="text-xs text-gray-500">
            {((equity / totalAssets) * 100).toFixed(1)}% of assets
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetPieChart;