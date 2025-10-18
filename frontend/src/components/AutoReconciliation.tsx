// src/components/AutoReconciliation.tsx
"use client";

import { useState, useEffect } from 'react';
import { Check, X, Loader2, AlertCircle, Upload, FileText, Trash2, RefreshCw, AlertTriangle, Info } from 'lucide-react';

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
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const [isPdfFile, setIsPdfFile] = useState(false);

  // Load pending matches and transactions on component mount
  useEffect(() => {
    fetchPendingMatches();
    fetchTransactions();
  }, []);

  const fetchPendingMatches = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/reconciliation/pending_matches?user_id=${userId}`);

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
      setError('Failed to connect to server. Please check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/reconciliation/bank_transactions?user_id=${userId}`
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

    // Check if it's a PDF
    const isPdf = fileExtension === '.pdf';
    setIsPdfFile(isPdf);

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `http://localhost:8000/api/v1/reconciliation/upload_bank_statement?user_id=${userId}`,
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
        `http://localhost:8000/api/v1/reconciliation/bank_transactions/${transactionId}`,
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
      const response = await fetch(`http://localhost:8000/api/v1/reconciliation/auto_match?user_id=${userId}`, {
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
      const response = await fetch(`http://localhost:8000/api/v1/reconciliation/approve_match/${matchId}?user_id=${userId}`, {
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
      const response = await fetch(`http://localhost:8000/api/v1/reconciliation/reject_match/${matchId}?user_id=${userId}`, {
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
      const response = await fetch(`http://localhost:8000/api/v1/reconciliation/bulk_approve?user_id=${userId}`, {
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-500';
    if (confidence >= 70) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-500/10 border-green-500/30';
    if (confidence >= 70) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-orange-500/10 border-orange-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Auto-Reconciliation</h2>
          <p className="text-slate-400 mt-1">Upload bank statements and review suggested transaction matches</p>
        </div>
        <button
          onClick={runAutoMatch}
          disabled={isLoading || transactions.length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Auto-Match
            </>
          )}
        </button>
      </div>

      {/* Upload Bank Statement Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Bank Statement
          </h3>
          <button
            onClick={() => setShowUploadSection(!showUploadSection)}
            className="text-sm text-slate-400 hover:text-white"
          >
            {showUploadSection ? 'Hide' : 'Show'}
          </button>
        </div>

        {showUploadSection && (
          <div className="space-y-4">
            {/* File Input */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                <FileText className="w-4 h-4" />
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
                <div className="flex items-center gap-2 text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Uploading and processing...</span>
                </div>
              )}
            </div>

            {/* Format Support Info */}
            <div className="bg-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-medium text-white mb-1">Supported formats:</p>
                  <ul className="space-y-1">
                    <li>• <span className="text-green-400">CSV, Excel (.xlsx, .xls)</span> - Recommended (95%+ accuracy)</li>
                    <li>• <span className="text-yellow-400">PDF</span> - Experimental (70-80% accuracy)</li>
                  </ul>
                  <p className="mt-2 text-slate-400">Required columns: Date, Description, Amount (or Debit/Credit)</p>
                </div>
              </div>
            </div>

            {/* PDF Warning Banner */}
            {isPdfFile && !uploadResult && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-400 mb-1">
                      PDF Parsing is Experimental
                    </p>
                    <p className="text-sm text-yellow-300 mb-2">
                      PDF statements have ~70-80% accuracy due to varying bank formats. 
                      We recommend using CSV or Excel exports from your bank for best results.
                    </p>
                    <p className="text-xs text-yellow-400">
                      <strong>After upload:</strong> Please carefully review all extracted transactions before running auto-match.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {uploadResult && (
              <div className={`${
                uploadResult.details.accuracy_note 
                  ? 'bg-yellow-500/10 border-yellow-500/30' 
                  : 'bg-green-500/10 border-green-500/30'
              } border rounded-lg p-4`}>
                <div className="flex items-start gap-2">
                  <Check className={`w-5 h-5 ${
                    uploadResult.details.accuracy_note ? 'text-yellow-500' : 'text-green-500'
                  } flex-shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <p className={`font-medium ${
                      uploadResult.details.accuracy_note ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {uploadResult.message}
                    </p>
                    <ul className={`mt-2 text-sm ${
                      uploadResult.details.accuracy_note ? 'text-yellow-300' : 'text-green-300'
                    } space-y-1`}>
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
                        <li className="text-red-400">• Parsing errors: {uploadResult.details.errors}</li>
                      )}
                    </ul>
                    {uploadResult.details.accuracy_note && (
                      <div className="mt-3 p-2 bg-yellow-500/20 rounded text-xs text-yellow-200">
                        ⚠️ {uploadResult.details.accuracy_note}
                      </div>
                    )}
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-xs text-yellow-300 cursor-pointer hover:text-yellow-200">
                          View parsing errors ({uploadResult.errors.length})
                        </summary>
                        <ul className="mt-2 text-xs text-yellow-200 space-y-1 ml-4">
                          {uploadResult.errors.map((err: string, i: number) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-400">{uploadError}</p>
                    {uploadError.toLowerCase().includes('pdf') && (
                      <p className="text-xs text-red-300 mt-2">
                        💡 Tip: Try downloading a CSV export from your bank's website for better accuracy.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bank Transactions List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Bank Transactions ({transactions.length})
          </h3>
          {transactions.length > 0 && (
            <button
              onClick={fetchTransactions}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>

        {loadingTransactions ? (
          <div className="text-center py-8 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No transactions yet. Upload a bank statement to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Description</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-300">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Notes</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-sm text-slate-300">{txn.date}</td>
                    <td className="py-3 px-4 text-sm text-white">{txn.description}</td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${
                      txn.amount >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${Math.abs(txn.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-400">{txn.notes || '-'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => deleteTransaction(txn.id)}
                        className="text-red-400 hover:text-red-300 p-1"
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

      {/* Summary */}
      {summary && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Match Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Total Matches</p>
              <p className="text-2xl font-bold text-white">{summary.matches_found}</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-slate-400 text-sm">High Confidence</p>
              <p className="text-2xl font-bold text-green-500">{summary.high_confidence}</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Need Review</p>
              <p className="text-2xl font-bold text-yellow-500">
                {summary.medium_confidence + summary.low_confidence}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {matches.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
          <div className="text-sm text-slate-300">
            {matches.filter(m => m.confidence >= 90).length} high-confidence matches ready to approve
          </div>
          <button
            onClick={bulkApprove}
            disabled={isLoading}
            className="btn-primary text-sm"
          >
            Approve All High Confidence (≥90%)
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Matches List or Empty State */}
      {!error && matches.length === 0 ? (
        <div className="card text-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-slate-500" />
            </div>
            <div>
              <p className="text-slate-300 text-lg font-medium">No pending matches to review</p>
              <p className="text-slate-500 text-sm mt-2">
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
              className={`card border-2 ${getConfidenceBgColor(match.confidence)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(match.confidence)}`}>
                    {match.confidence.toFixed(0)}% Match
                  </div>
                  <span className="text-slate-400 text-sm">{match.reason}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveMatch(match.match_id)}
                    disabled={processingMatch === match.match_id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-blue-400 uppercase">Bank Transaction</h4>
                  <div className="space-y-1">
                    <p className="text-white font-medium">{match.bank.description}</p>
                    <p className="text-slate-400 text-sm">Date: {match.bank.date}</p>
                    <p className="text-lg font-bold text-white">
                      ${Math.abs(match.bank.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-purple-400 uppercase">Ledger Entry</h4>
                  <div className="space-y-1">
                    <p className="text-white font-medium">{match.ledger.description}</p>
                    {match.ledger.vendor && (
                      <p className="text-slate-400 text-sm">Vendor: {match.ledger.vendor}</p>
                    )}
                    <p className="text-slate-400 text-sm">Date: {match.ledger.date}</p>
                    <p className="text-lg font-bold text-white">
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
  );
}