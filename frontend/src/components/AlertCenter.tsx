"use client";

import React from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';

interface Alert {
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action: string;
}

interface AlertCenterProps {
  alerts?: Alert[];
}

const AlertCenter: React.FC<AlertCenterProps> = ({ alerts }) => {
  const defaultAlerts: Alert[] = [
    {
      severity: 'high',
      title: 'High Debt-to-Equity Ratio',
      message: 'Current ratio of 8.86 exceeds recommended threshold of 2.0',
      action: 'View Recommendations'
    },
    {
      severity: 'medium',
      title: 'Accounts Receivable Outstanding',
      message: '$51.3K outstanding - Consider following up on aging invoices',
      action: 'View Details'
    },
    {
      severity: 'low',
      title: 'Inventory Level Low',
      message: 'Current inventory at $150 - May need restocking soon',
      action: 'Review'
    }
  ];

  const displayAlerts = alerts || defaultAlerts;

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          icon: AlertTriangle,
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-900',
          badgeBg: 'bg-red-100',
          badgeText: 'text-red-700'
        };
      case 'medium':
        return {
          icon: AlertCircle,
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          iconColor: 'text-orange-600',
          textColor: 'text-orange-900',
          badgeBg: 'bg-orange-100',
          badgeText: 'text-orange-700'
        };
      default:
        return {
          icon: Info,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-900',
          badgeBg: 'bg-blue-100',
          badgeText: 'text-blue-700'
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">⚠️ Attention Required</h3>
        <span className="text-xs text-slate-500">{displayAlerts.length} alerts</span>
      </div>
      
      <div className="space-y-3">
        {displayAlerts.map((alert, idx) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;
          
          return (
            <div
              key={idx}
              className={`${config.bg} ${config.border} border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer group`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.iconColor} mt-0.5 flex-shrink-0`} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-sm font-semibold ${config.textColor}`}>
                      {alert.title}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText} font-medium uppercase`}>
                      {alert.severity}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2">
                    {alert.message}
                  </p>
                  
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                    {alert.action}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-4 text-sm text-slate-600 hover:text-slate-900 font-medium py-2 hover:bg-slate-50 rounded-lg transition-colors">
        View All Alerts →
      </button>
    </div>
  );
};

export default AlertCenter;
