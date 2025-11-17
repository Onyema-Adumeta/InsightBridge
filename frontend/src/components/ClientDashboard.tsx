// src/app/(dashboard)/ClientDashboard.tsx
"use client";

/* ========= DIAGNOSTIC MOUNT LOG ========= */
if (typeof window !== "undefined") {
  console.log(
    "%cClientDashboard V8 LAYOUT-FIX mounted",
    "color:#10B981;font-weight:bold",
    new Date().toISOString()
  );
}

import React, { useState, useEffect, Component, ReactNode, useCallback, memo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { AlertCircle, RefreshCw, Wifi, WifiOff, Menu, X } from "lucide-react";

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
   ERROR BOUNDARY - ENHANCED with better error tracking
============================================================================= */
interface DashboardErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
  errorId: string | null;
  errorCount: number;
}

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  DashboardErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      errorId: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error, errorInfo: null, errorId: null };
  }

  componentDidCatch(error: any, errorInfo: any) {
    const ts = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "");
    const rnd = Math.random().toString(36).substr(2, 6);
    const errorId = `ERR_${ts}_${rnd}`.toUpperCase();
    
    this.setState(prev => ({ 
      error, 
      errorInfo, 
      errorId,
      errorCount: prev.errorCount + 1 
    }));

    console.error("Dashboard Error:", {
      errorId,
      error: error?.toString?.(),
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      errorCount: this.state.errorCount + 1,
    });

    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.errorCount > 5) {
      alert('Multiple errors detected. Please refresh the page or contact support.');
      return;
    }
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gray-50">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              We&apos;ve encountered an unexpected error. Our team has been notified.
            </p>
            {this.state.errorId && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-6 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Error Reference:</p>
                <code className="text-xs sm:text-sm font-mono text-gray-900 font-semibold break-all">
                  {this.state.errorId}
                </code>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                disabled={this.state.errorCount > 5}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Try Again {this.state.errorCount > 1 && `(${this.state.errorCount})`}
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
   LOADER COMPONENT - ENHANCED with better skeleton
============================================================================= */
const DashboardLoadingSkeleton = memo(() => (
  <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-8 bg-gray-200 rounded w-48"></div>
      <div className="h-10 bg-gray-200 rounded w-32"></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
      <div className="h-64 sm:h-96 bg-gray-200 rounded"></div>
    </div>
  </div>
));

DashboardLoadingSkeleton.displayName = 'DashboardLoadingSkeleton';

/* =============================================================================
   ONLINE STATUS INDICATOR
============================================================================= */
const OnlineStatusIndicator = memo(() => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">No Internet Connection</span>
    </div>
  );
});

OnlineStatusIndicator.displayName = 'OnlineStatusIndicator';

/* =============================================================================
   MOBILE SIDEBAR TOGGLE - NEW
============================================================================= */
const MobileSidebarToggle = memo(({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="lg:hidden fixed top-4 left-4 z-50 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors border border-gray-200"
    aria-label={isOpen ? "Close menu" : "Open menu"}
  >
    {isOpen ? (
      <X className="w-6 h-6 text-gray-700" />
    ) : (
      <Menu className="w-6 h-6 text-gray-700" />
    )}
  </button>
));

MobileSidebarToggle.displayName = 'MobileSidebarToggle';

/* =============================================================================
   MAIN DASHBOARD CONTENT - FIXED LAYOUT
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
  const [retryCount, setRetryCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /* -------------------- Fetch analysis summary -------------------- */
  const fetchAnalysisSummary = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const url = `/api/v1/main/analysis_summary?user_id=${userId}`;
      console.log("[Dashboard] Fetching analysis_summary:", url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
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

      if (data && (data.kpiCardData || data.kpiChartData)) {
        setAnalysisData(data);
        setError(null);
        setRetryCount(0);
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
      
      if (retryCount < 3) {
        console.log(`[Dashboard] Auto-retry ${retryCount + 1}/3 in 3 seconds...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchAnalysisSummary();
        }, 3000);
      }
    }
  }, [user?.id, userId, getToken, retryCount]);

  /* -------------------- Upload handling -------------------- */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File size exceeds 10MB limit");
      }

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
          Authorization: `Bearer ${token}`,
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
  }, [user?.id, getToken]);

  /* -------------------- Refresh handler -------------------- */
  const handleDataRefresh = useCallback(async () => {
    if (!user?.id) return;

    console.log("[Dashboard] 🔄 Refresh initiated - clearing data");

    setIsLoading(true);
    setAnalysisData(null);
    setError(null);
    setRetryCount(0);
    console.log("[Dashboard] ✓ Frontend state cleared");

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const clearUrl = `/api/v1/main/clear_storage`;
      console.log("[Dashboard] 📡 Calling clear_storage:", clearUrl);

      const clearResponse = await fetch(clearUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
  }, [user?.id, getToken]);

  /* -------------------- Export handler -------------------- */
  const handleExport = useCallback(() => {
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
  }, [analysisData]);

  /* -------------------- Generate report handler -------------------- */
  const handleGenerateReport = useCallback(async () => {
    if (!analysisData) {
      setError("No data available to generate report");
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      console.log("[Dashboard] Generating report...");

      const response = await fetch(`/api/v1/main/generate_report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
  }, [analysisData, getToken]);

  /* -------------------- Effects -------------------- */
  useEffect(() => {
    if (initialData) {
      setAnalysisData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (isLoaded && user?.id && !analysisData && !isLoading && !hasInitialFetch) {
      console.log("[Dashboard] Initial data fetch on mount");
      setHasInitialFetch(true);
      fetchAnalysisSummary();
    }
  }, [isLoaded, user?.id, hasInitialFetch, analysisData, isLoading, fetchAnalysisSummary]);

  useEffect(() => {
    const handler = () => {
      console.log("[Dashboard] External update detected, refreshing...");
      fetchAnalysisSummary();
    };
    window.addEventListener("analysisUpdated", handler as EventListener);
    return () =>
      window.removeEventListener("analysisUpdated", handler as EventListener);
  }, [fetchAnalysisSummary]);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSidebarOpen && window.innerWidth < 1024) {
        const sidebar = document.getElementById('mobile-sidebar');
        const toggle = document.getElementById('mobile-toggle');
        if (sidebar && !sidebar.contains(event.target as Node) && 
            toggle && !toggle.contains(event.target as Node)) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  /* -------------------- Render -------------------- */
  if (!isLoaded) {
    return <DashboardLoadingSkeleton />;
  }

  if (error && !analysisData && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Unable to Load Dashboard
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
          {retryCount > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              Retry attempt {retryCount} of 3...
            </p>
          )}
          <button
            onClick={handleDataRefresh}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <OnlineStatusIndicator />
      
      {/* FIXED LAYOUT - No black spaces */}
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block fixed left-0 top-0 h-screen w-64 z-40">
          <AppSidebar />
        </aside>

        {/* Mobile Sidebar - Overlay */}
        <aside
          id="mobile-sidebar"
          className={`lg:hidden fixed left-0 top-0 h-screen w-64 z-50 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AppSidebar />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Mobile Menu Toggle */}
        <div id="mobile-toggle">
          <MobileSidebarToggle 
            isOpen={isSidebarOpen} 
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
        </div>

        {/* Main Content - Responsive margins */}
        <main className="flex-1 lg:ml-64 w-full min-h-screen">
          <div className="w-full h-full">
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
        </main>
      </div>
    </>
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