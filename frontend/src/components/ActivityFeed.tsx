"use client";

import React from 'react';
import { FileText, CheckCircle, TrendingUp, Bell, Upload, BarChart3 } from 'lucide-react';

interface Activity {
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  type: 'upload' | 'analysis' | 'update' | 'alert';
}

interface ActivityFeedProps {
  activities?: Activity[];
  latestFileName?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, latestFileName }) => {
  const getDefaultActivities = (): Activity[] => [
    {
      icon: '📄',
      title: 'Report Uploaded',
      subtitle: latestFileName || 'Financial statement processed',
      time: 'Just now',
      type: 'upload'
    },
    {
      icon: '✅',
      title: 'Analysis Complete',
      subtitle: 'Financial health score: 80/100',
      time: '2 minutes ago',
      type: 'analysis'
    },
    {
      icon: '📊',
      title: 'Benchmark Updated',
      subtitle: 'Industry comparison data refreshed',
      time: '1 hour ago',
      type: 'update'
    },
    {
      icon: '🎯',
      title: 'KPI Target Set',
      subtitle: 'Revenue target: $150K for next quarter',
      time: '3 hours ago',
      type: 'alert'
    },
    {
      icon: '💡',
      title: 'Insight Generated',
      subtitle: 'New recommendation: Reduce debt ratio',
      time: '5 hours ago',
      type: 'alert'
    }
  ];

  const displayActivities = activities || getDefaultActivities();

  const getIconComponent = (type: string) => {
    switch (type) {
      case 'upload':
        return Upload;
      case 'analysis':
        return CheckCircle;
      case 'update':
        return TrendingUp;
      case 'alert':
        return Bell;
      default:
        return BarChart3;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'upload':
        return 'bg-blue-100 text-blue-600';
      case 'analysis':
        return 'bg-green-100 text-green-600';
      case 'update':
        return 'bg-purple-100 text-purple-600';
      case 'alert':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">📋 Recent Activity</h3>
        <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {displayActivities.map((activity, idx) => {
          const IconComponent = getIconComponent(activity.type);
          const colorClass = getTypeColor(activity.type);
          
          return (
            <div
              key={idx}
              className="flex items-start gap-3 group hover:bg-slate-50 -mx-2 px-2 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <div className={`${colorClass} p-2 rounded-lg flex-shrink-0`}>
                <IconComponent className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {activity.title}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 truncate">
                  {activity.subtitle}
                </p>
              </div>
              
              <span className="text-xs text-slate-500 flex-shrink-0">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-200">
        <button className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium py-2 hover:bg-slate-50 rounded-lg transition-colors">
          Load More Activity →
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;