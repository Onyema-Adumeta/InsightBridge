"use client";

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MiniTrendCardProps {
  title: string;
  value: string;
  change: string;
  sparkline: number[];
  color: 'green' | 'blue' | 'orange' | 'red' | 'purple';
}

const colorClasses = {
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    spark: 'bg-green-500'
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    spark: 'bg-blue-500'
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    spark: 'bg-orange-500'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    spark: 'bg-red-500'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    spark: 'bg-purple-500'
  }
};

const MiniTrendCard: React.FC<MiniTrendCardProps> = ({ title, value, change, sparkline, color }) => {
  const isPositive = change.startsWith('+');
  const colors = colorClasses[color];
  
  // Calculate sparkline heights
  const maxVal = Math.max(...sparkline);
  const minVal = Math.min(...sparkline);
  const range = maxVal - minVal;

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-slate-600 uppercase tracking-wide">{title}</h4>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
          {change}
        </span>
      </div>
      
      <div className={`text-2xl font-bold ${colors.text} mb-3`}>
        {value}
      </div>
      
      {/* Sparkline */}
      <div className="flex items-end gap-1 h-8">
        {sparkline.map((val, idx) => {
          const height = range > 0 ? ((val - minVal) / range) * 100 : 50;
          return (
            <div
              key={idx}
              className={`flex-1 ${colors.spark} rounded-t opacity-70 hover:opacity-100 transition-opacity`}
              style={{ height: `${height}%`, minHeight: '4px' }}
              title={`${val}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MiniTrendCard;