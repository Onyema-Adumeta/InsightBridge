// src/components/AutoReconciliation.tsx
"use client";

import { useState, useEffect } from 'react';
import { Check, X, Loader2, AlertCircle, Upload, FileText, Trash2, RefreshCw, AlertTriangle, Info, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Calendar, Tag, Brain, Sparkles, Zap } from 'lucide-react';

interface Match {
  match_id: number;
  confidence: number;
  reason: string;
  bank: {
    date: string;
    description: string;
    amount: number;
  };
  ledger: {
    date: string;
    description: string;
    amount: number;
    vendor: string | null;
  };
}

interface MatchSummary {
  total_bank_transactions: number;
  total_ledger_entries: number;
  matches_found: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
}

interface BankTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  notes?: string;
  created_at: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  details: {
    total_rows: number;
    valid_rows: number;
    inserted: number;
    duplicates_skipped: number;
    errors?: number;
    accuracy_note?: string;
  };
  errors?: string[];
}

export default function AutoReconciliation({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMatch, setProcessingMatch] = useState<number | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const [isPdfFile, setIsPdfFile] = useState(false);
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    console.log('🧹 Reconciliation page loaded - clearing old data');
    
    setMatches([]);
    setSummary(null);
    setError(null);
    setUploadResult(null);
    setUploadError(null);
    setTransactions([]);
    setAnalytics(null);
    setShowAnalytics(false);
    setIsPdfFile(false);
    setProcessingMatch(null);
    
    localStorage.removeItem('reconciliationData');
    localStorage.removeItem('bankTransactions');
    localStorage.removeItem('matches');
    sessionStorage.removeItem('reconciliationData');
    sessionStorage.removeItem('bankTransactions');
    
    fetchPendingMatches();
    fetchTransactions();
  }, [userId]);

  useEffect(() => {
    if (transactions.length > 0 && uploadResult) {
      calculateAnalytics();
    } else {
      setAnalytics(null);
      setShowAnalytics(false);
    }
  }, [transactions, uploadResult]);

  const calculateAnalytics = () => {
    if (transactions.length === 0) {
      setAnalytics(null);
      return;
    }
    
    const totalInflow = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netFlow = totalInflow - totalOutflow;
    
    const categories: Record<string, { count: number; total: number }> = {};
    transactions.forEach(txn => {
      const category = detectCategory(txn.description);
      if (!categories[category]) {
        categories[category] = { count: 0, total: 0 };
      }
      categories[category].count++;
      categories[category].total += Math.abs(txn.amount);
    });

    const merchants: Record<string, number> = {};
    transactions.forEach(txn => {
      const merchant = txn.description.split(' ')[0];
      merchants[merchant] = (merchants[merchant] || 0) + 1;
    });

    const dayOfWeekSpending: Record<string, number> = {
      'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
    };
    transactions.forEach(txn => {
      if (txn.amount < 0) {
        const date = new Date(txn.date);
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        dayOfWeekSpending[day] += Math.abs(txn.amount);
      }
    });

    const avgTransaction = totalOutflow / transactions.filter(t => t.amount < 0).length || 0;
    const unusualTransactions = transactions.filter(t => 
      t.amount < 0 && Math.abs(t.amount) > avgTransaction * 3
    );

    const descriptions = transactions.map(t => t.description.toLowerCase());
    const recurring = descriptions.filter((desc, idx) => 
      descriptions.indexOf(desc) !== idx
    ).filter((v, i, a) => a.indexOf(v) === i);

    setAnalytics({
      totalInflow,
      totalOutflow,
      netFlow,
      categories: Object.entries(categories)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5),
      topMerchants: Object.entries(merchants)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      dayOfWeekSpending,
      unusualTransactions,
      recurringCount: recurring.length,
      avgTransactionSize: avgTransaction,
      largestTransaction: Math.max(...transactions.map(t => Math.abs(t.amount))),
    });
  };

  const detectCategory = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('fee') || desc.includes('charge')) return 'Banking Fees';
    if (desc.includes('interest')) return 'Interest';
    if (desc.includes('transfer') || desc.includes('payment')) return 'Transfers';
    if (desc.includes('deposit') || desc.includes('direct deposit')) return 'Income';
    if (desc.includes('atm') || desc.includes('withdrawal')) return 'Cash';
    if (desc.includes('check')) return 'Checks';
    if (desc.includes('purchase') || desc.includes('pos')) return 'Purchases';
    return 'Other';
  };

  const fetchPendingMatches = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/reconciliation/pending_matches?user_id=${userId}`);

      if (!response.ok) {
        if (response.status === 500) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.detail || 'Failed to fetch matches');
        } else if (response.status === 404) {
          setMatches([]);
          setError(null);
        }
        return;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setMatches(data.data);
        setError(null);
      } else if (data.matches) {
        setMatches(data.matches);
        setError(null);
      } else {
        setMatches([]);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/reconciliation/bank_transactions?user_id=${userId}`
      );
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['.csv', '.xlsx', '.xls', '.pdf']; 
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      setUploadError('Please upload a CSV, Excel, or PDF file');
      return;
    }

    const isPdf = fileExtension === '.pdf';
    setIsPdfFile(isPdf);

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${apiUrl}/api/v1/reconciliation/upload_bank_statement?user_id=${userId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result: UploadResult = await response.json();
      setUploadResult(result);
      
      await fetchTransactions();
      
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const deleteTransaction = async (transactionId: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/reconciliation/bank_transactions/${transactionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Delete failed');

      await fetchTransactions();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const runAutoMatch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/reconciliation/auto_match?user_id=${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Auto-match failed');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setSummary(data.data);
      } else if (data.summary) {
        setSummary(data.summary);
      }
      
      await fetchPendingMatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-match failed');
    } finally {
      setIsLoading(false);
    }
  };

  const approveMatch = async (matchId: number) => {
    setProcessingMatch(matchId);

    try {
      const response = await fetch(`${apiUrl}/api/v1/reconciliation/approve_match/${matchId}?user_id=${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to approve match');
      }

      setMatches(matches.filter(m => m.match_id !== matchId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve match');
    } finally {
      setProcessingMatch(null);
    }
  };

  const rejectMatch = async (matchId: number) => {
    setProcessingMatch(matchId);

    try {
      const response = await fetch(`${apiUrl}/api/v1/reconciliation/reject_match/${matchId}?user_id=${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to reject match');
      }

      setMatches(matches.filter(m => m.match_id !== matchId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject match');
    } finally {
      setProcessingMatch(null);
    }
  };

  const bulkApprove = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/v1/reconciliation/bulk_approve?user_id=${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Bulk approve failed');
      }

      await fetchPendingMatches();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk approve failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (transactions.length > 0 && !confirm('Are you sure you want to clear all data?')) {
      return;
    }
    
    setUploadResult(null);
    setUploadError(null);
    setTransactions([]);
    setMatches([]);
    setSummary(null);
    setError(null);
    setAnalytics(null);
    setShowAnalytics(false);
    setIsPdfFile(false);
    
    localStorage.removeItem('reconciliationData');
    localStorage.removeItem('bankTransactions');
    sessionStorage.removeItem('reconciliationData');
    
    try {
      await fetch(`${apiUrl}/api/v1/reconciliation/clear_transactions?user_id=${userId}`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to clear backend data:', err);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-emerald-600';
    if (confidence >= 70) return 'text-amber-600';
    return 'text-orange-600';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-emerald-50 border-emerald-200';
    if (confidence >= 70) return 'bg-amber-50 border-amber-200';
    return 'bg-orange-50 border-orange-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Zap className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold">Auto-Reconciliation</h1>
              </div>
              <p className="text-indigo-100 text-lg">
                Upload bank statements and review AI-suggested transaction matches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-medium transition-all border-2 border-white/30"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={runAutoMatch}
                disabled={isLoading || transactions.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Run Auto-Match
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {analytics && transactions.length > 0 && uploadResult && (
          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">AI-Powered Insights</h3>
                    <p className="text-sm text-slate-600">Advanced analytics not available in standard banking apps</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="px-4 py-2 bg-white border-2 border-indigo-300 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
                >
                  {showAnalytics ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border-2 border-green-200 shadow-md hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Total Inflow</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">
                    ${analytics.totalInflow.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-5 border-2 border-red-200 shadow-md hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Total Outflow</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">
                    ${analytics.totalOutflow.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-md hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Net Flow</span>
                  </div>
                  <p className={`text-3xl font-bold ${analytics.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(analytics.netFlow).toFixed(2)}
                  </p>
                </div>
              </div>

              {showAnalytics && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-md">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <PieChart className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">Spending by Category</h4>
                    </div>
                    <div className="space-y-4">
                      {analytics.categories.map(([category, data]: [string, any], idx: number) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-700 font-semibold">{category}</span>
                            <span className="text-slate-900 font-bold">${data.total.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${(data.total / analytics.totalOutflow) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500">{data.count} transactions</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-md">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Tag className="w-6 h-6 text-purple-600" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">Top Merchants</h4>
                    </div>
                    <div className="space-y-3">
                      {analytics.topMerchants.map(([merchant, count]: [string, number], idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                          <span className="text-sm font-semibold text-slate-700">{merchant}</span>
                          <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">{count} txns</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-md">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">Spending by Day of Week</h4>
                    </div>
                    <div className="flex items-end justify-between gap-3 h-40">
                      {Object.entries(analytics.dayOfWeekSpending).map(([day, amount]: [string, number]) => {
                        const maxAmount = Math.max(...Object.values(analytics.dayOfWeekSpending));
                        const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                        return (
                          <div key={day} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                              className="w-full bg-gradient-to-t from-blue-500 to-blue-300 hover:from-blue-600 hover:to-blue-400 rounded-t-lg transition-all relative group shadow-md" 
                              style={{ height: `${height}%` }}
                            >
                              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-semibold shadow-xl">
                                ${amount.toFixed(0)}
                              </div>
                            </div>
                            <span className="text-xs text-slate-600 font-bold">{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {analytics.unusualTransactions.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 shadow-lg">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-500 rounded-xl">
                          <AlertTriangle className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-amber-900 mb-2">
                            {analytics.unusualTransactions.length} Unusual Transaction{analytics.unusualTransactions.length > 1 ? 's' : ''} Detected
                          </h4>
                          <p className="text-sm text-amber-700 mb-4 font-medium">
                            These transactions are 3x larger than your average transaction (${analytics.avgTransactionSize.toFixed(2)})
                          </p>
                          <div className="space-y-3">
                            {analytics.unusualTransactions.slice(0, 3).map((txn: BankTransaction, idx: number) => (
                              <div key={idx} className="bg-white rounded-xl p-4 border-2 border-amber-200 shadow-md">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-slate-900">{txn.description}</p>
                                    <p className="text-xs text-slate-500 mt-1">{txn.date}</p>
                                  </div>
                                  <p className="text-xl font-bold text-red-600">${Math.abs(txn.amount).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-md">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">Smart Insights</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm hover:shadow-lg transition-shadow">
                        <p className="text-xs text-blue-700 font-bold mb-1 uppercase tracking-wide">Avg Transaction</p>
                        <p className="text-2xl font-bold text-slate-900">${analytics.avgTransactionSize.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-sm hover:shadow-lg transition-shadow">
                        <p className="text-xs text-purple-700 font-bold mb-1 uppercase tracking-wide">Largest Transaction</p>
                        <p className="text-2xl font-bold text-slate-900">${analytics.largestTransaction.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm hover:shadow-lg transition-shadow">
                        <p className="text-xs text-green-700 font-bold mb-1 uppercase tracking-wide">Recurring Payments</p>
                        <p className="text-2xl font-bold text-slate-900">{analytics.recurringCount}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-lg transition-shadow">
                        <p className="text-xs text-orange-700 font-bold mb-1 uppercase tracking-wide">Unique Merchants</p>
                        <p className="text-2xl font-bold text-slate-900">{analytics.topMerchants.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Upload Bank Statement
            </h3>
            <button
              onClick={() => setShowUploadSection(!showUploadSection)}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium"
            >
              {showUploadSection ? 'Hide' : 'Show'}
            </button>
          </div>

          {showUploadSection && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl cursor-pointer transition-all shadow-md hover:shadow-xl font-semibold">
                  <FileText className="w-5 h-5" />
                  Choose File
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                {uploading && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Uploading and processing...</span>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-700">
                    <p className="font-semibold text-slate-900 mb-2">Supported formats:</p>
                    <ul className="space-y-1">
                      <li>• <span className="text-green-600 font-semibold">CSV, Excel (.xlsx, .xls)</span> - Recommended (95%+ accuracy)</li>
                      <li>• <span className="text-amber-600 font-semibold">PDF</span> - Experimental (70-80% accuracy)</li>
                    </ul>
                    <p className="mt-2 text-slate-600 text-xs">Required columns: Date, Description, Amount (or Debit/Credit)</p>
                  </div>
                </div>
              </div>

              {isPdfFile && !uploadResult && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 mb-1">
                        PDF Parsing is Experimental
                      </p>
                      <p className="text-sm text-amber-700 mb-2">
                        PDF statements have ~70-80% accuracy due to varying bank formats. 
                        We recommend using CSV or Excel exports from your bank for best results.
                      </p>
                      <p className="text-xs text-amber-800 font-medium">
                        After upload: Please carefully review all extracted transactions before running auto-match.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {uploadResult && (
                <div className={`${
                  uploadResult.details.accuracy_note 
                    ? 'bg-amber-50 border-amber-300' 
                    : 'bg-emerald-50 border-emerald-300'
                } border-2 rounded-xl p-4`}>
                  <div className="flex items-start gap-3">
                    <Check className={`w-6 h-6 ${
                      uploadResult.details.accuracy_note ? 'text-amber-600' : 'text-emerald-600'
                    } flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <p className={`font-bold ${
                        uploadResult.details.accuracy_note ? 'text-amber-900' : 'text-emerald-900'
                      } mb-2`}>
                        {uploadResult.message}
                      </p>
                      <ul className={`text-sm ${
                        uploadResult.details.accuracy_note ? 'text-amber-700' : 'text-emerald-700'
                      } space-y-1 font-medium`}>
                        {uploadResult.details.total_rows && (
                          <li>• Total rows: {uploadResult.details.total_rows}</li>
                        )}
                        {uploadResult.details.valid_rows && (
                          <li>• Valid rows: {uploadResult.details.valid_rows}</li>
                        )}
                        <li>• Inserted: {uploadResult.details.inserted}</li>
                        {uploadResult.details.duplicates_skipped > 0 && (
                          <li>• Duplicates skipped: {uploadResult.details.duplicates_skipped}</li>
                        )}
                        {uploadResult.details.errors && uploadResult.details.errors > 0 && (
                          <li className="text-red-600">• Parsing errors: {uploadResult.details.errors}</li>
                        )}
                      </ul>
                      {uploadResult.details.accuracy_note && (
                        <div className="mt-3 p-3 bg-amber-100 rounded-lg text-xs text-amber-800 font-medium">
                          ⚠️ {uploadResult.details.accuracy_note}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-medium">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Bank Transactions ({transactions.length})
            </h3>
            {transactions.length > 0 && (
              <button
                onClick={fetchTransactions}
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}
          </div>

          {loadingTransactions ? (
            <div className="text-center py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600">No transactions yet. Upload a bank statement to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Notes</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-600">{txn.date}</td>
                      <td className="py-3 px-4 text-sm text-slate-900 font-medium">{txn.description}</td>
                      <td className={`py-3 px-4 text-sm text-right font-bold ${
                        txn.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        ${Math.abs(txn.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">{txn.notes || '-'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteTransaction(txn.id)}
                          className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {summary && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Match Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border-2 border-slate-200">
                <p className="text-slate-600 text-sm font-medium mb-1">Total Matches</p>
                <p className="text-3xl font-bold text-slate-900">{summary.matches_found}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-5 border-2 border-emerald-200">
                <p className="text-emerald-700 text-sm font-medium mb-1">High Confidence</p>
                <p className="text-3xl font-bold text-emerald-600">{summary.high_confidence}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl p-5 border-2 border-amber-200">
                <p className="text-amber-700 text-sm font-medium mb-1">Need Review</p>
                <p className="text-3xl font-bold text-amber-600">
                  {summary.medium_confidence + summary.low_confidence}
                </p>
              </div>
            </div>
          </div>
        )}

        {matches.length > 0 && (
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
            <div className="text-sm text-slate-700 font-medium">
              {matches.filter(m => m.confidence >= 90).length} high-confidence matches ready to approve
            </div>
            <button
              onClick={bulkApprove}
              disabled={isLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all disabled:opacity-50"
            >
              Approve All High Confidence (≥90%)
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {!error && matches.length === 0 ? (
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg text-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-700 text-lg font-semibold mb-2">No pending matches to review</p>
                <p className="text-slate-500 text-sm">
                  {transactions.length === 0 
                    ? 'Upload bank transactions first, then click "Run Auto-Match"'
                    : 'Click "Run Auto-Match" to find transaction matches'}
                </p>
              </div>
            </div>
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.match_id}
                className={`bg-white shadow-lg border-2 ${getConfidenceBgColor(match.confidence)} p-6 rounded-2xl`}
              >
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${getConfidenceColor(match.confidence)} bg-white`}>
                      {match.confidence.toFixed(0)}% Match
                    </div>
                    <span className="text-slate-600 text-sm font-medium">{match.reason}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveMatch(match.match_id)}
                      disabled={processingMatch === match.match_id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-xl disabled:opacity-50"
                    >
                      {processingMatch === match.match_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => rejectMatch(match.match_id)}
                      disabled={processingMatch === match.match_id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-xl disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Bank Transaction</h4>
                    <div className="space-y-1">
                      <p className="text-slate-900 font-semibold text-lg">{match.bank.description}</p>
                      <p className="text-slate-500 text-sm">Date: {match.bank.date}</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${Math.abs(match.bank.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider">Ledger Entry</h4>
                    <div className="space-y-1">
                      <p className="text-slate-900 font-semibold text-lg">{match.ledger.description}</p>
                      {match.ledger.vendor && (
                        <p className="text-slate-500 text-sm">Vendor: {match.ledger.vendor}</p>
                      )}
                      <p className="text-slate-500 text-sm">Date: {match.ledger.date}</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${Math.abs(match.ledger.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}