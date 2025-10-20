'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/context/AnalysisContext';
import { 
  Upload as UploadIcon, 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  X,
  File,
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react';


export const dynamic = 'force-dynamic';

export default function UploadPage() {
    const endpoint = '/api/v1/main/upload_and_analyze';
    const router = useRouter();
    const { refreshAnalysisData } = useAnalysis();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            setUploadStatus('idle');
            setMessage('');
        }
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

        // Simulate progress (since we can't track real upload progress easily)
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
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
                credentials: 'same-origin'
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
            }, 2000);

        } catch (err) {
            clearInterval(progressInterval);
            setUploadStatus('error');
            setMessage(err instanceof Error ? err.message : "An unknown error occurred.");
            setUploadProgress(0);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const clearFile = () => {
        setSelectedFile(null);
        setUploadStatus('idle');
        setMessage('');
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="ml-64 min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Upload Financial Data</h1>
                            <p className="text-slate-600 mt-1">
                                Upload statements for instant AI-powered analysis with forecasting, benchmarks, and actionable insights
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Status Messages */}
                {uploadStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-900">Upload Failed</p>
                            <p className="text-red-700 text-sm">{message}</p>
                        </div>
                        <button onClick={clearFile} className="ml-auto p-1 hover:bg-red-100 rounded">
                            <X className="w-4 h-4 text-red-600" />
                        </button>
                    </div>
                )}

                {uploadStatus === 'success' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-green-900">Upload Successful</p>
                            <p className="text-green-700 text-sm">{message}</p>
                        </div>
                    </div>
                )}

                {/* Upload Section */}
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`p-8 ${isDragging ? 'bg-indigo-50' : ''}`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".xlsx,.xls,.csv,.pdf"
                        />

                        {!selectedFile ? (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UploadIcon className="w-8 h-8 text-indigo-600" />
                                </div>
                                
                                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                    Click or drag files here
                                </h3>
                                <p className="text-slate-600 mb-4">
                                    Excel, CSV, PDF • Max 10MB
                                </p>
                                
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <UploadIcon className="w-4 h-4 mr-2" />
                                    Choose File
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Selected File Display */}
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <File className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">{selectedFile.name}</p>
                                        <p className="text-sm text-slate-600">{formatFileSize(selectedFile.size)}</p>
                                    </div>
                                    {uploadStatus === 'idle' && (
                                        <button
                                            onClick={clearFile}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Upload Progress */}
                                {uploadStatus === 'uploading' && (
                                    <div>
                                        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Uploading...
                                            </span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Upload Button */}
                                {uploadStatus === 'idle' && (
                                    <button
                                        onClick={handleUpload}
                                        className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UploadIcon className="w-5 h-5" />
                                        Upload & Analyze
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                            <Zap className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Forecasting</h3>
                        <p className="text-sm text-slate-600">
                            6-month predictions with 95% confidence
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                            <Target className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Industry Benchmarks</h3>
                        <p className="text-sm text-slate-600">
                            Compare against sector standards
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                            <BarChart3 className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Health Score</h3>
                        <p className="text-sm text-slate-600">
                            Instant financial health assessment
                        </p>
                    </div>
                </div>

                {/* Getting Started Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Getting Started</h3>
                    <div className="space-y-2 text-sm text-blue-800">
                        <div className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                            <p>Upload your financial statements (Excel, CSV, or PDF)</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                            <p>Our AI analyzes your data and generates insights</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                            <p>View forecasts, benchmarks, and actionable recommendations in your dashboard</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}