'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, SkipForward, TrendingUp } from 'lucide-react';
import { useMarkets } from '@/hooks/useMarkets';

export function QuickPlay() {
  const { markets, loading } = useMarkets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [betAmount, setBetAmount] = useState('10');
  const [selectedChoice, setSelectedChoice] = useState<'yes' | 'no' | null>(null);
  const [potentialPayout, setPotentialPayout] = useState<any>(null);
  const [loadingPayout, setLoadingPayout] = useState(false);

  const handleVote = (vote: 'yes' | 'no' | 'skip') => {
    setDirection(vote === 'yes' ? 1 : vote === 'no' ? -1 : 0);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % markets.length);
      setSelectedChoice(null);
      setPotentialPayout(null);
      setBetAmount('10');
    }, 200);
  };

  const calculatePayout = async (choice: 'yes' | 'no') => {
    if (!currentMarket || !betAmount) return;
    
    setSelectedChoice(choice);
    setLoadingPayout(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/quick-play/calculate-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quickPlayId: currentMarket.id,
          amount: parseFloat(betAmount),
          choice: choice.toUpperCase()
        })
      });
      const data = await response.json();
      setPotentialPayout(data);
    } catch (error) {
      console.error('Error calculating payout:', error);
    } finally {
      setLoadingPayout(false);
    }
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

                {/* Bet Input */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <label className="text-xs text-gray-400 mb-2 block">Bet Amount (BUSD)</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => {
                      setBetAmount(e.target.value);
                      setPotentialPayout(null);
                    }}
                    placeholder="10"
                    min="1"
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>

                {/* Potential Payout Display */}
                {potentialPayout && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 rounded-lg border border-sky-500/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-gray-400">Potential Payout</span>
                    </div>
                    <div className="text-lg font-bold text-green-400 mb-1">
                      {potentialPayout.potentialPayout?.toFixed(2)} BUSD
                    </div>
                    <div className="text-xs text-gray-400">
                      +{potentialPayout.potentialProfit?.toFixed(2)} BUSD ({potentialPayout.roi}% ROI)
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => calculatePayout('no')}
            disabled={!betAmount || loadingPayout}
            className="h-16 rounded-2xl border-2 border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-400 font-bold transition-all hover:scale-105 hover:bg-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPayout && selectedChoice === 'no' ? (
              <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <ThumbsDown className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={() => handleVote('skip')}
            className="h-16 rounded-2xl border-2 border-gray-600/30 bg-gray-600/10 flex items-center justify-center text-gray-400 font-bold transition-all hover:scale-105 hover:bg-gray-600/20 active:scale-95"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          <button
            onClick={() => calculatePayout('yes')}
            disabled={!betAmount || loadingPayout}
            className="h-16 rounded-2xl border-2 border-green-500/30 bg-green-500/10 flex items-center justify-center text-green-400 font-bold transition-all hover:scale-105 hover:bg-green-500/20 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPayout && selectedChoice === 'yes' ? (
              <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />
            ) : (
              <ThumbsUp className="w-6 h-6" />
            )}
          </button>
        </div>

        <div className="text-center mt-6 text-sm text-gray-500">
          {currentIndex + 1} of {markets.length}
        </div>
      </div>
    </div>
  );
}
