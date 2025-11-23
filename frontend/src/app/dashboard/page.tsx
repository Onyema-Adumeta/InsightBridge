'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Lock } from 'lucide-react';
import DynamicClientDashboard from '@/components/ClientDashboard';

// ✅ Force dynamic rendering
export const dynamic = 'force-dynamic';

const LoadingDashboard = () => (
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
);

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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [retryCount, setRetryCount] = useState(0);

  const isDevelopment = process.env.NODE_ENV === 'development';

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

      const url = `/api/v1/main/analysis_summary?user_id=${user.id}`;

      if (isDevelopment) {
        console.log('🔍 Fetching from:', url);
        console.log('🔑 User ID:', user.id);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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
      }

      setAnalysisData(data);
      setConnectionStatus('connected');
      setRetryCount(0);
    } catch (err: any) {
      if (isDevelopment) {
        console.error('💥 Error:', err.message);
      }

      setConnectionStatus('error');

      if (!isRetry && retryCount < 3) {
        if (isDevelopment)
          console.log(`🔄 Auto-retry ${retryCount + 1}/3 in 3 seconds...`);
        setRetryCount((prev) => prev + 1);

        setTimeout(() => {
          fetchData(true);
        }, 3000);
        return;
      }

      if (isDevelopment) console.warn('⚠️ All retries exhausted, showing welcome screen');

      setAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    const handleAnalysisUpdate = (event: any) => {
      if (isDevelopment) console.log('🔄 Analysis updated event received:', event.detail);

      setTimeout(() => {
        if (isDevelopment) console.log('🔄 Refetching analysis data...');
        setRetryCount(0);
        fetchData();
      }, 500);
    };

    window.addEventListener('analysisUpdated', handleAnalysisUpdate as EventListener);

    return () => {
      window.removeEventListener('analysisUpdated', handleAnalysisUpdate as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoaded, isSignedIn]);

  if (!isLoaded || (loading && !analysisData)) {
    return (
      {/* ✅ FIXED: Added overflow-x-hidden and proper width constraint */}
      <main className="lg:ml-64 min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-[calc(100vw-16rem)] lg:max-w-full p-8">
          <LoadingDashboard />
        </div>
      </main>
    );
  }

  if (isLoaded && !isSignedIn) {
    return (
      {/* ✅ FIXED: Added overflow-x-hidden */}
      <main className="lg:ml-64 flex min-h-screen items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mb-6">
            <Lock className="mx-auto h-16 w-16 text-indigo-600" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            Authentication Required
          </h2>
          <p className="mb-6 text-slate-600">
            Please sign in to view your dashboard.
          </p>
          <a
            href="/sign-in"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm"
          >
            Sign In
          </a>
        </div>
      </main>
    );
  }

  const connectionBanner =
    connectionStatus === 'connecting' && retryCount > 0 ? (
      <div className="mb-4 border-l-4 border-blue-500 bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center">
          <div className="mr-3 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-sm text-blue-700">Connecting to server...</p>
        </div>
      </div>
    ) : null;

  return (
    {/* ✅ FIXED: Added overflow-x-hidden and min-w-0 to prevent overflow */}
    <main className="lg:ml-64 min-h-screen min-w-0 overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {connectionBanner}
      <DynamicClientDashboard initialData={analysisData} />
    </main>
  );
}