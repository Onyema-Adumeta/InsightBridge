"use client";

import { useEffect, useState } from "react";
import { Clock, FileText } from "lucide-react";

interface HistoryEntry {
  filename: string;
  summary_snippet: string;
  timestamp: string;
}

export default function HistoryTimeline() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/pdf_summaries`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="mt-12 p-6 bg-white dark:bg-gray-900 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">📚 Timeline of Summarized Files</h2>

      {loading ? (
        <p>Loading...</p>
      ) : history.length === 0 ? (
        <p>No history found.</p>
      ) : (
        <ol className="relative border-l border-gray-300 dark:border-gray-700">
          {history.map((entry, idx) => (
            <li key={idx} className="mb-10 ml-4">
              <div className="absolute w-3 h-3 bg-blue-500 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-900"></div>
              <time className="mb-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(entry.timestamp).toLocaleString()}
              </time>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                <FileText className="w-5 h-5 text-blue-500" />
                {entry.filename}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">
                {entry.summary_snippet}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
