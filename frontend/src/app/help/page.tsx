'use client';

import React, { useState, useEffect, useMemo } from 'react';

// --- Icons ---
const BookOpenIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
  </svg>
);
const LightBulbIcon = ({ className = "w-5 h-5 text-yellow-400" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 14.95a1 1 0 001.414 1.414l.707-.707a1 1 0 00-1.414-1.414l-.707.707zM4 10a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zM10 18a1 1 0 011-1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM3.939 3.939a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414L3.94 3.94zM10 4a6 6 0 100 12 6 6 0 000-12z" />
  </svg>
);

// --- Small, dependency-free linkifier ---
function LinkifyText({ text }: { text?: string }) {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/[^\s)]+(?:\([\w\d]+\)|[^,.\s)]*))/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//i.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline break-all">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// --- Helpers ---
function normalizeTags(tags: any): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

export default function HelpCenterPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [explainers, setExplainers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [selectedExp, setSelectedExp] = useState<any | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>(['exp_02', 'exp_03']);

  const tagFilters = ['cash flow', 'EBITDA', 'revenue'];

  useEffect(() => {
    const fetchExplainers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/explainers`);
        if (!res.ok) throw new Error("Failed to fetch help articles.");
        const data = await res.json();
        setExplainers(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load explainers.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchExplainers();
  }, [apiBase]);

  const filteredExplainers = useMemo(() => {
    if (!searchTerm) return explainers;
    const q = searchTerm.toLowerCase();
    return explainers.filter(exp => {
      const title = (exp.title || '').toLowerCase();
      const summary = (exp.summary || '').toLowerCase();
      const tags = normalizeTags(exp.tags).map(t => t.toLowerCase());
      return title.includes(q) || summary.includes(q) || tags.some(t => t.includes(q));
    });
  }, [explainers, searchTerm]);

  return (
    <div className="p-4 md:p-8 bg-gray-900 text-white min-h-screen relative">
      {/* Modal for expanded view */}
      {selectedExp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black max-w-xl w-full p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-3">{selectedExp.title}</h2>
            <p className="text-gray-800 whitespace-pre-wrap">
              <LinkifyText text={selectedExp.content} />
            </p>

            {/* Learn more link (YouTube) if present */}
            {selectedExp.learn_more_url && (
              <a
                href={selectedExp.learn_more_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-indigo-600 hover:underline"
              >
                Learn more (opens YouTube)
              </a>
            )}

            <button onClick={() => setSelectedExp(null)} className="mt-6 text-indigo-600 hover:underline">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="text-sm text-gray-400 mb-6">
        <a href="/dashboard" className="hover:underline">← Back to Dashboard</a>
      </nav>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Help & Learning Center</h1>
        <p className="text-gray-400 mt-2">Find answers and learn more about key financial concepts.</p>
        <div className="mt-6 max-w-lg mx-auto">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for a topic (e.g., 'cash flow', 'ebitda')..."
            className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tag Filters */}
      <div className="mb-6 flex flex-wrap justify-center gap-3">
        {tagFilters.map(tag => (
          <button
            key={tag}
            onClick={() => setSearchTerm(tag)}
            className="bg-indigo-800 text-white px-3 py-1 rounded-full text-sm hover:bg-indigo-700"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Suggested Topics */}
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LightBulbIcon />Suggested For You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {explainers.filter(exp => suggestedTopics.includes(exp.id)).map(exp => (
            <div key={exp.id} className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-300">{exp.title}</h3>
              <p className="text-sm text-yellow-400/80 mt-1">{exp.summary}</p>
              {exp.learn_more_url && (
                <a
                  href={exp.learn_more_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-yellow-300 hover:underline"
                >
                  Learn more on YouTube
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All Topics */}
      <div>
        <h2 className="text-xl font-bold mb-4">All Topics</h2>
        {isLoading && <p>Loading articles...</p>}
        {error && <p className="text-red-400">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExplainers.map(exp => {
            const tags = normalizeTags(exp.tags);
            return (
              <div key={exp.id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex items-start gap-4">
                  <BookOpenIcon className="text-indigo-400 mt-1" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white">{exp.title}</h3>

                    {/* Content with clickable URLs */}
                    <p className="text-sm text-gray-400 mt-2 line-clamp-4">
                      <LinkifyText text={exp.content} />
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setSelectedExp(exp)}
                        className="text-indigo-400 hover:underline text-sm"
                      >
                        View More
                      </button>

                      {/* Direct Learn link */}
                      {exp.learn_more_url && (
                        <a
                          href={exp.learn_more_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-300 hover:underline"
                        >
                          Learn more (YouTube)
                        </a>
                      )}
                    </div>

                    <div className="mt-4 text-sm text-gray-400">
                      Was this helpful?
                      <button className="ml-2 text-green-400 hover:underline">Yes</button>
                      <button className="ml-2 text-red-400 hover:underline">No</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
