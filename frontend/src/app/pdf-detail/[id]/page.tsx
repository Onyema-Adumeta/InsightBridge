"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { saveAs } from "file-saver";

export default function PDFDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchSummary = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${apiBase}/pdf_summary_by_filename?filename=${encodeURIComponent(id)}`);
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Error loading summary");
      }
    };

    fetchSummary();
  }, [id]);

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
      <div className="p-6 text-red-500 bg-gray-800 rounded max-w-2xl mx-auto mt-4">
        ❌ {error}
        <p className="mt-2 text-sm text-gray-400">
          Please check the ID or return to the{" "}
          <a href="/pdf-logs" className="text-blue-400 underline">
            PDF Logs
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
      <a href="/pdf-logs" className="text-blue-400 hover:underline text-sm mb-4 inline-block">
        ← Back to PDF Logs
      </a>

      <h1 className="text-2xl font-bold mb-4">📄 Full Summary for: {data.filename}</h1>

      <p className="text-gray-400 text-sm mb-2">
        🕓 Uploaded: {new Date(data.timestamp).toLocaleString()}
      </p>

      {data.blob_url && (
        <a
          href={data.blob_url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        >
          ⬇️ Download Original PDF
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
        <button
          onClick={() =>
            window.open(
              `/api/export_pdf_summary_pdf?filename=${encodeURIComponent(
                data.filename
              )}`,
              "_blank"
            )
          }
          className="bg-purple-700 px-4 py-2 text-white rounded hover:bg-purple-800"
        >
          📤 Export Summary as PDF
        </button>
      </div>

      {data.ai_advice && (
        <div className="mb-4 bg-gray-700 p-4 rounded">
          <h3 className="text-sm font-semibold mb-1">💡 AI Advice:</h3>
          <p className="text-sm text-green-300 whitespace-pre-wrap">{data.ai_advice}</p>
        </div>
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

      <div className="bg-gray-800 p-4 rounded prose dark:prose-invert max-w-none">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}
