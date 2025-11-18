'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import DynamicClientDashboard from '@/components/ClientDashboard';
import LoadingDashboard from '@/components/LoadingDashboard';
import { Lock } from 'lucide-react'; // Import a suitable icon

export const dynamic = 'force-dynamic';

// Define the shape of your data
interface AnalysisData {
  company?: string;
  user_id?: string;
  summary?: string;
  items?: any[];
  updated_at?: string | null;
  [key: string]: any;
}

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] =
    useState<'connected' | 'connecting' | 'error'>('connecting');
  const [retryCount, setRetryCount] = useState(0);

  // ✅ Environment check - only show debug info in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Function to fetch data
  const fetchData = async (isRetry = false) => {
    if (!isLoaded) {
      if (isDevelopment) console.log('⏳ Clerk not loaded yet...');
      return;
    }

    if (!isSignedIn || !user) {
      if (isDevelopment) console.log('🔐 User not signed in');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setConnectionStatus('connecting');

      // ✅ FIX: Add user_id parameter
      const url = `/api/v1/main/analysis_summary?user_id=${user.id}`;

      if (isDevelopment) {
        console.log('🔍 Fetching from:', url);
        console.log('🔑 User ID:', user.id);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (isDevelopment) console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        if (isDevelopment) console.error(`❌ API Error: ${response.status}`, errorText);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (isDevelopment) {
        console.log('✅ Analysis data received:', data);
        console.log('📊 Has kpiCardData:', !!data.kpiCardData);
        console.log('📊 Has kpiChartData:', !!data.kpiChartData);
        console.log('📁 Items count:', data.items?.length || 0);
        console.log('🕐 Updated at:', data.updated_at);
      }

      setAnalysisData(data);
      setConnectionStatus('connected');
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      if (isDevelopment) {
        console.error('💥 Error:', err.message);
      }

      setConnectionStatus('error');

      // ✅ Auto-retry logic (up to 3 times)
      if (!isRetry && retryCount < 3) {
        if (isDevelopment)
          console.log(`🔄 Auto-retry ${retryCount + 1}/3 in 3 seconds...`);
        setRetryCount((prev) => prev + 1);

        setTimeout(() => {
          fetchData(true); // Retry with flag
        }, 3000); // Wait 3 seconds before retry
        return;
      }

      // ✅ If all retries fail, set to null (show welcome screen)
      if (isDevelopment) console.warn('⚠️ All retries exhausted, showing welcome screen');

      setAnalysisData(null); // Changed from setting default data to null
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user]);

  // Listen for analysis updates (when file is uploaded)
  useEffect(() => {
    const handleAnalysisUpdate = (event: any) => {
      if (isDevelopment) console.log('🔄 Analysis updated event received:', event.detail);

      // Refetch data after a short delay to ensure backend has processed
      setTimeout(() => {
        if (isDevelopment) console.log('🔄 Refetching analysis data...');
        setRetryCount(0); // Reset retry count for new fetch
        fetchData();
      }, 500);
    };

    window.addEventListener('analysisUpdated', handleAnalysisUpdate as EventListener);

    return () => {
      window.removeEventListener('analysisUpdated', handleAnalysisUpdate as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoaded, isSignedIn]);

  // Manual refresh function
  const handleRefresh = () => {
    if (isDevelopment) console.log('🔄 Manual refresh triggered');
    setRetryCount(0);
    fetchData();
  };

  // ✅ FIX 1: Centered layout for loading state
  if (!isLoaded || (loading && !analysisData)) {
    return (
      <main className="lg:ml-64 flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <LoadingDashboard />
      </main>
    );
  }

  // ✅ FIX 2: Centered layout for "Not Signed In" state
  if (isLoaded && !isSignedIn) {
    return (
      <main className="lg:ml-64 flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow">
          <div className="mb-6">
            <Lock className="mx-auto h-16 w-16 text-blue-600" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Authentication Required
          </h2>
          <p className="mb-6 text-gray-600">
            Please sign in to view your dashboard.
          </p>
          <a
            href="/sign-in"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </main>
    );
  }

  // ✅ Connection status banner (minimal, non-intrusive)
  const connectionBanner =
    connectionStatus === 'connecting' && retryCount > 0 ? (
      <div className="mb-4 border-l-4 border-blue-500 bg-blue-50 p-3">
        <div className="flex items-center">
          <div className="mr-3 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-sm text-blue-700">Connecting to server...</p>
        </div>
      </div>
    ) : null;

  // ✅ Main dashboard render (kept as “normal” top-aligned layout)
  return (
    <main className="lg:ml-64 min-h-screen bg-gray-50 p-8">
      {connectionBanner}
      <DynamicClientDashboard initialData={analysisData} />
    </main>
  );
}
