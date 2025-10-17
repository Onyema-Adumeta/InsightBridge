"use client";

import { useState, useCallback } from "react";
import { useDropzone, Accept } from "react-dropzone";
import { useAnalysis } from '@/context/AnalysisContext';
import { useRouter } from 'next/navigation';
import UploadCard from '../components/UploadCard';

// The interface remains the same
interface UploadTask {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  summary?: string;
  recommendations?: string;
  uploadedAt?: string;
  relatedExplainers?: string[];
  error?: string;
}

const ACCEPTED_FILE_TYPES: Accept = {
  "application/pdf": [".pdf"],
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

// ✅ Helper function to make data parsing cleaner
function formatRecommendations(adviceData: any): string {
  if (!adviceData) return "No recommendations available.";
  if (typeof adviceData === 'string') return adviceData;
  if (typeof adviceData === 'object') {
    const formulaStr = typeof adviceData.formula === 'string' ? adviceData.formula : JSON.stringify(adviceData.formula);
    const resultStr = typeof adviceData.result === 'string' ? adviceData.result : JSON.stringify(adviceData.result);
    return `Formula: ${formulaStr}\nResult: ${resultStr}`;
  }
  return "No recommendations available.";
}

export default function UploadForm() {
  const { refreshAnalysisData } = useAnalysis();
  const router = useRouter();

  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  // ✅ Added state to track when any upload is in progress
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (task: UploadTask) => {
    const updateTask = (updates: Partial<UploadTask>) => {
      setUploadTasks(prevTasks =>
        prevTasks.map(t => (t.id === task.id ? { ...t, ...updates } : t))
      );
    };

    try {
      const formData = new FormData();
      formData.append("file", task.file);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${baseUrl}/main/summarize`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server responded with ${res.status}: ${errText}`);
      }

      const data = await res.json();
      updateTask({
        status: 'success',
        summary: data.summaries?.[0]?.summary || "No summary returned.",
        recommendations: formatRecommendations(data.summaries?.[0]?.ai_advice),
        uploadedAt: new Date().toLocaleString(),
        relatedExplainers: data.related_explainers ?? [],
      });
    } catch (err) {
      updateTask({
        status: 'error',
        error: (err as Error).message,
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newTasks: UploadTask[] = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      status: 'uploading',
    }));

    setUploadTasks(prevTasks => [...prevTasks, ...newTasks]);
    setIsUploading(true); // ✅ Disable dropzone

    try {
      // ✅ Wait for all uploads to complete
      await Promise.all(newTasks.map(task => handleFileUpload(task)));
      
      // ✅ Refresh and navigate only ONCE after all are done
      await refreshAnalysisData();
      router.push('/dashboard');

    } catch (err) {
      console.error("One or more uploads failed:", err);
    } finally {
      setIsUploading(false); // ✅ Re-enable dropzone
    }
  }, [refreshAnalysisData, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    multiple: true,
    disabled: isUploading, // ✅ Disable dropzone while uploading
  });

  return (
    <div className="p-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isUploading ? 'bg-gray-700 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <p>Processing files, please wait...</p>
        ) : isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag and drop PDF, CSV, or Excel files here, or click to select files</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {uploadTasks.map(task => (
          <UploadCard
            key={task.id}
            filename={task.file.name}
            status={task.status}
            summary={task.summary || ""}
            recommendations={task.recommendations}
            uploadedAt={task.uploadedAt || ""}
            related_explainers={task.relatedExplainers}
            error={task.error}
          />
        ))}
      </div>
    </div>
  );
}