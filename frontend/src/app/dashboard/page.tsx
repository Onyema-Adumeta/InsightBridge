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

  const connectionBanner = connectionStatus === 'error' ? (
    <div className="bg-red-50 border-b border-red-200 p-4">
      <p className="text-sm text-red-800 text-center">
        Unable to connect to the server. Please check your connection and try again.
      </p>
    </div>
  ) : connectionStatus === 'connecting' ? (
    <div className="bg-blue-50 border-b border-blue-200 p-4">
      <p className="text-sm text-blue-800 text-center">
        Connecting to server...
      </p>
    </div>
  ) : null;

  const fetchData = async (isRetry = false) => {
    if (!isLoaded) {
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
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
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
        if (isDevelopment) console.log(`🔄 Retrying... (${retryCount + 1}/3)`);
        setRetryCount(retryCount + 1);
        setTimeout(() => fetchData(true), 2000 * (retryCount + 1));
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
        fetchData();
      }, 500);
    };

    window.addEventListener('analysisUpdated', handleAnalysisUpdate as EventListener);

    return () => {
      window.removeEventListener('analysisUpdated', handleAnalysisUpdate as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoaded, isSignedIn]);

  // LOADING STATE - NO <main> wrapper!
  if (!isLoaded || (loading && !analysisData)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 w-full p-8">
        <LoadingDashboard />
      </div>
    );
  }

  // NOT SIGNED IN STATE - NO <main> wrapper!
  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8">
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
      </div>
    );
  }

  // MAIN CONTENT - NO <main> wrapper! The layout.tsx already has it
  return (
    <>
      {connectionBanner}
      <DynamicClientDashboard initialData={analysisData} />
    </>
  );
}