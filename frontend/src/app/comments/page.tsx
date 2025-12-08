"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, Send, Filter, Check, X, Reply, MoreVertical, User, Tag, Clock, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface Comment {
  id: string;
  user: string;
  userInitials: string;
  metric: string;
  text: string;
  timestamp: string;
  resolved: boolean;
  priority?: 'low' | 'medium' | 'high';
  replies: Reply[];
}

interface Reply {
  id: string;
  user: string;
  userInitials: string;
  text: string;
  timestamp: string;
}

export default function CommentsPage() {
  const [mounted, setMounted] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [customMetric, setCustomMetric] = useState('');
  const [showCustomMetric, setShowCustomMetric] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filterStatus, setFilterStatus] = useState('all');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const predefinedMetrics = [
    'Revenue',
    'Customer Acquisition Cost (CAC)',
    'Churn Rate',
    'Monthly Recurring Revenue (MRR)',
    'Customer Lifetime Value (LTV)',
    'Burn Rate',
    'Gross Margin',
    'Operating Margin',
    'Net Promoter Score (NPS)',
    'Annual Recurring Revenue (ARR)',
  ];

  // ✅ FIX: Only render after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch comments on mount and when filter changes
  useEffect(() => {
    if (mounted) {
      fetchComments();
    }
  }, [mounted, filterStatus]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/comments?status=${filterStatus}`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostComment = async () => {
    const metricToUse = showCustomMetric ? customMetric : selectedMetric;
    if (!newComment.trim() || !metricToUse) return;

    try {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user-id', // TODO: Get from Clerk
          userName: 'Current User',  // TODO: Get from Clerk
          userInitials: 'CU',        // TODO: Get from Clerk
          metric: metricToUse,
          text: newComment,
          priority: selectedPriority
        })
      });

      if (response.ok) {
        setNewComment('');
        setSelectedMetric('');
        setCustomMetric('');
        setShowCustomMetric(false);
        setSelectedPriority('medium');
        fetchComments(); // Refresh the list
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user-id', // TODO: Get from Clerk
          userName: 'Current User',  // TODO: Get from Clerk
          userInitials: 'CU',        // TODO: Get from Clerk
          text: replyText
        })
      });

      if (response.ok) {
        setReplyText('');
        setReplyTo(null);
        fetchComments(); // Refresh the list
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const toggleResolve = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !comment.resolved })
      });

      if (response.ok) {
        fetchComments(); // Refresh the list
      }
    } catch (error) {
      console.error('Error toggling resolve:', error);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // ✅ FIX: Show loading state during hydration
  if (!mounted) {
    return (
      <main className="lg:ml-64 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="lg:ml-64 min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Comments & Collaboration</h1>
                <p className="text-sm text-slate-600">Discuss metrics and insights with your team</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 bg-white"
                suppressHydrationWarning
              >
                <option value="all">All Comments</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* New Comment Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">New Comment</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Metric *
                </label>
                {!showCustomMetric ? (
                  <div className="space-y-2">
                    <select
                      value={selectedMetric}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setShowCustomMetric(true);
                          setSelectedMetric('');
                        } else {
                          setSelectedMetric(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 bg-white"
                      suppressHydrationWarning
                    >
                      <option value="">Choose a metric...</option>
                      {predefinedMetrics.map((metric) => (
                        <option key={metric} value={metric}>{metric}</option>
                      ))}
                      <option value="custom">➕ Add Custom Metric</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customMetric}
                      onChange={(e) => setCustomMetric(e.target.value)}
                      placeholder="Enter custom metric name..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder-slate-400"
                      suppressHydrationWarning
                    />
                    <button
                      onClick={() => {
                        setShowCustomMetric(false);
                        setCustomMetric('');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      suppressHydrationWarning
                    >
                      ← Back to predefined metrics
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priority
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 bg-white"
                  suppressHydrationWarning
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comment *
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share insights, flag concerns, or @mention team members..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm text-slate-900 placeholder-slate-400"
                suppressHydrationWarning
              />
              <p className="text-xs text-slate-500 mt-2">
                💡 Tip: Use @username to notify team members
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handlePostComment}
                disabled={!newComment.trim() || (!selectedMetric && !customMetric)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center gap-2 text-sm font-medium"
                suppressHydrationWarning
              >
                <Send className="w-4 h-4" />
                Post Comment
              </button>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <p className="text-slate-500">Loading comments...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map(comment => (
              <article
                key={comment.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition ${
                  comment.resolved
                    ? 'border-green-200 bg-green-50/30'
                    : 'border-slate-200'
                }`}
              >
                {/* Comment Header */}
                <div className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
                        {comment.userInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-slate-900 text-sm">{comment.user}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {comment.timestamp}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {comment.metric}
                          </span>
                          {comment.priority && (
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${getPriorityColor(comment.priority)}`}>
                              <AlertCircle className="w-3 h-3" />
                              {comment.priority.charAt(0).toUpperCase() + comment.priority.slice(1)} Priority
                            </span>
                          )}
                          {comment.resolved && (
                            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition flex-shrink-0 ml-2">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Comment Actions */}
                  <div className="flex items-center gap-4 ml-13">
                    <button
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-xs font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition"
                      suppressHydrationWarning
                    >
                      <Reply className="w-3.5 h-3.5" />
                      Reply {comment.replies.length > 0 && `(${comment.replies.length})`}
                    </button>
                    <button
                      onClick={() => toggleResolve(comment.id)}
                      className={`text-xs font-medium flex items-center gap-1.5 transition ${
                        comment.resolved
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-slate-600 hover:text-green-600'
                      }`}
                      suppressHydrationWarning
                    >
                      {comment.resolved ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          Reopen
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Resolve
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50/50">
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="p-4 sm:p-6 py-3 sm:py-4 border-b border-slate-100 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {reply.userInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900 text-sm">{reply.user}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-xs text-slate-500">{reply.timestamp}</span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{reply.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyTo === comment.id && (
                  <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-slate-200 bg-slate-50/50">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        CU
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm text-slate-900 placeholder-slate-400 mb-2"
                          autoFocus
                          suppressHydrationWarning
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setReplyTo(null);
                              setReplyText('');
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
                            suppressHydrationWarning
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReply(comment.id)}
                            disabled={!replyText.trim()}
                            className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                            suppressHydrationWarning
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {filterStatus === 'all' ? 'No comments yet' : `No ${filterStatus} comments`}
              </h3>
              <p className="text-slate-600 text-sm">
                {filterStatus === 'all'
                  ? 'Be the first to start a discussion about your metrics!'
                  : `Switch to "All Comments" to see other discussions.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}