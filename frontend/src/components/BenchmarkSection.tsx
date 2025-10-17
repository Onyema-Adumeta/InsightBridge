"use client";
import React from 'react';

// Type definitions
interface BenchmarkValue {
  label: string;
  your_value: number;
  benchmark_value: number;
  difference?: number;
  performance_vs_benchmark?: string;
}

interface BenchmarkAnalysis {
  industry: string;
  benchmarks: Record<string, BenchmarkValue>;
}

interface BenchmarkSectionProps {
  benchmarkAnalysis: BenchmarkAnalysis | null;
}

// Individual Benchmark Card Component
const BenchmarkCard = ({ benchmark, metricKey }: { benchmark: BenchmarkValue; metricKey: string }) => {
  const isPositive = benchmark.your_value > benchmark.benchmark_value;
  const difference = benchmark.difference || (benchmark.your_value - benchmark.benchmark_value);
  
  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-300">{benchmark.label}</h4>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          isPositive 
            ? 'bg-green-900/50 text-green-400 border border-green-700' 
            : 'bg-red-900/50 text-red-400 border border-red-700'
        }`}>
          {isPositive ? 'Above Average' : 'Below Average'}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Your Performance:</span>
          <span className="text-white font-semibold">{benchmark.your_value.toFixed(1)}%</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Industry Average:</span>
          <span className="text-gray-300">{benchmark.benchmark_value.toFixed(1)}%</span>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Difference:</span>
            <span className={`font-bold ${
              difference > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {difference > 0 ? '+' : ''}{difference.toFixed(1)}pp
            </span>
          </div>
        </div>
        
        {/* Visual progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>0%</span>
            <span>Industry: {benchmark.benchmark_value.toFixed(1)}%</span>
            <span>100%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 relative">
            {/* Industry benchmark line */}
            <div 
              className="absolute top-0 w-0.5 h-2 bg-yellow-400"
              style={{ left: `${Math.min(benchmark.benchmark_value, 100)}%` }}
            ></div>
            {/* Your performance bar */}
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                isPositive ? 'bg-green-400' : 'bg-red-400'
              }`}
              style={{ width: `${Math.min(benchmark.your_value, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Benchmark Section Component
const BenchmarkSection = ({ benchmarkAnalysis }: BenchmarkSectionProps) => {
  if (!benchmarkAnalysis || !benchmarkAnalysis.benchmarks) {
    return null;
  }

  const benchmarkEntries = Object.entries(benchmarkAnalysis.benchmarks);
  
  if (benchmarkEntries.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <span className="mr-3 text-2xl">📊</span>
            Industry Benchmarks
          </h3>
          <div className="text-sm text-gray-400 bg-gray-900/50 px-3 py-1 rounded-full">
            {benchmarkAnalysis.industry}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benchmarkEntries.map(([key, benchmark]) => (
            <BenchmarkCard 
              key={key} 
              benchmark={benchmark} 
              metricKey={key}
            />
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <span className="text-blue-400 text-lg">💡</span>
            <div>
              <p className="text-sm text-blue-200 font-medium mb-1">Benchmark Insights</p>
              <p className="text-xs text-blue-300/80 leading-relaxed">
                These benchmarks compare your financial metrics against {benchmarkAnalysis.industry} industry averages. 
                Values above the industry average indicate stronger performance in that area.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenchmarkSection;