'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import DynamicClientDashboard from '@/components/ClientDashboard';
import LoadingDashboard from '@/components/LoadingDashboard';


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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
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

      // ✅ REMOVED: Health check that references undefined apiUrl

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
        if (isDevelopment) console.log(`🔄 Auto-retry ${retryCount + 1}/3 in 3 seconds...`);
        setRetryCount(prev => prev + 1);
        
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
  }, [user, isLoaded, isSignedIn]);

  // Manual refresh function
  const handleRefresh = () => {
    if (isDevelopment) console.log('🔄 Manual refresh triggered');
    setRetryCount(0);
    fetchData();
  };

  // ✅ Loading states
  if (!isLoaded) return <LoadingDashboard />;
  if (loading && !analysisData) return <LoadingDashboard />;

  // ✅ Not signed in
  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white max-w-md p-8">
          <div className="mb-6">
            <svg 
              className="w-20 h-20 mx-auto text-blue-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4">Authentication Required</h2>
          <p className="text-slate-300 mb-6">Please sign in to view your dashboard.</p>
          <a 
            href="/sign-in" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // ✅ Connection status banner (minimal, non-intrusive)
  const connectionBanner = connectionStatus === 'connecting' && retryCount > 0 ? (
    <div className="bg-blue-900/30 border-l-4 border-blue-500 p-3 mb-4">
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
        <p className="text-blue-100 text-sm">Connecting to server...</p>
      </div>
    </div>
  ) : null;

  // ✅ Render dashboard (even if analysisData is null - let ClientDashboard handle it)
  return (
    <div>
      {connectionBanner}
      <DynamicClientDashboard initialData={analysisData} />
    </div>
  );
}