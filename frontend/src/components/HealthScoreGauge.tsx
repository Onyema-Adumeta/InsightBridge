"use client";
import React, { useState, useEffect } from 'react';

interface FinancialHealthScore {
  score: number;
  summary: string;
  breakdown?: {
    liquidity?: number;
    profitability?: number;
    leverage?: number;
    efficiency?: number;
  };
  trend?: 'improving' | 'declining' | 'stable';
  lastUpdated?: string;
  loading?: boolean;
}

interface HealthMetric {
  label: string;
  value: number;
  icon: string;
  color: string;
}

// Health status configuration - UPDATED FOR CLEAN WHITE THEME
const getHealthStatus = (score: number) => {
  if (score >= 80) return {
    label: 'Excellent',
    color: 'text-green-600',
    strokeColor: 'stroke-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    progressBg: 'bg-green-500'
  };
  if (score >= 60) return {
    label: 'Good',
    color: 'text-blue-600',
    strokeColor: 'stroke-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    progressBg: 'bg-blue-500'
  };
  if (score >= 40) return {
    label: 'Fair',
    color: 'text-amber-600',
    strokeColor: 'stroke-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    progressBg: 'bg-amber-500'
  };
  return {
    label: 'Poor',
    color: 'text-red-600',
    strokeColor: 'stroke-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    progressBg: 'bg-red-500'
  };
};

// Trend indicator component - UPDATED COLORS
const TrendIndicator = ({ trend }: { trend?: string }) => {
  if (!trend) return null;
  
  const trendConfig = {
    improving: { icon: '↗', color: 'text-green-600', label: 'Improving' },
    declining: { icon: '↘', color: 'text-red-600', label: 'Declining' },
    stable: { icon: '→', color: 'text-slate-600', label: 'Stable' }
  };
  
  const config = trendConfig[trend as keyof typeof trendConfig];
  if (!config) return null;
  
  return (
    <div className={`flex items-center space-x-1 ${config.color}`}>
      <span className="text-sm font-semibold">{config.icon}</span>
      <span className="text-xs">{config.label}</span>
    </div>
  );
};

// Breakdown metrics component - UPDATED FOR LIGHT THEME
const HealthBreakdown = ({ breakdown }: { breakdown?: FinancialHealthScore['breakdown'] }) => {
  if (!breakdown) return null;
  
  const metrics: HealthMetric[] = [
    { label: 'Liquidity', value: breakdown.liquidity || 0, icon: '💧', color: 'text-blue-600' },
    { label: 'Profitability', value: breakdown.profitability || 0, icon: '💰', color: 'text-green-600' },
    { label: 'Leverage', value: breakdown.leverage || 0, icon: '⚖️', color: 'text-purple-600' },
    { label: 'Efficiency', value: breakdown.efficiency || 0, icon: '⚡', color: 'text-amber-600' }
  ].filter(metric => metric.value > 0);
  
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center">
              <span className="mr-1">{metric.icon}</span>
              {metric.label}
            </span>
            <span className={`font-semibold ${metric.color}`}>{metric.value}</span>
          </div>
          <div className="mt-1 w-full bg-slate-200 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-500 ${metric.color.replace('text-', 'bg-')}`}
              style={{ width: `${metric.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Loading skeleton - UPDATED FOR LIGHT THEME
const HealthScoreSkeleton = () => (
  <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="h-5 bg-slate-200 rounded w-32"></div>
      <div className="h-4 bg-slate-200 rounded w-16"></div>
    </div>
    <div className="flex items-center justify-center mb-4">
      <div className="w-32 h-32 bg-slate-200 rounded-full"></div>
    </div>
    <div className="text-center">
      <div className="h-4 bg-slate-200 rounded w-24 mx-auto mb-2"></div>
      <div className="h-3 bg-slate-200 rounded w-32 mx-auto"></div>
    </div>
  </div>
);

export const HealthScoreGauge = ({ 
  score, 
  summary, 
  breakdown, 
  trend, 
  lastUpdated,
  loading = false 
}: FinancialHealthScore) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  const healthStatus = getHealthStatus(score);
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (animatedScore / 100) * circumference;
  
  // Animate score on mount
  useEffect(() => {
    if (!loading && score > 0) {
      const timer = setTimeout(() => {
        setAnimatedScore(score);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [score, loading]);
  
  if (loading) {
    return <HealthScoreSkeleton />;
  }
  
  return (
    <div className={`
      bg-white
      p-6 rounded-xl shadow-sm
      border-2 ${healthStatus.borderColor}
      hover:shadow-md transition-all duration-300
      ${breakdown ? 'cursor-pointer' : ''}
    `}
    onClick={breakdown ? () => setShowBreakdown(!showBreakdown) : undefined}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center">
          <span className="mr-2">❤️</span>
          Financial Health
        </h3>
        <div className="flex items-center space-x-2">
          {trend && <TrendIndicator trend={trend} />}
          <div className={`w-2 h-2 rounded-full ${healthStatus.progressBg} animate-pulse`}></div>
        </div>
      </div>
      
      {/* Gauge */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-200"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`transition-all duration-1000 ease-out ${healthStatus.strokeColor}`}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${healthStatus.color}`}>
              {animatedScore}
            </span>
            <span className="text-xs text-slate-600">Score</span>
          </div>
        </div>
      </div>
      
      {/* Status and Summary */}
      <div className="text-center mb-4">
        <p className={`font-semibold text-lg ${healthStatus.color}`}>
          {healthStatus.label}
        </p>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          {summary}
        </p>
      </div>
      
      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-center text-xs text-slate-500 mb-2">
          Updated {new Date(lastUpdated).toLocaleDateString()}
        </div>
      )}
      
      {/* Breakdown Toggle Hint */}
      {breakdown && (
        <div className="text-center">
          <button className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium">
            {showBreakdown ? 'Hide Details' : 'View Breakdown'} {showBreakdown ? '▲' : '▼'}
          </button>
        </div>
      )}
      
      {/* Breakdown Section */}
      {showBreakdown && breakdown && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Health Metrics</h4>
          <HealthBreakdown breakdown={breakdown} />
        </div>
      )}
      
      {/* Score Ranges Legend */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div className="text-center">
            <div className="w-full h-1 bg-red-400 rounded mb-1"></div>
            <span className="text-slate-600">0-39</span>
          </div>
          <div className="text-center">
            <div className="w-full h-1 bg-amber-400 rounded mb-1"></div>
            <span className="text-slate-600">40-59</span>
          </div>
          <div className="text-center">
            <div className="w-full h-1 bg-blue-400 rounded mb-1"></div>
            <span className="text-slate-600">60-79</span>
          </div>
          <div className="text-center">
            <div className="w-full h-1 bg-green-400 rounded mb-1"></div>
            <span className="text-slate-600">80-100</span>
          </div>
        </div>
      </div>
    </div>
  );
};