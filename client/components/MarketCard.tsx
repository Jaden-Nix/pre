'use client';

import { Market } from '@/types/market';
import { TrendingUp, Clock } from 'lucide-react';

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  return (
    <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform">
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="px-3 py-1 bg-sky-500/20 text-sky-400 text-xs font-bold rounded-full">
          {market.category}
        </span>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="w-3 h-3" />
          <span>{new Date(market.resolutionDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold mb-3 line-clamp-2 min-h-[3.5rem]">
        {market.title}
      </h3>

      {/* Odds Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
          <span>Yes {market.yesOdds}%</span>
          <span>No {market.noOdds}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
          <div 
            className="bg-green-500 shadow-[0_0_10px_#22c55e]" 
            style={{ width: `${market.yesOdds}%` }}
          />
          <div 
            className="bg-red-500" 
            style={{ width: `${market.noOdds}%` }}
          />
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span>${(market.totalVolume / 1000).toFixed(1)}k Volume</span>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-sm font-bold rounded-lg hover:shadow-lg hover:shadow-sky-500/30 transition-all">
          Bet
        </button>
      </div>
    </div>
  );
}
