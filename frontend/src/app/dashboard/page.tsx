'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import DynamicClientDashboard from '@/components/ClientDashboard';
import LoadingDashboard from '@/components/LoadingDashboard';

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
  const [error, setError] = useState<string | null>(null);

  // Function to fetch data
  const fetchData = async () => {
    if (!isLoaded) {
      console.log('⏳ Clerk not loaded yet...');
      return;
    }

    if (!isSignedIn || !user) {
      console.log('🔐 User not signed in');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const url = `${apiUrl}/api/v1/main/analysis_summary?user_id=${user.id}`;
      
      console.log('🔍 Fetching from:', url);
      console.log('🌐 API Base URL:', apiUrl);
      console.log('🔑 User ID:', user.id);

      // First, test if backend is reachable
      try {
        const healthCheck = await fetch(`${apiUrl}/health`, { 
          method: 'GET',
          cache: 'no-store' 
        });
        console.log('💚 Health check status:', healthCheck.status);
      } catch (healthError) {
        console.error('❌ Health check failed:', healthError);
        throw new Error('Backend server is not reachable');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status}`, errorText);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Analysis data received:', data);
      console.log('📊 Summary:', data.summary);
      console.log('📁 Items count:', data.items?.length || 0);
      console.log('📁 Items:', data.items);
      console.log('🕐 Updated at:', data.updated_at);
      console.log('🔍 Full data object:', JSON.stringify(data, null, 2));
      
      setAnalysisData(data);

    } catch (err: any) {
      console.error('💥 Full error object:', err);
      console.error('💥 Error name:', err.name);
      console.error('💥 Error message:', err.message);
      
      if (err.name === 'AbortError') {
        setError('Request timeout - server took too long to respond');
      } else if (err.message?.includes('reachable')) {
        setError('Backend server is not running. Start it with: cd backend && python app.py');
      } else {
        setError(`Connection failed: ${err.message}`);
      }

      // Use mock data
      console.warn('⚠️ Using mock data');
      setAnalysisData({
        user_id: user?.id || 'demo',
        summary: "⚠️ Demo Mode - Backend not connected",
        items: [],
        updated_at: null,
        company: "Demo Company"
      });
      
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
      console.log('🔄 Analysis updated event received:', event.detail);
      // Refetch data after a short delay to ensure backend has processed
      setTimeout(() => {
        console.log('🔄 Refetching analysis data...');
        fetchData();
      }, 500);
    };

    window.addEventListener('analysisUpdated', handleAnalysisUpdate as EventListener);
    
    return () => {
      window.removeEventListener('analysisUpdated', handleAnalysisUpdate as EventListener);
    };
  }, [user, isLoaded, isSignedIn]);

  // Manual refresh function (you can add a button for this)
  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchData();
  };

  // ✅ Updated loading gate: only block if we don't yet have data
  if (!isLoaded && !analysisData) return <LoadingDashboard />;
  if (loading && !analysisData)   return <LoadingDashboard />;

  // ✅ Show "Not signed in" only when Clerk is fully loaded
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

  // Show error banner but still render dashboard with mock or real data
  const errorBanner = error ? (
    <div className="bg-yellow-900/50 border-l-4 border-yellow-500 p-4 mb-4">
      <div className="flex items-center">
        <svg className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <p className="text-yellow-200 font-semibold">Backend Connection Issue</p>
          <p className="text-yellow-100 text-sm">{error}</p>
          <p className="text-yellow-100 text-xs mt-1">
            Start backend: <code className="bg-yellow-800 px-2 py-0.5 rounded font-mono">cd backend && python app.py</code>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="ml-4 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  ) : null;

  // Debug info banner (remove in production)
  const debugBanner = (
    <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-blue-200 font-semibold text-sm">Debug Info</p>
          <p className="text-blue-100 text-xs">
            User: {user?.id} | Items: {analysisData?.items?.length || 0} | Updated: {analysisData?.updated_at || 'Never'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="ml-4 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );

  // Success - render dashboard (even with mock data)
  if (analysisData) {
    return (
      <div>
        {errorBanner}
        {debugBanner}
        <DynamicClientDashboard initialData={analysisData} />
      </div>
    );
  }

  // Fallback (very unlikely to hit now)
  return <LoadingDashboard />;
}
