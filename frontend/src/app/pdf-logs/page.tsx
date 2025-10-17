"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PdfLog {
  id: number;
  filename: string;
  summary_snippet: string;
  timestamp: string;
  ai_advice?: string;
  blob_url?: string;
  file_type?: string;
  net_income?: number;
  cash_flow_ops?: number;
}

export default function PdfLogsPage() {
  const [logs, setLogs] = useState<PdfLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${apiBase}/pdf_logs`);
        if (!res.ok) throw new Error("Failed to fetch PDF logs.");
        const data = await res.json();
        setLogs(data);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">📄 PDF Upload Logs</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-400">❌ {error}</p>}

      {logs.length === 0 && !loading && !error && (
        <p className="text-gray-400">No PDF logs found.</p>
      )}

      {logs.map((log) => (
        <div key={log.id} className="bg-gray-800 p-4 mb-4 rounded-xl shadow-md">
          <Link
            href={`/pdf-detail/${encodeURIComponent(log.filename)}`}
            className="text-lg font-semibold text-blue-400 hover:underline"
          >
            📎 {log.filename}
          </Link>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(log.timestamp).toLocaleDateString()}
          </p>
          <p className="text-sm mt-2 text-gray-300">
            {log.summary_snippet || "No preview available."}
          </p>
        </div>
      ))}
    </div>
  );
}
