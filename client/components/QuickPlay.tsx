'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, SkipForward } from 'lucide-react';
import { useMarkets } from '@/hooks/useMarkets';

export function QuickPlay() {
  const { markets, loading } = useMarkets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleVote = (vote: 'yes' | 'no' | 'skip') => {
    setDirection(vote === 'yes' ? 1 : vote === 'no' ? -1 : 0);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % markets.length);
    }, 200);
  };

  const currentMarket = markets[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentMarket || markets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">No markets available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0D1117] to-[#161B22]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">Quick Play</h1>
          <p className="text-gray-400 text-sm">Swipe through trending markets</p>
        </div>

        {/* Card Stack */}
        <div className="relative h-[480px] mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMarket.id}
              initial={{ scale: 0.95, opacity: 0, rotateY: direction * 10 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.95, opacity: 0, x: direction * 300 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 glass-panel rounded-3xl p-8 flex flex-col justify-between border-t border-white/20 shadow-[0_20px_50px_-12px_rgba(56,189,248,0.3)]"
            >
              <div>
                <div className="inline-block px-3 py-1 bg-sky-500/20 text-sky-400 text-xs font-bold rounded-full mb-6">
                  {currentMarket.category}
                </div>
                
                <h2 className="text-3xl font-bold leading-tight mb-4">
                  {currentMarket.title}
                </h2>
                
                <p className="text-gray-400 text-sm">Resolves {new Date(currentMarket.resolutionDate).toLocaleDateString()}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm font-bold text-gray-400 uppercase">
                  <span>Yes {currentMarket.yesOdds}%</span>
                  <span>No {currentMarket.noOdds}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-green-500 shadow-[0_0_10px_#22c55e]" 
                    style={{ width: `${currentMarket.yesOdds}%` }}
                  />
                  <div 
                    className="bg-red-500" 
                    style={{ width: `${currentMarket.noOdds}%` }}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleVote('no')}
            className="h-16 rounded-2xl border-2 border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-400 font-bold transition-all hover:scale-105 hover:bg-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] active:scale-95"
          >
            <ThumbsDown className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleVote('skip')}
            className="h-16 rounded-2xl border-2 border-gray-600/30 bg-gray-600/10 flex items-center justify-center text-gray-400 font-bold transition-all hover:scale-105 hover:bg-gray-600/20 active:scale-95"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleVote('yes')}
            className="h-16 rounded-2xl border-2 border-green-500/30 bg-green-500/10 flex items-center justify-center text-green-400 font-bold transition-all hover:scale-105 hover:bg-green-500/20 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] active:scale-95"
          >
            <ThumbsUp className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mt-6 text-sm text-gray-500">
          {currentIndex + 1} of {markets.length}
        </div>
      </div>
    </div>
  );
}
