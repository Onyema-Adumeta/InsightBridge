'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useRef, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/context/AnalysisContext';
import {
  Upload as UploadIcon,
  CheckCircle,
  X,
  File,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  Brain,
  FileSpreadsheet,
  Target,
  ArrowRight,
} from 'lucide-react';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadPage() {
  const endpoint = '/api/v1/main/upload_and_analyze';
  const router = useRouter();
  const { refreshAnalysisData } = useAnalysis();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Optional “goal” chips (UI polish; can wire later)
  const [goal, setGoal] = useState<'full' | 'forecast' | 'benchmarks' | 'health'>('full');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const accept = '.xlsx,.xls,.csv,.pdf';

  const goalLabel = useMemo(() => {
    switch (goal) {
      case 'forecast':
        return 'Forecasting';
      case 'benchmarks':
        return 'Benchmarks';
      case 'health':
        return 'Health Score';
      default:
        return 'Full Report';
    }
  }, [goal]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setMessage('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setMessage('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = Math.round((bytes / Math.pow(k, i)) * 100) / 100;
    return `${val} ${sizes[i]}`;
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setMessage('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file first.');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setMessage(`Uploading ${selectedFile.name}...`);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    // optional: send goal to backend later
    formData.append('analysis_goal', goal);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const uploadResponse = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ detail: 'Upload failed.' }));
        throw new Error(errorData.detail);
      }

      setUploadStatus('success');
      setMessage('Success! Finalizing analysis, please wait...');

      setTimeout(() => {
        refreshAnalysisData();
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setUploadStatus('error');
      setMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Compact Header (not another “dashboard hero”) */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
              <UploadIcon className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Upload Data</h1>
              <p className="text-slate-600">
                Upload a financial statement and we’ll generate insights, KPIs, and forecasts.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Status */}
        {uploadStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Upload Failed</p>
              <p className="text-red-700 text-sm">{message}</p>
            </div>
            <button onClick={clearFile} className="p-2 hover:bg-red-100 rounded-xl">
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">Success</p>
              <p className="text-emerald-700 text-sm">{message}</p>
            </div>
          </div>
        )}

        {/* Main Upload Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-8 sm:p-10 transition-all ${
              isDragging ? 'bg-indigo-50 border-4 border-dashed border-indigo-300' : 'bg-white'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept={accept}
            />

            {!selectedFile ? (
              <div className="text-center">
                <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 flex items-center justify-center shadow-md mb-6">
                  <FileSpreadsheet className="w-12 h-12 text-indigo-600" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">Drop your file here</h2>
                <p className="text-slate-600 mb-6">or browse to upload (Excel, CSV, PDF • Max 10MB)</p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white font-bold rounded-2xl hover:shadow-xl hover:scale-105 transition-all"
                >
                  <UploadIcon className="w-5 h-5" />
                  Choose File
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Your data is encrypted in transit</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected file */}
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                    <File className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                    <p className="text-sm text-slate-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  {uploadStatus === 'idle' && (
                    <button
                      onClick={clearFile}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                      title="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Goal chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'full', label: 'Full Report', icon: Sparkles },
                    { id: 'forecast', label: 'Forecasting', icon: Brain },
                    { id: 'benchmarks', label: 'Benchmarks', icon: Target },
                    { id: 'health', label: 'Health Score', icon: Shield },
                  ].map((g: any) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      disabled={uploadStatus !== 'idle'}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                        goal === g.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <g.icon className="w-4 h-4" />
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Progress */}
                {uploadStatus === 'uploading' && (
                  <div className="rounded-2xl p-5 bg-indigo-50 border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 font-semibold text-indigo-900">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading & analyzing ({goalLabel})...
                      </span>
                      <span className="font-bold text-indigo-900">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA */}
                {uploadStatus === 'idle' && (
                  <button
                    onClick={handleUpload}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Brain className="w-5 h-5" />
                    Upload & Analyze
                    <Sparkles className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Minimal “What you’ll get” row (not duplicating dashboard) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Brain, title: 'AI Summary', desc: 'Clear insights with key KPIs and drivers.' },
            { icon: Target, title: 'Benchmarks', desc: 'Compare performance to industry ranges.' },
            { icon: Shield, title: 'Health Score', desc: 'Quick indicator of financial strength.' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <f.icon className="w-6 h-6 text-indigo-600 mb-3" />
              <p className="font-semibold text-slate-900">{f.title}</p>
              <p className="text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
