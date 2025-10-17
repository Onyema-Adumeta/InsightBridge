// File: components/FileUpload.tsx
// Updated with enhancement toggle

"use client";

import React, { useState, useCallback } from 'react';
import { useAnalysis } from '../context/AnalysisContext';

const UploadCloudIcon = () => (
    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h.586a1 1 0 01.707.293l2 2a1 1 0 00.707.293H12a4 4 0 014 4v1m-6 4v6m0 0v-6m0 6h.01M6 16a4 4 0 004 4h4a4 4 0 004-4m-6-4v6" /></svg>
);

export function FileUpload() {
  const { refreshAnalysisData } = useAnalysis();
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // NEW: Add state for enhanced mode toggle
  const [enhancedMode, setEnhancedMode] = useState(false);
  
  // NEW: Add state to show processing info
  const [processingInfo, setProcessingInfo] = useState<{
    enhanced_mode_used?: boolean;
    processing_time?: number;
    data_quality_score?: number;
  } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    // Remove the test alert since we're updating the code
    // alert("My code is updated!"); 
    
    if (!file) return;

    setStatusMessage(`Uploading ${file.name}...`);
    setError(null);
    setProcessingInfo(null); // Reset processing info

    const formData = new FormData();
    formData.append('file', file);
    
    // NEW: Add enhanced mode preference to form data
    formData.append('enhanced_mode', enhancedMode.toString());

    try {
      const response = await fetch('/api/v1/main/upload_and_analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "File analysis failed on the server.");
      }
      
      // NEW: Get the response data which now includes processing info
      const responseData = await response.json();
      
      // NEW: Store processing info for display
      setProcessingInfo(responseData.processing_info || null);
      
      setStatusMessage(`✅ Analysis complete! Refreshing dashboard...`);
      await refreshAnalysisData();
      setStatusMessage(`Dashboard updated successfully!`);

    } catch (err: any) {
      setError(err.message);
      setStatusMessage('');
      setProcessingInfo(null);
    }
  }, [refreshAnalysisData, enhancedMode]); // Add enhancedMode to dependencies

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      
      {/* NEW: Enhanced Features Toggle */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <input
            id="enhanced-mode"
            type="checkbox"
            checked={enhancedMode}
            onChange={(e) => setEnhancedMode(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label 
            htmlFor="enhanced-mode" 
            className="text-sm font-medium text-gray-300 cursor-pointer"
          >
            Enable Enhanced Analysis
          </label>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
            Beta
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Includes advanced data validation, improved forecasting models, and enhanced error handling
        </p>
      </div>

      {/* Existing file upload area */}
      <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloudIcon />
          <p className="mb-2 text-sm text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          {/* NEW: Show current mode */}
          <p className="text-xs text-gray-500">
            Mode: {enhancedMode ? 'Enhanced Analysis' : 'Standard Analysis'}
          </p>
        </div>
        <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
      </label>
      
      {/* Existing status messages */}
      <div className="min-h-5 text-sm text-center">
        {error && <p className="text-red-400">❌ Error: {error}</p>}
        {statusMessage && <p className="text-green-400">{statusMessage}</p>}
      </div>

      {/* NEW: Processing Information Display */}
      {processingInfo && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 mt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Analysis Details</h4>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Processing Mode:</span>
              <span className={`font-medium ${processingInfo.enhanced_mode_used ? 'text-blue-400' : 'text-gray-300'}`}>
                {processingInfo.enhanced_mode_used ? 'Enhanced' : 'Standard'}
              </span>
            </div>
            {processingInfo.processing_time && (
              <div className="flex justify-between">
                <span>Processing Time:</span>
                <span className="text-gray-300">{processingInfo.processing_time.toFixed(2)}s</span>
              </div>
            )}
            {processingInfo.data_quality_score && (
              <div className="flex justify-between">
                <span>Data Quality:</span>
                <span className={`font-medium ${
                  processingInfo.data_quality_score > 0.8 ? 'text-green-400' : 
                  processingInfo.data_quality_score > 0.5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {(processingInfo.data_quality_score * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}