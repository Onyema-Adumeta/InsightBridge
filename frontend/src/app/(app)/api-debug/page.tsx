// API Response Inspector
// Temporary component to debug what data is available
// Place this at: src/app/(app)/api-debug/page.tsx

'use client';

import { useState } from 'react';

export default function APIDebugPage() {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analysis_summary');
      const data = await res.json();
      setResponse(data);
      console.log('Full API Response:', data);
    } catch (error) {
      console.error('Error:', error);
      setResponse({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const extractedValues = response ? {
    // Try kpiCardData path
    cash_from_kpiCardData: response.kpiCardData?.balanceSheet?.cash?.value,
    revenue_from_kpiCardData: response.kpiCardData?.profitLoss?.total_revenue?.value,
    
    // Try kpis path
    cash_from_kpis: response.kpis?.balanceSheet?.cash,
    revenue_from_kpis: response.kpis?.profitLoss?.totalRevenue,
    cogs_from_kpis: response.kpis?.profitLoss?.costOfGoodsSold,
    opex_from_kpis: response.kpis?.profitLoss?.operatingExpenses,
  } : null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Response Inspector</h1>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Test /api/analysis_summary'}
      </button>

      {extractedValues && (
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Extracted Values:</h2>
          <div className="space-y-2 font-mono text-sm">
            {Object.entries(extractedValues).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-blue-900">{key}:</span>
                <span className="font-bold">{value || 'null'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {response && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Full API Response:</h2>
          <pre className="bg-slate-900 text-green-400 p-6 rounded-lg overflow-auto max-h-[600px] text-xs">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <h3 className="font-bold mb-2">📋 Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click "Test /api/analysis_summary" button</li>
          <li>Look at the "Extracted Values" section - these should show your financial data</li>
          <li>Check the "Full API Response" to see the complete data structure</li>
          <li>Share this output so we can fix the data extraction</li>
        </ol>
      </div>
    </div>
  );
}