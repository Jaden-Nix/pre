'use client';

import { useState, useEffect } from 'react';
import { Zap, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface QuickPlay {
  id: string;
  question: string;
  status: string;
  createdAt: string;
  yesVotes: number;
  noVotes: number;
}

export function QuickPlayResolve({ adminSecret }: { adminSecret: string }) {
  const [quickPlays, setQuickPlays] = useState<QuickPlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchQuickPlays();
  }, []);

  const fetchQuickPlays = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/quick-plays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
      });
      const data = await response.json();
      setQuickPlays(data.quickPlays || []);
    } catch (error) {
      console.error('Error fetching quick plays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string, outcome: 'yes' | 'no') => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/admin/resolve-quick-play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          adminSecret,
          quickPlayId: id,
          outcome,
        }),
      });
      fetchQuickPlays();
    } catch (error) {
      console.error('Error resolving quick play:', error);
    }
  };

  const filteredQuickPlays = quickPlays.filter(qp => 
    qp.question.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredQuickPlays.length / itemsPerPage);
  const paginatedItems = filteredQuickPlays.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold gradient-text">Quick Play Resolution</h1>
        </div>
        <p className="text-gray-400">Manually resolve quick play questions</p>
      </div>

      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search quick play questions..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        />
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedItems.map((item) => (
              <div key={item.id} className="glass-card p-6 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{item.question}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        item.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.status}
                      </span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 p-3 bg-green-500/10 rounded-lg">
                        <div className="text-gray-400 text-sm mb-1">YES</div>
                        <div className="text-2xl font-bold text-green-400">{item.yesVotes}</div>
                      </div>
                      <div className="flex-1 p-3 bg-red-500/10 rounded-lg">
                        <div className="text-gray-400 text-sm mb-1">NO</div>
                        <div className="text-2xl font-bold text-red-400">{item.noVotes}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleResolve(item.id, 'yes')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      YES
                    </button>
                    <button
                      onClick={() => handleResolve(item.id, 'no')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      NO
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
