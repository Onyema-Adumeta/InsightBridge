"use client";
import React from 'react';

// --- New SVG Icons for a more polished look ---
const ArrowUpIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
  </svg>
);

const ArrowDownIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-7-7m7 7l7-7" />
  </svg>
);


// --- Updated KpiCardProps Interface ---
interface KpiCardProps {
  title: string;
  value: number; // Value should be a number for calculations
  previousValue: number; // The value to compare against
  periodLabel: string; // e.g., "vs last quarter"
  formatFn: (value: number) => string; // A function to format the value for display
  onClick?: () => void;
}

// --- Enriched KpiCard Component ---
export const KpiCard: React.FC<KpiCardProps> = ({ title, value, previousValue, periodLabel, formatFn, onClick }) => {
  
  // Calculate the percentage change from the previous value.
  // Handles the case where previousValue is 0 to prevent division errors.
  const percentageChange = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = percentageChange >= 0;

  // Dynamically set the text color based on the change.
  const colorClass = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <div 
      onClick={onClick}
      className={`bg-slate-800 rounded-xl p-6 border border-slate-700 transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:border-blue-500 hover:shadow-lg' : ''
      }`}
    >
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <div className="flex justify-between items-end">
        <h3 className="text-3xl font-bold text-white">{formatFn(value)}</h3>
        <div className={`flex items-center gap-1 text-sm font-semibold ${colorClass}`}>
          {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
          <span>{Math.abs(percentageChange).toFixed(1)}%</span>
          <span className="text-gray-500 font-normal ml-1">{periodLabel}</span>
        </div>
      </div>
    </div>
  );
};

// Your existing skeleton component (unchanged)
export const KpiCardSkeleton = () => (
  <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      <div className="h-4 w-4 bg-gray-700 rounded"></div>
    </div>
    <div className="flex items-end justify-between">
      <div className="flex-1">
        <div className="h-8 bg-gray-700 rounded w-3/4 mb-1"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
      <div className="h-6 bg-gray-700 rounded w-8 ml-2"></div>
    </div>
  </div>
);