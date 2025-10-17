"use client";

import { useEffect, useState } from "react";
import EnvCheck from "@/components/env-check";
import {
  extractFinancialInsights,
  getInsightBadge,
  extractKPIs,
} from "@/utils/parseInsights";

interface UploadLog {
  id: number; // ✅ Add ID
  filename: string;
  summary_snippet: string;
  timestamp: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<UploadLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        console.log("🌐 Loaded API URL:", apiBase);
        const res = await fetch(`${apiBase}/csv_summaries`);
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        const data = await res.json();
        setHistory(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <EnvCheck />

      <h1 className="text-2xl font-bold mb-4">📄 Upload History</h1>

      {error && (
        <p className="text-red-500 mb-4">
          ❌ Server responded with <strong>{error}</strong>
        </p>
      )}

      {history.length === 0 && !error && (
        <p className="text-gray-400 italic">No uploads found.</p>
      )}

      <ul className="space-y-4">
        {history.map((log, index) => {
          const insights = extractFinancialInsights(log.summary_snippet);
          const kpis = extractKPIs(log.summary_snippet);

          return (
            <li key={index} className="bg-gray-800 p-4 rounded shadow">
              <p className="font-semibold">📄 {log.filename}</p>
              <p className="text-sm text-gray-400">
                🕓 {new Date(log.timestamp).toLocaleString()}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{log.summary_snippet}</p>

              <a
                href={`/csv-logs/${log.id}`}
                className="text-blue-400 underline hover:text-blue-300 text-sm mt-2 inline-block"
              >
                🔍 View Full Summary
              </a>

              {insights.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="font-semibold mt-2 mb-1">🧠 AI-Detected Insights:</p>
                  <ul className="list-disc list-inside space-y-1 text-green-300">
                    {insights.map((line, i) => (
                      <li key={i}>
                        <span className="mr-2">{getInsightBadge(line)}</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(kpis.revenue || kpis.expenses || kpis.netIncome) && (
                <div className="mt-4 text-sm text-cyan-200">
                  <p className="font-semibold">📊 Key Financials:</p>
                  {kpis.revenue && <p>💰 Revenue: ${kpis.revenue.toLocaleString()}</p>}
                  {kpis.expenses && <p>💸 Expenses: ${kpis.expenses.toLocaleString()}</p>}
                  {kpis.netIncome && <p>📈 Net Income: ${kpis.netIncome.toLocaleString()}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
