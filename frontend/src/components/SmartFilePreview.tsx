"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Papa from "papaparse";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Props {
  fileUrl: string; // Public or signed URL
}

export default function SmartFilePreview({ fileUrl }: Props) {
  const [fileType, setFileType] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl) return;

    const ext = fileUrl.split('.').pop()?.toLowerCase();
    setFileType(ext);

    if (ext === "csv") {
      fetch(fileUrl)
        .then((res) => res.text())
        .then((text) => {
          const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
          setCsvData(parsed.data as string[][]);
        })
        .catch(() => setError("Failed to load CSV"));
    }
  }, [fileUrl]);

  if (!fileUrl) return <p>No file selected.</p>;
  if (error) return <p className="text-red-500">❌ {error}</p>;

  return (
    <div className="border rounded-xl p-4 shadow-md bg-white text-black">
      <h3 className="text-md font-bold mb-2">📂 File Preview</h3>

      {fileType === "pdf" && (
        <div className="overflow-x-auto border p-2">
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page key={i} pageNumber={i + 1} width={600} />
            ))}
          </Document>
        </div>
      )}

      {fileType === "csv" && (
        <div className="overflow-x-auto text-sm">
          <table className="table-auto border border-gray-300 w-full">
            <thead>
              <tr>
                {csvData[0]?.map((header, i) => (
                  <th key={i} className="border px-2 py-1 bg-gray-100">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border px-2 py-1">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fileType !== "pdf" && fileType !== "csv" && (
        <p className="italic text-gray-500">Preview not available for this file type.</p>
      )}
    </div>
  );
}
