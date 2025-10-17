"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, Send, Filter, Check, X, Reply, MoreVertical, User } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface Comment {
  id: string;
  user: string;
  userInitials: string;
  metric: string;
  text: string;
  timestamp: string;
  resolved: boolean;
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch comments on mount and when filter changes
  useEffect(() => {
    fetchComments();
  }, [filterStatus]);

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
    if (!newComment.trim() || !selectedMetric) return;

    try {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user-id', // TODO: Get from Clerk
          userName: 'Current User',  // TODO: Get from Clerk
          userInitials: 'CU',        // TODO: Get from Clerk
          metric: selectedMetric,
          text: newComment
        })
      });

      if (response.ok) {
        setNewComment('');
        setSelectedMetric('');
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

  return (
    <div className="ml-64 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Comments & Collaboration</h1>
                <p className="text-sm text-slate-600">Discuss metrics and insights with your team</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="all">All Comments</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* New Comment Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">New Comment</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Metric *
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Choose a metric to discuss...</option>
                <option value="Revenue">Revenue</option>
                <option value="Customer Acquisition Cost">Customer Acquisition Cost</option>
                <option value="Churn Rate">Churn Rate</option>
                <option value="Monthly Recurring Revenue">Monthly Recurring Revenue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comment *
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share insights, ask questions, or @mention team members..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-slate-500 mt-2">
                Tip: Use @ to mention team members and notify them
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handlePostComment}
                disabled={!newComment.trim() || !selectedMetric}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center gap-2"
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
              <div
                key={comment.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition ${
                  comment.resolved
                    ? 'border-green-200 bg-green-50/30'
                    : 'border-slate-200'
                }`}
              >
                {/* Comment Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {comment.userInitials}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{comment.user}</span>
                          <span className="text-sm text-slate-500">•</span>
                          <span className="text-sm text-slate-500">{comment.timestamp}</span>
                          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                            {comment.metric}
                          </span>
                        </div>
                        <p className="text-slate-700">{comment.text}</p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Comment Actions */}
                  <div className="flex items-center gap-3 ml-13">
                    <button
                      onClick={() => setReplyTo(comment.id)}
                      className="text-sm text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      Reply
                    </button>
                    <button
                      onClick={() => toggleResolve(comment.id)}
                      className={`text-sm flex items-center gap-1 transition ${
                        comment.resolved
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-slate-600 hover:text-green-600'
                      }`}
                    >
                      {comment.resolved ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          Reopen
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Mark as Resolved
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50/50">
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="p-6 pb-4 border-b border-slate-200 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            {reply.userInitials}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900 text-sm">{reply.user}</span>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs text-slate-500">{reply.timestamp}</span>
                            </div>
                            <p className="text-sm text-slate-700">{reply.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyTo === comment.id && (
                  <div className="p-6 pt-4 border-t border-slate-200 bg-slate-50/50">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        CU
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm mb-2"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setReplyTo(null)}
                            className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReply(comment.id)}
                            disabled={!replyText.trim()}
                            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {filterStatus === 'all' ? 'No comments yet' : `No ${filterStatus} comments`}
              </h3>
              <p className="text-slate-600">
                {filterStatus === 'all'
                  ? 'Be the first to start a discussion about your metrics!'
                  : `Switch to "All Comments" to see other discussions.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}