"use client";

import { useState } from "react";

interface UploadCardProps {
  filename: string;
  summary: string;
  recommendations?: string;
  uploadedAt: string;
  related_explainers?: string[];
}

function extractKeyInfo(summary: string) {
  const topMerchantMatch = summary.match(/Top Merchant:\s*(.*)/i);
  const totalMatch = summary.match(/Total(?: Amount)?:\s*[\$]?([-0-9.,]+)/i);
  const txMatch = summary.match(/Transactions:\s*(\d+)/i);

  return {
    topMerchant: topMerchantMatch?.[1] ?? "N/A",
    total: totalMatch?.[1] ?? "N/A",
    transactions: txMatch?.[1] ?? "N/A",
  };
}

export default function UploadCard({
  filename,
  summary,
  recommendations,
  uploadedAt,
  related_explainers
}: UploadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const insights = extractKeyInfo(summary);

  return (
    <div className="border rounded-xl p-4 shadow-md bg-white mb-4 text-gray-900">
      <div
        className="cursor-pointer flex justify-between items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="font-semibold">{filename}</h3>
          <p className="text-sm text-gray-500">Uploaded: {uploadedAt}</p>
        </div>
        <span className="text-blue-500 text-sm">
          {expanded ? "Hide Summary ▲" : "Show Summary ▼"}
        </span>
      </div>

      {expanded && (
        <div className="mt-4 text-gray-700 whitespace-pre-wrap border-t pt-4">
          <div className="mb-2 text-sm text-gray-600 font-medium">🔍 Key Insights:</div>
          <ul className="text-sm mb-3">
            <li>🏬 Top Merchant: {insights.topMerchant}</li>
            <li>💵 Total Amount: ${insights.total}</li>
            <li>📦 Transactions: {insights.transactions}</li>
          </ul>

          <div className="text-sm mb-2">
            <div className="text-gray-600 font-medium mb-1">📝 Summary:</div>
            <pre className="whitespace-pre-wrap">{summary}</pre>
          </div>

          {recommendations && (
            <div className="text-sm mt-4">
              <div className="text-gray-600 font-medium mb-1">🧠 Smart Recommendations:</div>
              <pre className="whitespace-pre-wrap">{recommendations}</pre>
            </div>
          )}

          {related_explainers?.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="mb-2 text-sm text-gray-600 font-medium">📘 Related Learning Topics:</div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {related_explainers.map((id) => (
                  <li key={id}>
                    <a
                      href={`/help#${id}`}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View topic {id.replace("exp_", "")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
