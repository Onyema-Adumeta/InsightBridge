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

  // ✅ DEFINE API URL ONCE
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Load pending matches and transactions on component mount
  useEffect(() => {
    fetchPendingMatches();
    fetchTransactions();
  }, [userId]); // Add userId as dependency

  const fetchPendingMatches = async () => {
    setIsLoading(true);
    
    try {
      // ✅ Use apiUrl
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
      setError('Failed to connect to server. Please check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      // ✅ Use apiUrl
      const response = await fetch(
        `${apiUrl}/api/v1/reconciliation/bank_transactions?user_id=${userId}`
      );
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      // Add error state for transactions
      setError('Failed to fetch transactions. Please check if the backend is running.');
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

      // ✅ Use apiUrl
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
      
      await fetchTransactions(); // Refresh transactions list
      
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const deleteTransaction = async (transactionId: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      // ✅ Use apiUrl
      const response = await fetch(
        `${apiUrl}/api/v1/reconciliation/bank_transactions/${transactionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Delete failed');

      await fetchTransactions(); // Refresh transactions list
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const runAutoMatch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // ✅ Use apiUrl
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
      
      await fetchPendingMatches(); // Refresh matches list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-match failed');
    } finally {
      setIsLoading(false);
    }
  };

  const approveMatch = async (matchId: number) => {
    setProcessingMatch(matchId);

    try {
      // ✅ Use apiUrl
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
      // ✅ Use apiUrl
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
      // ✅ Use apiUrl
      const response = await fetch(`${apiUrl}/api/v1/reconciliation/bulk_approve?user_id=${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Bulk approve failed');
      }

      await fetchPendingMatches(); // Refresh matches list
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk approve failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-50 border-green-200';
    if (confidence >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-orange-50 border-orange-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auto-Reconciliation</h2>
          <p className="text-gray-500 mt-1">Upload bank statements and review suggested transaction matches</p>
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
      <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Bank Statement
          </h3>
          <button
            onClick={() => setShowUploadSection(!showUploadSection)}
            className="text-sm text-gray-500 hover:text-gray-900"
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
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Uploading and processing...</span>
                </div>
              )}
            </div>

            {/* Format Support Info */}
            <div className="bg-gray-100 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900 mb-1">Supported formats:</p>
                  <ul className="space-y-1">
                    <li>• <span className="text-green-600">CSV, Excel (.xlsx, .xls)</span> - Recommended (95%+ accuracy)</li>
                    <li>• <span className="text-yellow-600">PDF</span> - Experimental (70-80% accuracy)</li>
                  </ul>
                  <p className="mt-2 text-gray-500">Required columns: Date, Description, Amount (or Debit/Credit)</p>
                </div>
              </div>
            </div>

            {/* PDF Warning Banner */}
            {isPdfFile && !uploadResult && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-700 mb-1">
                      PDF Parsing is Experimental
                    </p>
                    <p className="text-sm text-yellow-600 mb-2">
                      PDF statements have ~70-80% accuracy due to varying bank formats. 
                      We recommend using CSV or Excel exports from your bank for best results.
                    </p>
                    <p className="text-xs text-yellow-700">
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
                  ? 'bg-yellow-50 border-yellow-200' 
                  : 'bg-green-50 border-green-200'
              } border rounded-lg p-4`}>
                <div className="flex items-start gap-2">
                  <Check className={`w-5 h-5 ${
                    uploadResult.details.accuracy_note ? 'text-yellow-600' : 'text-green-600'
                  } flex-shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <p className={`font-medium ${
                      uploadResult.details.accuracy_note ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {uploadResult.message}
                    </p>
                    <ul className={`mt-2 text-sm ${
                      uploadResult.details.accuracy_note ? 'text-yellow-600' : 'text-green-600'
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
                        <li className="text-red-600">• Parsing errors: {uploadResult.details.errors}</li>
                      )}
                    </ul>
                    {uploadResult.details.accuracy_note && (
                      <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-700">
                        ⚠️ {uploadResult.details.accuracy_note}
                      </div>
                    )}
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-xs text-yellow-600 cursor-pointer hover:text-yellow-700">
                          View parsing errors ({uploadResult.errors.length})
                        </summary>
                        <ul className="mt-2 text-xs text-yellow-700 space-y-1 ml-4">
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
              <div className="bg-red-50 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-600">{uploadError}</p>
                    {uploadError.toLowerCase().includes('pdf') && (
                      <p className="text-xs text-red-500 mt-2">
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
      <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Bank Transactions ({transactions.length})
          </h3>
          {transactions.length > 0 && (
            <button
              onClick={fetchTransactions}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>

        {loadingTransactions ? (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No transactions yet. Upload a bank statement to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Notes</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">{txn.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{txn.description}</td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${
                      txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(txn.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{txn.notes || '-'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => deleteTransaction(txn.id)}
                        className="text-red-600 hover:text-red-700 p-1"
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
        <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-gray-500 text-sm">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{summary.matches_found}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-gray-500 text-sm">High Confidence</p>
              <p className="text-2xl font-bold text-green-600">{summary.high_confidence}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-gray-500 text-sm">Need Review</p>
              <p className="text-2xl font-bold text-yellow-600">
                {summary.medium_confidence + summary.low_confidence}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {matches.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">
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
        <div className="flex items-center gap-3 p-4 bg-red-50 border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Matches List or Empty State */}
      {!error && matches.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow text-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-600 text-lg font-medium">No pending matches to review</p>
              <p className="text-gray-400 text-sm mt-2">
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
              className={`bg-white shadow border-2 ${getConfidenceBgColor(match.confidence)} p-6 rounded-lg`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(match.confidence)}`}>
                    {match.confidence.toFixed(0)}% Match
                  </div>
                  <span className="text-gray-500 text-sm">{match.reason}</span>
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
                  <h4 className="text-sm font-semibold text-blue-600 uppercase">Bank Transaction</h4>
                  <div className="space-y-1">
                    <p className="text-gray-900 font-medium">{match.bank.description}</p>
                    <p className="text-gray-500 text-sm">Date: {match.bank.date}</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${Math.abs(match.bank.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-purple-600 uppercase">Ledger Entry</h4>
                  <div className="space-y-1">
                    <p className="text-gray-900 font-medium">{match.ledger.description}</p>
                    {match.ledger.vendor && (
                      <p className="text-gray-500 text-sm">Vendor: {match.ledger.vendor}</p>
                    )}
                    <p className="text-gray-500 text-sm">Date: {match.ledger.date}</p>
                    <p className="text-lg font-bold text-gray-900">
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