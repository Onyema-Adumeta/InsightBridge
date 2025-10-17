"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import HistoryPanel from "@/components/HistoryPanel";

export default function SummarizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
      setSummary(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSummary(null);
    setError(null);

    if (!file) {
      setError("❌ No file selected.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", "anonymous");

    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/summarize`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server responded with ${res.status}: ${errText}`);
      }

      const data = await res.json();
      if (!data.summary) {
        throw new Error("⚠️ No summary returned from the server.");
      }

      setSummary(data.summary);
    } catch (err: unknown) {
      console.error("❌ Upload or parsing error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("❌ Unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadText = () => {
    if (!summary) return;
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file?.name?.replace(".pdf", "") || "summary"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto font-sans text-center">
      <h1 className="text-2xl font-bold mb-4">📄 Upload PDF for Summary</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block mx-auto"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {loading ? "Summarizing..." : "Generate Summary"}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {summary && (
        <div className="mt-6 text-left bg-gray-100 dark:bg-gray-800 p-4 rounded whitespace-pre-wrap">
          <h2 className="text-lg font-semibold mb-2">📘 AI Summary:</h2>

          <div className="text-sm text-white bg-black p-3 rounded mb-4">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>

          <div className="flex justify-between flex-wrap gap-2">
            <button
              onClick={handleDownloadPDF}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded border border-white"
            >
              ⬇️ Download PDF
            </button>

            <button
              onClick={handleDownloadText}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded border border-white"
            >
              📥 Download Summary (.txt)
            </button>
          </div>
        </div>
      )}

      {/* ✅ Upload history timeline or list */}
      <HistoryPanel />
    </div>
  );
}
