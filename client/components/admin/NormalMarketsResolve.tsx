'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Market {
  id: string;
  title: string;
  status: string;
  resolutionDate: string;
  category: string;
  yesCount: number;
  noCount: number;
  totalPledges: number;
}

export function NormalMarketsResolve({ adminSecret }: { adminSecret: string }) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'active' | 'disputed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const marketsPerPage = 10;

  useEffect(() => {
    fetchMarkets();
  }, [filter]);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/normal-markets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ filter }),
      });
      const data = await response.json();
      setMarkets(data.markets || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (marketId: string, outcome: 'yes' | 'no') => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/admin/override-market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          adminSecret,
          marketId,
          outcome,
          reason: 'Manual admin resolution',
        }),
      });
      fetchMarkets();
    } catch (error) {
      console.error('Error resolving market:', error);
    }
  };

  const filteredMarkets = markets.filter(market => 
    market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredMarkets.length / marketsPerPage);
  const paginatedMarkets = filteredMarkets.slice(
    (currentPage - 1) * marketsPerPage,
    currentPage * marketsPerPage
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Normal Markets Resolution</h1>
        <p className="text-gray-400">Manually resolve prediction markets</p>
      </div>

      <div className="mb-6">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search markets by title or category..."
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
        
        <div className="flex gap-2">
          {['all', 'active', 'disputed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                filter === f
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedMarkets.map((market) => (
              <div key={market.id} className="glass-card p-6 rounded-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-sky-500/20 text-sky-400 text-xs font-bold rounded-full">
                        {market.category}
                      </span>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        market.status === 'disputed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {market.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{market.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(market.resolutionDate).toLocaleDateString()}
                      </div>
                      <div>
                        Pledges: {market.totalPledges}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(market.id, 'yes')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolve YES
                    </button>
                    <button
                      onClick={() => handleResolve(market.id, 'no')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Resolve NO
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex-1 p-3 bg-green-500/10 rounded-lg">
                    <div className="text-gray-400 mb-1">YES votes</div>
                    <div className="text-xl font-bold text-green-400">{market.yesCount}</div>
                  </div>
                  <div className="flex-1 p-3 bg-red-500/10 rounded-lg">
                    <div className="text-gray-400 mb-1">NO votes</div>
                    <div className="text-xl font-bold text-red-400">{market.noCount}</div>
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
