'use client';

import { useState } from 'react';
import { MarketCard } from './MarketCard';
import { useMarkets } from '@/hooks/useMarkets';

export function MarketsList() {
  const [filter, setFilter] = useState<'all' | 'crypto' | 'sports' | 'politics' | 'tech'>('all');
  const { markets, loading, error } = useMarkets(filter);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'sports', label: 'Sports' },
    { id: 'politics', label: 'Politics' },
    { id: 'tech', label: 'Tech' },
  ];

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Markets</h1>
        <p className="text-gray-400">Discover and bet on trending predictions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-6 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
              filter === f.id
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Markets Grid */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-2">Error loading markets</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      )}

      {!loading && !error && markets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No markets found</p>
        </div>
      )}

      {!loading && !error && markets.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
