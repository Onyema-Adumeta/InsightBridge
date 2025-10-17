"use client";

import React from 'react';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface Ratio {
  label: string;
  value: string;
  benchmark: string;
  status: 'excellent' | 'good' | 'fair' | 'warning' | 'poor';
}

interface KeyRatiosCardProps {
  ratios?: Ratio[];
  balanceSheetData?: any;
}

const KeyRatiosCard: React.FC<KeyRatiosCardProps> = ({ ratios, balanceSheetData }) => {
  const getDefaultRatios = (): Ratio[] => {
    if (balanceSheetData) {
      const currentRatio = balanceSheetData.currentRatio || 0;
      const quickRatio = balanceSheetData.quickRatio || 0;
      const debtToEquity = balanceSheetData.debtToEquity || 0;
      
      return [
        {
          label: 'Current Ratio',
          value: currentRatio.toFixed(2),
          benchmark: '2.0+',
          status: currentRatio >= 2 ? 'excellent' : currentRatio >= 1.5 ? 'good' : currentRatio >= 1 ? 'fair' : 'warning'
        },
        {
          label: 'Quick Ratio',
          value: quickRatio.toFixed(2),
          benchmark: '1.0+',
          status: quickRatio >= 1.5 ? 'excellent' : quickRatio >= 1 ? 'good' : quickRatio >= 0.5 ? 'fair' : 'warning'
        },
        {
          label: 'D/E Ratio',
          value: debtToEquity.toFixed(2),
          benchmark: '<2.0',
          status: debtToEquity < 1 ? 'excellent' : debtToEquity < 2 ? 'good' : debtToEquity < 3 ? 'fair' : 'warning'
        },
        {
          label: 'Working Capital',
          value: `$${(balanceSheetData.workingCapital / 1000).toFixed(0)}K`,
          benchmark: 'Positive',
          status: balanceSheetData.workingCapital > 200000 ? 'excellent' : balanceSheetData.workingCapital > 0 ? 'good' : 'warning'
        }
      ];
    }
    
    return [
      { label: 'Current Ratio', value: '5.71', benchmark: '2.0+', status: 'excellent' },
      { label: 'Quick Ratio', value: '5.71', benchmark: '1.0+', status: 'excellent' },
      { label: 'D/E Ratio', value: '8.86', benchmark: '<2.0', status: 'warning' },
      { label: 'Working Capital', value: '$323.6K', benchmark: 'Positive', status: 'excellent' }
    ];
  };

  const displayRatios = ratios || getDefaultRatios();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'excellent':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-700'
        };
      case 'good':
        return {
          icon: CheckCircle,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-700'
        };
      case 'fair':
        return {
          icon: Info,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-700'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          badge: 'bg-orange-100 text-orange-700'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-700'
        };
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">📊 Key Financial Ratios</h3>
        <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          Details
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {displayRatios.map((ratio, idx) => {
          const config = getStatusConfig(ratio.status);
          const Icon = config.icon;
          
          return (
            <div
              key={idx}
              className={`${config.bg} ${config.border} border rounded-lg p-4 hover:shadow-sm transition-all`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  {ratio.label}
                </span>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {ratio.value}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Target: {ratio.benchmark}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge} font-medium capitalize`}>
                  {ratio.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-indigo-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Info className="w-4 h-4" />
          <span>Ratios compared to industry benchmarks</span>
        </div>
      </div>
    </div>
  );
};

export default KeyRatiosCard;
