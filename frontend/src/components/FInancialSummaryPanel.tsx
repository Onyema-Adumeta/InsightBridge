"use client";

import { FileText, Zap, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";

interface Summary {
  summary: string;
  ai_advice: string;
}

interface PredictiveInsight {
  title?: string;
  text: string;
  suggestion?: string;
}

interface PredictiveAnalysis {
  forecast?: string;
  insights?: PredictiveInsight[];
}

interface FinancialSummaryPanelProps {
  summaries?: Summary[];
  predictiveAnalysis?: PredictiveAnalysis;
}

export default function FinancialSummaryPanel({ 
  summaries, 
  predictiveAnalysis 
}: FinancialSummaryPanelProps) {
  // Parse summary into sections
  const parseSummary = (text: string) => {
    const sections = text.split('\n\n').filter(s => s.trim());
    return sections.map(section => {
      const lines = section.split('\n');
      const title = lines[0]?.includes('---') ? lines[0].replace(/-/g, '').trim() : null;
      const content = title ? lines.slice(2).join('\n') : section;
      return { title, content };
    });
  };

  const summaryContent = summaries?.[0]?.summary;
  const aiAdvice = summaries?.[0]?.ai_advice;
  const sections = summaryContent ? parseSummary(summaryContent) : [];

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {summaryContent && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-slate-700/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl ring-2 ring-indigo-500/30">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Executive Summary</h3>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                {section.title && (
                  <h4 className="text-base font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-700/50 pb-2">
                    {section.title}
                  </h4>
                )}
                <div className="text-slate-300 text-[15px] leading-relaxed space-y-2">
                  {section.content.split('\n').map((line, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {aiAdvice && (
            <div className="m-6 mt-0 p-6 bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-yellow-900/20 border border-amber-500/40 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/20 rounded-lg ring-2 ring-amber-500/30">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="text-base font-bold text-amber-300">AI-Powered Recommendations</h4>
              </div>
              <div className="text-amber-100/95 text-[15px] leading-relaxed space-y-2">
                {aiAdvice.split('\n').filter(line => line.trim()).map((line, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Predictive Analysis */}
      {predictiveAnalysis && (predictiveAnalysis.forecast || predictiveAnalysis.insights?.length) && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-b border-slate-700/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl ring-2 ring-blue-500/30">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Forecast & Predictions</h3>
            </div>
          </div>
          
          <div className="p-6 space-y-5">
            {predictiveAnalysis.forecast && (
              <div className="text-slate-300 text-[15px] leading-relaxed">
                {predictiveAnalysis.forecast.split('\n').map((line, i) => (
                  <p key={i} className="whitespace-pre-line mb-2">
                    {line}
                  </p>
                ))}
              </div>
            )}
            
            {predictiveAnalysis.insights && predictiveAnalysis.insights.length > 0 && (
              <div className="space-y-4 mt-5">
                {predictiveAnalysis.insights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className="group p-5 bg-slate-900/60 rounded-xl border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-900/80 transition-all duration-200"
                  >
                    {insight.title && (
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <h4 className="font-semibold text-blue-300 text-base">
                          {insight.title}
                        </h4>
                      </div>
                    )}
                    <p className="text-slate-400 text-[15px] leading-relaxed ml-8">
                      {insight.text}
                    </p>
                    {insight.suggestion && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50 ml-8">
                        <div className="flex items-start gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                          <Lightbulb className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <p className="text-green-300 text-sm leading-relaxed">
                            {insight.suggestion}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}