"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { saveAs } from "file-saver";

export default function CSVDetailPage() {
  const params = useParams();
  const param = params?.param as string;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!param) return;

    const isNumericId = /^\d+$/.test(param); // true if only digits

    const fetchSummary = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const endpoint = isNumericId
          ? `${apiBase}/csv_summary_by_id?id=${param}`
          : `${apiBase}/csv_summary_by_filename?filename=${encodeURIComponent(param)}`;

        const res = await fetch(endpoint);

        if (!res.ok) {
          if (res.status === 404) {
            setError("Summary not found.");
          } else if (res.status === 422) {
            setError("Invalid format or unsupported characters.");
          } else {
            throw new Error(`Server responded with ${res.status}`);
          }
          return;
        }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Error loading summary");
      }
    };

    fetchSummary();
  }, [param]);

  const handleExport = (format: "json" | "csv") => {
    if (!data) return;
    const filenameBase = data.filename?.replace(/\.[^/.]+$/, "") || "summary";

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      saveAs(blob, `${filenameBase}.json`);
    } else {
      const flat = {
        filename: data.filename,
        total_txns: data.total_txns,
        total_amount: data.total_amount,
        summary: data.summary?.replace(/\n/g, " "),
        timestamp: data.timestamp,
        ...data.kpis,
      };

      const csvHeader = Object.keys(flat).join(",");
      const csvRow = Object.values(flat).map(v => `"${v}"`).join(",");
      const blob = new Blob([`${csvHeader}\n${csvRow}`], { type: "text/csv;charset=utf-8" });
      saveAs(blob, `${filenameBase}.csv`);
    }
  };

  if (error) {
    return (
      <div className="p-6 text-red-400 bg-gray-800 rounded max-w-2xl mx-auto mt-4">
        ❌ {error}
        <p className="mt-2 text-sm text-gray-400">
          Please check the input or return to the{" "}
          <a href="/csv-logs" className="text-blue-400 underline">
            CSV Logs
          </a>{" "}
          page.
        </p>
      </div>
    );
  }

  if (!data) {
    return <p className="p-6 text-yellow-300">⏳ Loading...</p>;
  }

  const summary = data.summary_text || data.summary;

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <a href="/csv-logs" className="text-blue-400 hover:underline text-sm mb-4 inline-block">
        ← Back to CSV Logs
      </a>

      <h1 className="text-2xl font-bold mb-4">📄 Full Summary for: {data.filename}</h1>

      <p className="text-gray-400 text-sm mb-2">
        🕓 Uploaded: {new Date(data.timestamp).toLocaleString()}
      </p>
      <p className="mb-2">📊 Total Transactions: {data.total_txns}</p>
      <p className="mb-2">💰 Total Amount: ${data.total_amount?.toLocaleString()}</p>

      {data.top_merchants && (
        <p className="mb-2">🏷️ Top Merchants: {data.top_merchants}</p>
      )}

      {data.kpis && (
        <div className="text-xs text-gray-300 mb-2 space-y-1">
          <h3 className="text-sm font-semibold">📈 KPIs:</h3>
          {Object.entries(data.kpis).map(([key, value]) => (
            <div key={key}>
              <strong>{key.replace(/_/g, " ")}:</strong> {value.toLocaleString()}
            </div>
          ))}
        </div>
      )}

      {data.ai_classification?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold">🔖 Tags:</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {data.ai_classification.map((tag: string, i: number) => (
              <span
                key={i}
                className="text-xs bg-purple-900 text-purple-200 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.ai_advice && (
        <div className="mb-4 bg-gray-700 p-4 rounded">
          <h3 className="text-sm font-semibold mb-1">💡 AI Advice:</h3>
          <p className="text-sm text-green-300 whitespace-pre-wrap">{data.ai_advice}</p>
        </div>
      )}

      {data.blob_url && (
        <a
          href={data.blob_url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        >
          ⬇️ Download CSV
        </a>
      )}

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => handleExport("json")}
          className="bg-blue-700 px-4 py-2 text-white rounded hover:bg-blue-800"
        >
          Export JSON
        </button>
        <button
          onClick={() => handleExport("csv")}
          className="bg-emerald-700 px-4 py-2 text-white rounded hover:bg-emerald-800"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded prose dark:prose-invert max-w-none">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}
