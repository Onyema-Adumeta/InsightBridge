// src/app/(dashboard)/ClientDashboard.tsx
"use client";

/* ========= DIAGNOSTIC MOUNT LOG ========= */
if (typeof window !== "undefined") {
  console.log(
    "%cClientDashboard V6 PRODUCTION mounted",
    "color:#10B981;font-weight:bold",
    new Date().toISOString()
  );
}

import React, { useState, useEffect, Component, ReactNode } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { AlertCircle, RefreshCw } from "lucide-react";

// Import the production-ready dashboard
import ModernDashboard from "./ModernDashboard";
import AppSidebar from "@/components/AppSidebar";

interface AnalysisData {
  latestFileName?: string;
  documentType?: string;
  kpiCardData?: any;
  kpiChartData?: any[];
  health_score?: { score: number; summary: string };
  benchmarkAnalysis?: any;
  summaries?: Array<{ summary: string; ai_advice: string }>;
  predictiveAnalysis?: {
    forecast?: string;
    insights?: Array<{
      title?: string;
      text: string;
      suggestion?: string;
      type?: string;
    }>;
  };
  company?: string;
  dateRange?: string;
  [key: string]: any;
}

interface DynamicClientDashboardProps {
  initialData?: AnalysisData | null;
}

/* =============================================================================
   ERROR BOUNDARY
============================================================================= */
interface DashboardErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
  errorId: string | null;
}

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  DashboardErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorId: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error, errorInfo: null, errorId: null };
  }

  componentDidCatch(error: any, errorInfo: any) {
    const ts = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "");
    const rnd = Math.random().toString(36).substr(2, 6);
    const errorId = `ERR_${ts}_${rnd}`.toUpperCase();
    this.setState({ error, errorInfo, errorId });
    console.error("Dashboard Error:", {
      errorId,
      error: error?.toString?.(),
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
            <p className="text-gray-600 mb-6">
              We&apos;ve encountered an unexpected error. Our team has been notified.
            </p>
            {this.state.errorId && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Error Reference:</p>
                <code className="text-sm font-mono text-gray-900 font-semibold">
                  {this.state.errorId}
                </code>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Reload Dashboard
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              If this problem persists, contact support with the error reference.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* =============================================================================
   LOADER COMPONENT
============================================================================= */
const DashboardLoadingSkeleton = () => (
  <div className="p-8 space-y-8 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
      <div className="h-96 bg-gray-200 rounded"></div>
    </div>
  </div>
);

/* =============================================================================
   MAIN DASHBOARD CONTENT
============================================================================= */
function DynamicClientDashboardContent({ initialData }: DynamicClientDashboardProps) {
  const { user, isLoaded } = useUser();
  const { getToken, userId } = useAuth();


  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(
    initialData || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);
  

  /* -------------------- Fetch analysis summary -------------------- */
  const fetchAnalysisSummary = async () => {
    if (!user?.id) return;

    try {
      // 1. Get the auth token from Clerk
      const token = await getToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      // 2. Remove user_id from query params.
      // The backend gets the user ID from the token, which is more secure.
      const token = await getToken();
      const response = await fetch(`/api/v1/main/analysis_summary?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log("[Dashboard] Fetching analysis_summary:", url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 3. Add the Authorization header
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log("[Dashboard] Analysis data received:", data);

      if (data && data.kpiCardData && Object.keys(data.kpiCardData).length > 0) {
        setAnalysisData(data);
        setError(null);
      } else {
        console.log("[Dashboard] No meaningful data found, showing welcome screen");
        setAnalysisData(null);
      }
    } catch (err: any) {
      console.error("[Dashboard] Error fetching analysis:", err);
      if (err.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(err?.message || "Failed to load dashboard data");
      }
    }
  };

  /* -------------------- Upload handling -------------------- */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    setIsLoading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const supportedFormats = ["xlsx", "xls", "csv", "json", "pdf"];

      if (!ext || !supportedFormats.includes(ext)) {
        throw new Error(
          `Unsupported file format. Please upload: ${supportedFormats.join(", ")}`
        );
      }

      // 1. Get the auth token from Clerk
      const token = await getToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user.id); 
      formData.append("industry", "Software/SaaS");
      formData.append("file_type", ext);

      const uploadURL = `/api/v1/main/upload_and_analyze`;
      console.log("[Dashboard] Uploading file:", file.name, "to", uploadURL);

      const response = await fetch(uploadURL, {
        method: "POST",
        headers: {
          // 3. Add the Authorization header
          Authorization: `Bearer ${token}`,
          // Do NOT set 'Content-Type' for FormData; the browser handles it.
        },
        body: formData,
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(
          `Upload failed: ${response.status} - ${errorJson.error || "Unknown error"}`
        );
      }

      const analysis = await response.json();
      console.log("[Dashboard] Upload response:", analysis);
      setAnalysisData(analysis);

      window.dispatchEvent(
        new CustomEvent("analysisUpdated", {
          detail: { userId: user.id, timestamp: Date.now() },
        })
      );

      // No need to call fetchAnalysisSummary() again,
      // since the upload response *is* the analysis data.
    } catch (err: any) {
      console.error("[Dashboard] Upload error:", err);
      setError(err.message || "File upload failed");
    } finally {
      setIsUploading(false);
      setIsLoading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  /* -------------------- Refresh handler -------------------- */
  const handleDataRefresh = async () => {
    if (!user?.id) return;

    console.log("[Dashboard] 🔄 Refresh initiated - clearing data");

    setIsLoading(true);
    setAnalysisData(null);
    setError(null);
    console.log("[Dashboard] ✓ Frontend state cleared");

    try {
      // 1. Get the auth token from Clerk
      const token = await getToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const clearUrl = `/api/v1/main/clear_storage`;
      console.log("[Dashboard] 📡 Calling clear_storage:", clearUrl);

      const clearResponse = await fetch(clearUrl, {
        method: "POST",
        headers: {
          // 2. Add the Authorization header
          Authorization: `Bearer ${token}`,
          // 3. Content-Type is not needed if the body is empty
        },
        // 4. REMOVED BODY. The backend will get the user_id from the token.
        // body: `user_id=${encodeURIComponent(user.id)}`,
      });

      if (!clearResponse.ok) {
        console.error("[Dashboard] ❌ Clear storage failed:", clearResponse.status);
        throw new Error(`Failed to clear storage: ${clearResponse.status}`);
      }

      const clearResult = await clearResponse.json();
      console.log("[Dashboard] ✅ Backend storage cleared:", clearResult.message);
      await new Promise((resolve) => setTimeout(resolve, 300));
      console.log("[Dashboard] ✅ Refresh completed - showing welcome screen");
    } catch (err: any) {
      console.error("[Dashboard] ❌ Refresh error:", err);
      setError("Failed to refresh dashboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------- Export handler (No API call) -------------------- */
  const handleExport = () => {
    if (!analysisData) {
      setError("No data available to export");
      return;
    }
    try {
      const dataStr = JSON.stringify(analysisData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `financial-analysis-${
        new Date().toISOString().split("T")[0]
      }.json`;
      link.click();
      URL.revokeObjectURL(url);
      console.log("[Dashboard] Data exported successfully");
    } catch (err: any) {
      console.error("[Dashboard] Export error:", err);
      setError("Failed to export data");
    }
  };

  /* -------------------- Generate report handler -------------------- */
  const handleGenerateReport = async () => {
    if (!analysisData) {
      setError("No data available to generate report");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get the auth token from Clerk
      const token = await getToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      console.log("[Dashboard] Generating report...");

      const response = await fetch(`/api/v1/main/generate_report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 2. Add the Authorization header
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName =
        analysisData.company ||
        analysisData.latestFileName ||
        "financial-report";
      a.download = `${fileName}_Report_${
        new Date().toISOString().split("T")[0]
      }.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      console.log("[Dashboard] Report generated successfully");
    } catch (err: any) {
      console.error("[Dashboard] Report generation error:", err);
      setError("Failed to generate report: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------- Effects -------------------- */
  useEffect(() => {
    if (initialData) {
      setAnalysisData(initialData);
    }
  }, [initialData]);

  // Only fetch on initial mount if we haven't fetched before
  useEffect(() => {
    if (isLoaded && user?.id && !analysisData && !isLoading && !hasInitialFetch) {
      console.log("[Dashboard] Initial data fetch on mount");
      setHasInitialFetch(true);
      fetchAnalysisSummary();
    }
  }, [isLoaded, user?.id, hasInitialFetch, analysisData, isLoading]);

  // Listen for external updates
  useEffect(() => {
    const handler = () => {
      console.log("[Dashboard] External update detected, refreshing...");
      fetchAnalysisSummary();
    };
    window.addEventListener("analysisUpdated", handler as EventListener);
    return () =>
      window.removeEventListener("analysisUpdated", handler as EventListener);
  }, [user?.id]);

  /* -------------------- Render -------------------- */
  if (!isLoaded) {
    return <DashboardLoadingSkeleton />;
  }

  if (error && !analysisData && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Unable to Load Dashboard
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleDataRefresh}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-64">
        <ModernDashboard
          analysisData={analysisData}
          onUpload={handleFileUpload}
          onRefresh={handleDataRefresh}
          onExport={handleExport}
          onGenerateReport={handleGenerateReport}
          isUploading={isUploading}
          isLoading={isLoading}
          userId={user?.id}
        />
      </div>
    </div>
  );
}

/* =============================================================================
   EXPORT
============================================================================= */
export default function DynamicClientDashboard({
  initialData,
}: DynamicClientDashboardProps) {
  return (
    <DashboardErrorBoundary>
      <DynamicClientDashboardContent initialData={initialData} />
    </DashboardErrorBoundary>
  );
}
