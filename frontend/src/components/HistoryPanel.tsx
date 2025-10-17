"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, FileText } from "lucide-react";

interface HistoryEntry {
  id: number;
  filename: string;
  summary_snippet: string;
  timestamp: string;
}

export default function HistoryPanel() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/pdf_summaries`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("📜 History fetched:", data);
        setHistory(data);
      } catch (err) {
        console.error("❌ Failed to fetch history:", err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="mt-12 p-6 bg-white dark:bg-gray-900 rounded-xl shadow text-left w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        📚 Timeline of Summarized Files
      </h2>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-300">Loading...</p>
      ) : history && history.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No history found yet.</p>
      ) : (
        <ol className="relative border-l border-gray-300 dark:border-gray-700 ml-2">
          {history?.map((entry) => (
            <li key={entry.id} className="mb-10 ml-4">
              <div className="absolute w-3 h-3 bg-blue-500 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-900"></div>

              <time className="mb-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(entry.timestamp).toLocaleString()}
              </time>

              <Link href={`/pdf-detail/${entry.id}`}>
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  <FileText className="w-5 h-5" />
                  {entry.filename}
                </h3>
              </Link>

              <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-line">
                {entry.summary_snippet}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
