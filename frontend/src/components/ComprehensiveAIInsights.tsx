// ComprehensiveAIInsights.tsx
// This displays ALL the detailed AI analysis data

import { useState } from 'react';
import { 
  Brain, TrendingUp, Lightbulb, Shield, AlertTriangle, 
  Target, CheckCircle, Clock, ChevronDown, ChevronUp,
  BarChart3, Info, Zap
} from 'lucide-react';

interface AIAnalysisData {
  overview?: string;
  keyFindings?: Array<{
    title: string;
    summary: string;
    severity?: string;
    recommendation?: string;
    metric_focus?: string;
    kpi_refs?: string[];
  }>;
  quantitative?: Array<{
    metric: string;
    value: string;
    interpretation: string;
    benchmark?: string;
    trend?: string;
    context?: string;
  }>;
  qualitative?: Array<{
    category: string;
    insight: string;
    implication: string;
    supporting_data?: string;
  }>;
  recommendations?: Array<{
    priority: string;
    category: string;
    title: string;
    description: string;
    actions?: string[];
    expected_impact?: string;
    timeline?: string;
  }>;
  risks?: Array<{
    level: string;
    category: string;
    description: string;
    mitigation?: string;
    indicators?: string;
    probability?: string;
    impact?: string;
  }>;
  nextSteps?: string[];
}

interface ComprehensiveAIInsightsProps {
  analysisData: AIAnalysisData;
}

export default function ComprehensiveAIInsights({ analysisData }: ComprehensiveAIInsightsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'quantitative' | 'qualitative' | 'recommendations' | 'risks'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Brain, count: 1 },
    { id: 'quantitative', label: 'Metrics', icon: BarChart3, count: analysisData.quantitative?.length || 0 },
    { id: 'qualitative', label: 'Insights', icon: Lightbulb, count: analysisData.qualitative?.length || 0 },
    { id: 'recommendations', label: 'Actions', icon: Target, count: analysisData.recommendations?.length || 0 },
    { id: 'risks', label: 'Risks', icon: Shield, count: analysisData.risks?.length || 0 },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Comprehensive AI Analysis</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Deep financial insights powered by advanced AI
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="prose prose-slate max-w-none">
            {analysisData.overview ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Executive Summary
                  </h3>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {analysisData.overview}
                  </div>
                </div>

                {/* Key Findings */}
                {analysisData.keyFindings && analysisData.keyFindings.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      Key Findings ({analysisData.keyFindings.length})
                    </h3>
                    <div className="space-y-3">
                      {analysisData.keyFindings.map((finding, idx) => (
                        <div
                          key={idx}
                          className={`border-l-4 ${
                            finding.severity === 'critical' ? 'border-red-500 bg-red-50' :
                            finding.severity === 'warning' ? 'border-amber-500 bg-amber-50' :
                            'border-green-500 bg-green-50'
                          } p-4 rounded-r-lg`}
                        >
                          <h4 className="font-semibold text-slate-900 mb-2">{finding.title}</h4>
                          <p className="text-sm text-slate-700 mb-2">{finding.summary}</p>
                          {finding.recommendation && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-1">💡 Recommendation:</p>
                              <p className="text-sm text-slate-700">{finding.recommendation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {analysisData.nextSteps && analysisData.nextSteps.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      Immediate Next Steps
                    </h3>
                    <ol className="space-y-3">
                      {analysisData.nextSteps.map((step, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-slate-700 flex-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-600 text-center py-8">No overview available</p>
            )}
          </div>
        )}

        {/* Quantitative Tab */}
        {activeTab === 'quantitative' && (
          <div className="space-y-4">
            {analysisData.quantitative && analysisData.quantitative.length > 0 ? (
              analysisData.quantitative.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900">{item.metric}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-indigo-600">{item.value}</span>
                        {item.trend && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.trend === 'positive' ? 'bg-green-100 text-green-700' :
                            item.trend === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.trend}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 mb-2">Interpretation:</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.interpretation}</p>
                    </div>
                    {item.context && (
                      <div className="bg-white rounded p-3 border border-slate-200">
                        <p className="text-sm font-semibold text-slate-600 mb-1">Context:</p>
                        <p className="text-sm text-slate-700">{item.context}</p>
                      </div>
                    )}
                    {item.benchmark && (
                      <div className="bg-indigo-50 rounded p-3 border border-indigo-200">
                        <p className="text-sm font-semibold text-indigo-900 mb-1">📊 Benchmark:</p>
                        <p className="text-sm text-indigo-800">{item.benchmark}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600 text-center py-8">No quantitative insights available</p>
            )}
          </div>
        )}

        {/* Qualitative Tab */}
        {activeTab === 'qualitative' && (
          <div className="space-y-4">
            {analysisData.qualitative && analysisData.qualitative.length > 0 ? (
              analysisData.qualitative.map((item, idx) => (
                <div key={idx} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-5">
                  <h4 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    {item.category}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-purple-700 mb-2">Key Insight:</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.insight}</p>
                    </div>
                    <div className="bg-white/70 rounded p-3">
                      <p className="text-sm font-semibold text-purple-700 mb-2">Strategic Implication:</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.implication}</p>
                    </div>
                    {item.supporting_data && (
                      <div className="text-xs text-purple-600 bg-purple-100 rounded p-2">
                        <strong>Supporting Data:</strong> {item.supporting_data}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600 text-center py-8">No qualitative insights available</p>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {analysisData.recommendations && analysisData.recommendations.length > 0 ? (
              analysisData.recommendations.map((rec, idx) => {
                const isExpanded = expandedSections.has(idx);
                return (
                  <div key={idx} className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden">
                    <button
                      onClick={() => toggleSection(idx)}
                      className="w-full p-5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(rec.priority)}`}>
                              {rec.priority?.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500">{rec.category}</span>
                          </div>
                          <h4 className="font-semibold text-slate-900 text-lg">{rec.title}</h4>
                          <p className="text-sm text-slate-600 mt-2">{rec.description}</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                        {rec.actions && rec.actions.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Action Steps:</p>
                            <ol className="space-y-2">
                              {rec.actions.map((action, actionIdx) => (
                                <li key={actionIdx} className="flex gap-2 text-sm text-slate-700">
                                  <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">
                                    {actionIdx + 1}
                                  </span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {rec.expected_impact && (
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <p className="text-sm font-semibold text-green-900 mb-1">Expected Impact:</p>
                            <p className="text-sm text-green-800">{rec.expected_impact}</p>
                          </div>
                        )}
                        {rec.timeline && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm font-semibold text-blue-900 mb-1">Timeline:</p>
                            <p className="text-sm text-blue-800">{rec.timeline}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-slate-600 text-center py-8">No recommendations available</p>
            )}
          </div>
        )}

        {/* Risks Tab */}
        {activeTab === 'risks' && (
          <div className="space-y-4">
            {analysisData.risks && analysisData.risks.length > 0 ? (
              analysisData.risks.map((risk, idx) => (
                <div key={idx} className={`rounded-lg border-2 overflow-hidden ${
                  risk.level === 'critical' || risk.level === 'high' 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-yellow-300 bg-yellow-50'
                }`}>
                  <div className={`px-5 py-4 ${
                    risk.level === 'critical' || risk.level === 'high'
                      ? 'bg-red-100 border-b border-red-200'
                      : 'bg-yellow-100 border-b border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 ${
                          risk.level === 'critical' || risk.level === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                        {risk.category}
                      </h4>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          risk.level === 'critical' ? 'bg-red-200 text-red-900' :
                          risk.level === 'high' ? 'bg-orange-200 text-orange-900' :
                          'bg-yellow-200 text-yellow-900'
                        }`}>
                          {risk.level?.toUpperCase()}
                        </span>
                        {risk.probability && (
                          <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-semibold">
                            {risk.probability}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-4 bg-white">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Risk Description:</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{risk.description}</p>
                    </div>
                    {risk.mitigation && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <p className="text-sm font-semibold text-green-900 mb-2">🛡️ Mitigation Strategies:</p>
                        <p className="text-sm text-green-800 leading-relaxed">{risk.mitigation}</p>
                      </div>
                    )}
                    {risk.indicators && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm font-semibold text-blue-900 mb-2">📊 Early Warning Indicators:</p>
                        <p className="text-sm text-blue-800 leading-relaxed">{risk.indicators}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600 text-center py-8">No risks identified</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}