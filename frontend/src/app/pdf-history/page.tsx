"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// A more generic interface for combined logs
interface LogItem {
  filename: string;
  timestamp: string;
  summary: string;
  type: 'PDF' | 'CSV'; // The new type field from the backend
  ai_classification?: string | string[]; // Can be a string or an array
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCombinedLogs = async () => {
      try {
        // ✅ Call the single endpoint that combines PDF and CSV logs
        const res = await fetch("/api/main/dashboard_summaries");
        if (!res.ok) throw new Error("Failed to load summary history");
        
        const data = await res.json();
        setLogs(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchCombinedLogs();
  }, []);

  return (
    <div className="p-6">
      {/* ✅ Updated title */}
      <h1 className="text-xl font-semibold mb-4">📄 Summary History</h1>

      {error ? (
        <p className="text-red-500">❌ {error}</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400">No results found.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log, idx) => (
            <div
              key={`${log.filename}-${idx}`}
              className="border border-gray-600 rounded-lg p-4 bg-gray-800 shadow hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {/* ✅ Display a tag for the log type */}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      log.type === 'PDF' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
                    }`}>
                      {log.type}
                    </span>
                    <h2 className="text-sm font-bold text-white">
                      {log.filename}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/pdf-detail/${encodeURIComponent(log.filename)}`}
                  className="text-blue-400 text-sm hover:underline flex-shrink-0 ml-4"
                >
                  View Details →
                </Link>
              </div>
              {log.summary && (
                <p className="text-sm text-gray-300 mt-2 italic line-clamp-3 border-t border-gray-700 pt-2">
                  {log.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}