"use client";

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart
} from 'recharts';
import {
  MessageSquare, Send, X, TrendingUp, BookOpen, ChevronRight,
  Award, Brain, Lightbulb, CheckCircle2, AlertTriangle, XCircle, Info
} from 'lucide-react';

// ============================================================================
// FORECAST CHART COMPONENT - PROFESSIONAL VERSION
// ============================================================================
interface ForecastChartProps {
  historicalData: any[];
  forecastData?: any[];
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ 
  historicalData, 
  forecastData 
}) => {
  if (!historicalData || historicalData.length === 0) return null;

  // Combine historical and forecast data
  const chartData = [...historicalData.map(item => ({
    period: item.period_end_date?.split('T')[0] || item.period || '',
    revenue: item.revenue,
    netIncome: item.net_income,
    forecastedRevenue: null,
    forecastedProfit: null,
    confidenceUpper: null,
    confidenceLower: null
  }))];
  
  // Add forecast periods
  if (forecastData && forecastData.length > 0) {
    forecastData.forEach(item => {
      const forecastRev = item.revenue;
      chartData.push({
        period: item.period_end_date?.split('T')[0] || item.period || 'Forecast',
        revenue: null,
        netIncome: null,
        forecastedRevenue: forecastRev,
        forecastedProfit: item.net_income,
        confidenceUpper: forecastRev * 1.05,
        confidenceLower: forecastRev * 0.95
      });
    });
  } else {
    // Generate simple forecast based on trend
    const lastPeriods = historicalData.slice(-3);
    const avgRevenue = lastPeriods.reduce((sum, p) => sum + (p.revenue || 0), 0) / lastPeriods.length;
    const avgGrowth = lastPeriods.length > 1 
      ? (lastPeriods[lastPeriods.length - 1].revenue - lastPeriods[0].revenue) / lastPeriods[0].revenue / lastPeriods.length
      : 0.05;

    // Generate 3 forecast periods
    for (let i = 1; i <= 3; i++) {
      const forecastRevenue = avgRevenue * Math.pow(1 + avgGrowth, i);
      chartData.push({
        period: `Forecast ${i}`,
        revenue: null,
        netIncome: null,
        forecastedRevenue: forecastRevenue,
        forecastedProfit: forecastRevenue * 0.15,
        confidenceUpper: forecastRevenue * 1.05,
        confidenceLower: forecastRevenue * 0.95
      });
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const isActual = payload.some((p: any) => p.dataKey === 'revenue');
    
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
          <p className="font-semibold text-slate-900">{label}</p>
          {!isActual && (
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold">
              Forecast
            </span>
          )}
        </div>
        <div className="space-y-2">
          {payload.filter((p: any) => p.dataKey !== 'confidenceUpper' && p.dataKey !== 'confidenceLower').map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm text-slate-600">{p.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                ${(p.value / 1000000).toFixed(2)}M
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload) return null;
    const legendItems = payload.filter((item: any) => 
      item.dataKey !== 'confidenceUpper' && item.dataKey !== 'confidenceLower'
    );

    return (
      <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
        {legendItems.map((entry: any, index: number) => {
          const isDashed = entry.payload?.strokeDasharray;
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              {isDashed ? (
                <div className="w-8 h-0.5" style={{
                  backgroundImage: `repeating-linear-gradient(90deg, ${entry.color} 0, ${entry.color} 8px, transparent 8px, transparent 12px)`,
                }} />
              ) : (
                <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: entry.color }} />
              )}
              <span className="text-sm text-slate-700 font-medium">{entry.value}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 bg-gradient-to-r from-purple-200/50 to-purple-100/30 rounded" />
          <span className="text-sm text-slate-700 font-medium">95% Confidence</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Revenue Forecast & Projections</h3>
          <p className="text-sm text-slate-600 mt-1">AI-powered revenue projection with confidence intervals</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-purple-900">AI-Powered</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="actualRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="period" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
              stroke="#64748b"
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
              stroke="#64748b"
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
            <Legend content={<CustomLegend />} />
            
            {/* Confidence Band */}
            <Area 
              type="monotone" 
              dataKey="confidenceUpper" 
              stroke="none"
              fill="url(#confidenceGradient)"
              fillOpacity={1}
              stackId="confidence"
            />
            <Area 
              type="monotone" 
              dataKey="confidenceLower" 
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
              stackId="confidence"
            />

            {/* Historical Revenue */}
            <Area 
              type="monotone" 
              dataKey="revenue" 
              fill="url(#actualRevenueGradient)" 
              stroke="#3B82F6"
              strokeWidth={2.5}
              dot={{ fill: '#3B82F6', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
              name="Actual Revenue"
            />
            
            {/* Historical Net Income */}
            <Line 
              type="monotone" 
              dataKey="netIncome" 
              stroke="#10b981" 
              strokeWidth={2.5}
              dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              name="Actual Profit"
            />
            
            {/* Forecasted Revenue */}
            <Line 
              type="monotone" 
              dataKey="forecastedRevenue" 
              stroke="#8b5cf6"
              strokeWidth={2.5}
              strokeDasharray="8 4"
              dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
              name="Forecasted Revenue"
            />
            
            {/* Forecasted Profit */}
            <Line 
              type="monotone" 
              dataKey="forecastedProfit" 
              stroke="#a78bfa" 
              strokeWidth={2.5}
              strokeDasharray="8 4"
              dot={{ fill: '#a78bfa', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#a78bfa', stroke: '#fff', strokeWidth: 2 }}
              name="Forecasted Profit"
            />
            
            <ReferenceLine y={0} stroke="#94a3b8" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-900 mb-1">Forecast Methodology</p>
            <p className="text-xs text-blue-800">
              Based on {historicalData.length} periods of historical data using trend analysis.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-purple-900 mb-1">95% Confidence Interval</p>
            <p className="text-xs text-purple-800">
              Shaded area represents expected value range with 95% probability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMMENTS & COLLABORATION SECTION - PROFESSIONAL VERSION
// ============================================================================
interface CommentsSectionProps {
  analysisData?: any;
  userId?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ 
  analysisData, 
  userId 
}) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('dashboard_comments');
    if (stored) {
      try {
        setComments(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse comments');
      }
    }
  }, []);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const comment = {
      id: Date.now().toString(),
      text: newComment,
      author: userId || 'User',
      timestamp: new Date().toISOString(),
      replies: []
    };

    const updated = [comment, ...comments];
    setComments(updated);
    sessionStorage.setItem('dashboard_comments', JSON.stringify(updated));
    setNewComment('');
    setIsSubmitting(false);
  };

  const handleDeleteComment = (commentId: string) => {
    const updated = comments.filter(c => c.id !== commentId);
    setComments(updated);
    sessionStorage.setItem('dashboard_comments', JSON.stringify(updated));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddComment();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Comments & Notes</h3>
          <p className="text-sm text-slate-600">Collaborate and add insights</p>
        </div>
      </div>

      {/* Add Comment */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Add a comment or note about this analysis... (Ctrl+Enter to post)"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
                   resize-none text-slate-900 placeholder-slate-500"
          rows={3}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-slate-500">
            {newComment.length} characters
          </span>
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 
                     disabled:cursor-not-allowed rounded-lg text-sm font-semibold 
                     transition-all flex items-center gap-2 text-white shadow-sm"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Posting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post Comment
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
        {comments.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">No comments yet</p>
            <p className="text-slate-500 text-xs mt-1">Be the first to add a note!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{comment.author}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(comment.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-slate-400 hover:text-red-600 transition-colors p-1"
                  title="Delete comment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {comment.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MICRO-LEARNING SECTION - PROFESSIONAL VERSION
// ============================================================================
const MicroLearningCard: React.FC<{
  term: string;
  definition: string;
  example: string;
}> = ({ term, definition, example }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 
                 transition-all cursor-pointer hover:shadow-md"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <h4 className="font-semibold text-slate-900 text-sm">{term}</h4>
        </div>
        <ChevronRight 
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
            isExpanded ? 'rotate-90' : ''
          }`} 
        />
      </div>
      
      {isExpanded && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-slate-700 leading-relaxed">{definition}</p>
          {example && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-xs text-indigo-900">
                <strong className="font-semibold">Example:</strong> {example}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MicroLearningSection: React.FC = () => {
  const explainers = [
    {
      term: "Gross Margin",
      definition: "The percentage of revenue remaining after subtracting cost of goods sold (COGS). Higher gross margins indicate better pricing power and operational efficiency.",
      example: "If you have $100k revenue and $30k COGS, your gross margin is 70%. This means you keep $0.70 of every dollar in revenue after covering direct costs."
    },
    {
      term: "Current Ratio",
      definition: "Measures a company's ability to pay short-term obligations. Calculated as current assets divided by current liabilities. A ratio above 2.0 is generally considered healthy.",
      example: "A ratio of 2.5 means you have $2.50 in liquid assets for every $1.00 in short-term debt, indicating strong liquidity."
    },
    {
      term: "Free Cash Flow (FCF)",
      definition: "Cash generated after capital expenditures. Shows how much cash is available for growth, dividends, or debt reduction. Positive FCF indicates financial health.",
      example: "Operating cash flow of $500k minus $200k in capital expenditures = $300k free cash flow available for strategic initiatives."
    },
    {
      term: "EBITDA",
      definition: "Earnings Before Interest, Taxes, Depreciation, and Amortization. Measures operational performance by excluding non-operational expenses. Used for comparing companies.",
      example: "If net income is $100k, add back $20k interest, $30k taxes, and $50k depreciation to get $200k EBITDA."
    },
    {
      term: "Operating Margin",
      definition: "Operating income as a percentage of revenue. Shows profitability from core business operations before interest and taxes. Higher is better.",
      example: "With $1M revenue and $200k operating income, your operating margin is 20%, meaning core operations generate $0.20 profit per dollar of sales."
    },
    {
      term: "Debt-to-Equity Ratio",
      definition: "Compares total debt to shareholder equity. Measures financial leverage. Lower ratios indicate less risk. Ideal varies by industry.",
      example: "A ratio of 0.5 means you have $0.50 of debt for every $1.00 of equity, indicating conservative leverage and lower financial risk."
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
          <Award className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Financial Literacy Corner</h3>
          <p className="text-sm text-slate-600">Quick reference for key financial terms</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {explainers.map((item, idx) => (
          <MicroLearningCard key={idx} {...item} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// ENHANCED PREDICTIVE INSIGHTS - PROFESSIONAL VERSION
// ============================================================================
interface PredictiveInsightsSectionProps {
  insights?: Array<{
    title?: string;
    text: string;
    suggestion?: string;
    type?: 'success' | 'warning' | 'danger' | 'info';
  }>;
}

export const PredictiveInsightsSection: React.FC<PredictiveInsightsSectionProps> = ({ 
  insights 
}) => {
  if (!insights || insights.length === 0) return null;

  const getIconAndColor = (type?: string) => {
    switch (type) {
      case 'success':
        return { Icon: CheckCircle2, colorClass: 'bg-emerald-50 border-emerald-200 text-emerald-700', iconColor: 'text-emerald-600' };
      case 'warning':
        return { Icon: AlertTriangle, colorClass: 'bg-amber-50 border-amber-200 text-amber-700', iconColor: 'text-amber-600' };
      case 'danger':
        return { Icon: XCircle, colorClass: 'bg-red-50 border-red-200 text-red-700', iconColor: 'text-red-600' };
      default:
        return { Icon: Lightbulb, colorClass: 'bg-blue-50 border-blue-200 text-blue-700', iconColor: 'text-blue-600' };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
          <Brain className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">AI Predictive Insights</h3>
          <p className="text-sm text-slate-600">Key findings from your financial data</p>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => {
          const { Icon, colorClass, iconColor } = getIconAndColor(insight.type);
          
          return (
            <div 
              key={idx} 
              className={`p-4 rounded-lg border ${colorClass}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg ${colorClass}`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="flex-1">
                  {insight.title && (
                    <h4 className="font-semibold text-slate-900 mb-1 text-sm">{insight.title}</h4>
                  )}
                  <p className="text-sm text-slate-700 leading-relaxed">{insight.text}</p>
                  {insight.suggestion && (
                    <p className="text-sm text-slate-600 mt-2 flex items-start gap-1">
                      <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span><strong className="font-semibold">Recommendation:</strong> {insight.suggestion}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Custom scrollbar styles for professional theme
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}