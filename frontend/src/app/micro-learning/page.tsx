"use client";

import { useState, useEffect } from 'react';
import { 
  BookOpen, Search, TrendingUp, Activity, Plus, X, 
  ChevronRight, Lightbulb, Trash2, User, BarChart3 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface FinanceTerm {
  id: string;
  term: string;
  category: string;
  definition: string;
  example: string;
  bestPractice: string;
}

interface LiteracyTerm {
  term: string;
  definition: string;
  example: string;
  formula?: string;
}

const FINANCIAL_TERMS: LiteracyTerm[] = [
  {
    term: "Gross Margin",
    definition: "The percentage of revenue remaining after subtracting the cost of goods sold (COGS). This metric reveals how efficiently a company produces its products and services. Higher gross margins indicate strong pricing power, economies of scale, or lower production costs. It's a critical indicator of a company's fundamental profitability before operating expenses. Different industries have vastly different benchmarks—software companies often exceed 80%, while retailers may see 20-40%.",
    example: "Apple's iPhone business: $200B revenue with $80B COGS results in a 60% gross margin, indicating strong pricing power and efficient manufacturing.",
    formula: "(Revenue - COGS) / Revenue × 100"
  },
  {
    term: "Current Ratio",
    definition: "A liquidity metric that measures a company's ability to pay short-term obligations due within one year. It compares current assets (cash, inventory, receivables) to current liabilities (payables, short-term debt). A ratio above 1.0 means the company has more short-term assets than liabilities. Generally, 1.5-3.0 is considered healthy, though this varies by industry. Too high may indicate inefficient use of assets, while too low suggests potential liquidity problems.",
    example: "Tesla Q3 2024: $31B in current assets vs. $26B in current liabilities gives a current ratio of 1.2, showing adequate short-term liquidity.",
    formula: "Current Assets / Current Liabilities"
  },
  {
    term: "Free Cash Flow (FCF)",
    definition: "The cash a company generates after accounting for cash outflows to support operations and maintain capital assets. It represents the cash available for distribution to investors, debt repayment, acquisitions, or reinvestment. FCF is often considered a purer measure of profitability than earnings because it's harder to manipulate with accounting choices. Positive FCF indicates a company can fund growth without raising external capital. It's especially important for valuing mature companies and assessing dividend sustainability.",
    example: "Microsoft FY2024: $87B operating cash flow minus $28B in CapEx equals $59B FCF, funding dividends and buybacks.",
    formula: "Operating Cash Flow - Capital Expenditures"
  },
  {
    term: "Operating Margin",
    definition: "The percentage of revenue left after paying for variable costs of production and fixed operating expenses like salaries, rent, and marketing—but before interest and taxes. It shows how much profit a company makes from its core business operations. Higher margins indicate better operational efficiency and pricing power. This metric is useful for comparing companies within the same industry, as it strips out the effects of different tax rates and capital structures.",
    example: "Google's Search business generates a ~35% operating margin, while many SaaS companies target 20-30% at scale.",
    formula: "Operating Income / Revenue × 100"
  },
  {
    term: "EBITDA",
    definition: "Earnings Before Interest, Taxes, Depreciation, and Amortization. This metric approximates cash earnings from operations by adding back non-cash expenses (D&A) and financing/tax effects. It's widely used in M&A valuations, comparing companies across different tax jurisdictions, and assessing companies with heavy capital investments. While useful, it can be misleading because it ignores real costs like capital expenditures. Some analysts prefer EBIT or FCF for a more accurate picture.",
    example: "Amazon Q4 2024: $178B revenue with $32B EBITDA (18% margin), commonly used to compare companies with different capital structures.",
    formula: "Net Income + Interest + Taxes + Depreciation + Amortization"
  },
  {
    term: "Debt-to-Equity Ratio",
    definition: "A leverage ratio that compares a company's total debt to shareholder equity, showing how much of the company is financed by creditors versus owners. Higher ratios indicate more financial leverage and risk—if revenues fall, debt payments still must be made. While debt can amplify returns in good times, it increases bankruptcy risk in downturns. What's 'healthy' varies dramatically by industry: capital-intensive businesses (utilities, telecoms) often exceed 2.0, while tech companies typically stay below 0.5.",
    example: "Netflix: $14B debt vs. $15B equity = 0.93 ratio. Tech companies typically maintain ratios below 1.0, while utilities may exceed 2.0.",
    formula: "Total Debt / Total Equity"
  },
  {
    term: "Return on Equity (ROE)",
    definition: "Measures how effectively management uses shareholders' equity to generate profits. It reveals the return that equity investors earn on their investment. ROE is influenced by profit margins, asset turnover, and leverage. While higher is generally better, extremely high ROE may indicate excessive debt. Warren Buffett considers sustained ROE above 15% a sign of competitive advantage. It's particularly useful for comparing companies within the same industry and tracking performance over time.",
    example: "Nvidia 2024: $30B net income on $42B equity yields a 71% ROE, exceptional for any industry. Most companies target 15-20%.",
    formula: "Net Income / Shareholder Equity × 100"
  },
  {
    term: "Working Capital",
    definition: "The difference between current assets and current liabilities, representing the capital available for day-to-day operations. Positive working capital means a company can cover short-term obligations and invest in growth. However, too much may indicate inefficiency. Some highly efficient businesses (like Dell historically) operate with negative working capital by collecting from customers before paying suppliers—effectively using suppliers as a source of financing.",
    example: "Costco operates with negative working capital ($-7B), as customer payments arrive before supplier payments are due—a sign of efficiency.",
    formula: "Current Assets - Current Liabilities"
  },
  {
    term: "Burn Rate",
    definition: "The rate at which a company consumes its cash reserves, typically measured monthly. Critical for startups and unprofitable growth companies, it determines the 'runway'—how long the company can operate before needing additional funding. Investors closely monitor burn rate to assess capital efficiency and plan financing rounds. Reducing burn rate (through cost cuts or revenue growth) extends runway. During market downturns, companies often must dramatically reduce burn to survive until their next funding round.",
    example: "A Series B startup with $10M in the bank burning $500K/month has a 20-month runway—critical for planning the next funding round.",
    formula: "Monthly Cash Spent"
  }
];

export default function MicroLearningPage() {
  // ✅ FIX: Only render after client mount to avoid hydration errors
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [customTerms, setCustomTerms] = useState<FinanceTerm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<LiteracyTerm | null>(null);
  
  const [newTerm, setNewTerm] = useState({
    term: '',
    category: 'revenue',
    definition: '',
    example: '',
    bestPractice: ''
  });

  const categories = [
    { id: 'all', name: 'All Categories', icon: BookOpen },
    { id: 'revenue', name: 'Revenue Metrics', icon: TrendingUp },
    { id: 'customer', name: 'Customer Metrics', icon: User },
    { id: 'profitability', name: 'Profitability', icon: BarChart3 }
  ];

  // ✅ FIX: Set mounted after initial render
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchCustomTerms();
    }
  }, [mounted, selectedCategory, searchTerm]);

  const fetchCustomTerms = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/api/learn-finance/terms?${params}`);
      const data = await response.json();
      setCustomTerms(data.terms || []);
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTerm = async () => {
    if (!newTerm.term || !newTerm.definition) return;

    try {
      const response = await fetch(`${API_URL}/api/learn-finance/terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTerm)
      });

      if (response.ok) {
        setNewTerm({
          term: '',
          category: 'revenue',
          definition: '',
          example: '',
          bestPractice: ''
        });
        setShowAddForm(false);
        fetchCustomTerms();
      }
    } catch (error) {
      console.error('Error adding term:', error);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return;

    try {
      const response = await fetch(`${API_URL}/api/learn-finance/terms/${termId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchCustomTerms();
      }
    } catch (error) {
      console.error('Error deleting term:', error);
    }
  };

  const filteredFinancialTerms = searchTerm
    ? FINANCIAL_TERMS.filter(term =>
        term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : FINANCIAL_TERMS;

  // ✅ FIX: Show loading state during hydration
  if (!mounted) {
    return (
      <main className="lg:ml-64 min-h-screen min-w-0 overflow-x-hidden bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="lg:ml-64 min-h-screen min-w-0 overflow-x-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Financial Literacy Center</h1>
                <p className="text-sm text-slate-600">Learn key financial concepts and build your knowledge base</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search financial terms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder-slate-400"
                  suppressHydrationWarning
                />
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition text-sm whitespace-nowrap"
                suppressHydrationWarning
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Custom Term</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Financial Literacy Corner */}
        <section className="mb-6 sm:mb-8 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl border border-indigo-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Essential Financial Metrics</h2>
              <p className="text-sm text-slate-600">Click any term to learn more and see examples</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFinancialTerms.map((term, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedTerm(term)}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group text-left"
                suppressHydrationWarning
              >
                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                  {term.term}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Categories */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:sticky lg:top-24">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 px-2">Custom Terms Categories</h3>
              <nav className="space-y-1">
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        selectedCategory === category.id
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                      suppressHydrationWarning
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{category.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Add Term Form */}
            {showAddForm && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Custom Financial Term</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Term Name *
                      </label>
                      <input
                        type="text"
                        value={newTerm.term}
                        onChange={(e) => setNewTerm({...newTerm, term: e.target.value})}
                        placeholder="e.g., MRR, CAC, Churn Rate"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder-slate-400"
                        suppressHydrationWarning
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Category *
                      </label>
                      <select
                        value={newTerm.category}
                        onChange={(e) => setNewTerm({...newTerm, category: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900"
                        suppressHydrationWarning
                      >
                        <option value="revenue">Revenue Metrics</option>
                        <option value="customer">Customer Metrics</option>
                        <option value="profitability">Profitability</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Definition *
                    </label>
                    <textarea
                      value={newTerm.definition}
                      onChange={(e) => setNewTerm({...newTerm, definition: e.target.value})}
                      placeholder="Clear, concise definition of the term"
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm text-slate-900 placeholder-slate-400"
                      suppressHydrationWarning
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Example
                    </label>
                    <textarea
                      value={newTerm.example}
                      onChange={(e) => setNewTerm({...newTerm, example: e.target.value})}
                      placeholder="Practical example showing how to calculate or use this metric"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm text-slate-900 placeholder-slate-400"
                      suppressHydrationWarning
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Best Practice
                    </label>
                    <textarea
                      value={newTerm.bestPractice}
                      onChange={(e) => setNewTerm({...newTerm, bestPractice: e.target.value})}
                      placeholder="Best practices, benchmarks, or tips for this metric"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm text-slate-900 placeholder-slate-400"
                      suppressHydrationWarning
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition text-sm"
                      suppressHydrationWarning
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTerm}
                      disabled={!newTerm.term || !newTerm.definition}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition text-sm"
                      suppressHydrationWarning
                    >
                      Add Term
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Terms Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Your Custom Terms</h3>
                <span className="text-sm text-slate-500">{customTerms.length} terms</span>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">Loading custom terms...</p>
                </div>
              ) : customTerms.length > 0 ? (
                <div className="space-y-4">
                  {customTerms.map(term => (
                    <article key={term.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-slate-900">{term.term}</h4>
                            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full whitespace-nowrap">
                              {categories.find(c => c.id === term.category)?.name}
                            </span>
                          </div>
                          <p className="text-slate-700 mb-3 text-sm sm:text-base">{term.definition}</p>
                          
                          {term.example && (
                            <div className="mb-3">
                              <h5 className="text-sm font-semibold text-slate-900 mb-1">Example:</h5>
                              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{term.example}</p>
                            </div>
                          )}
                          
                          {term.bestPractice && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900 mb-1">Best Practice:</h5>
                              <p className="text-sm text-slate-600 bg-indigo-50 p-3 rounded-lg">{term.bestPractice}</p>
                            </div>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => handleDeleteTerm(term.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-4 flex-shrink-0"
                          aria-label="Delete term"
                          suppressHydrationWarning
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">No custom terms yet</h4>
                  <p className="text-slate-600 mb-6 text-sm">
                    {searchTerm 
                      ? "No terms match your search. Try different keywords."
                      : "Add your first custom financial term to build your knowledge base."}
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2 text-sm"
                    suppressHydrationWarning
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Term
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ FIXED: Very Compact Modal - respects sidebar */}
      {selectedTerm && (
        <div 
          className="fixed inset-0 lg:left-64 bg-black/50 flex items-center justify-center z-50 p-3"
          onClick={() => setSelectedTerm(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-sm w-full max-h-[70vh] overflow-y-auto p-3 relative shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTerm(null)}
              className="absolute top-2 right-2 p-1 hover:bg-slate-100 rounded transition"
              aria-label="Close modal"
              suppressHydrationWarning
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
            
            <div className="mb-2 pr-6">
              <h2 className="text-base font-bold text-slate-900 mb-1">{selectedTerm.term}</h2>
              <p className="text-slate-700 leading-tight text-xs">{selectedTerm.definition}</p>
            </div>

            {selectedTerm.formula && (
              <div className="mb-2 p-2 bg-indigo-50 border border-indigo-200 rounded">
                <h3 className="text-[10px] font-semibold text-indigo-900 mb-0.5 uppercase tracking-wide">Formula:</h3>
                <code className="text-indigo-700 font-mono text-[10px] break-all block">{selectedTerm.formula}</code>
              </div>
            )}

            <div className="mb-3 p-2 bg-slate-50 rounded">
              <h3 className="text-[10px] font-semibold text-slate-900 mb-0.5 uppercase tracking-wide">Example:</h3>
              <p className="text-[10px] text-slate-700 leading-tight">{selectedTerm.example}</p>
            </div>

            <button
              onClick={() => setSelectedTerm(null)}
              className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold transition text-xs"
              suppressHydrationWarning
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}