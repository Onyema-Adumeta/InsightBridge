"use client";

import { useState } from 'react';
import { 
  Upload, 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  File,
  Download
} from 'lucide-react';

export default function ImprovedDashboard() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadProgress(i);
    }

    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      status: 'completed'
    }));

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const removeFile = (id: number) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="ml-64 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Transform Your Financial Data</h1>
              <p className="text-slate-600 mt-1">
                Upload statements for instant AI-powered analysis with forecasting, benchmarks, and actionable insights
              </p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="text-right">
                <div className="text-sm text-slate-600">Files Uploaded</div>
                <div className="text-2xl font-bold text-indigo-600">{uploadedFiles.length}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Upload Section */}
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 hover:border-indigo-400 transition-colors">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`text-center ${isDragging ? 'opacity-50' : ''}`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept=".xlsx,.xls,.csv,.pdf"
              onChange={handleFileInput}
            />
            
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-indigo-600" />
            </div>
            
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Click or drag files here
            </h3>
            <p className="text-slate-600 mb-4">
              Excel, CSV, PDF • Max 10MB
            </p>
            
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Files
            </label>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                <span>Uploading...</span>
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
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Recent Uploads</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <File className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            Completed
                          </span>
                          <span>•</span>
                          <span>{new Date(file.uploadedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Quick Stats */}
        {uploadedFiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Total Files</span>
                <FileText className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold">{uploadedFiles.length}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Processed</span>
                <CheckCircle className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold">{uploadedFiles.length}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">This Month</span>
                <TrendingUp className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold">{uploadedFiles.length}</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Last Upload</span>
                <Clock className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-lg font-bold">Just now</div>
            </div>
          </div>
        )}

        {/* Getting Started Guide */}
        {uploadedFiles.length === 0 && (
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
                <p>View forecasts, benchmarks, and actionable recommendations</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}