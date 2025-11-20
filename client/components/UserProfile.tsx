'use client';

import { Trophy, TrendingUp, Target, Zap } from 'lucide-react';

export function UserProfile() {
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full flex items-center justify-center text-4xl">
          🎯
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Your Profile</h1>
        <p className="text-gray-400">Track your predictions and earnings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold mb-1">1,250</p>
          <p className="text-xs text-gray-400 uppercase">XP Points</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-2xl font-bold mb-1">68%</p>
          <p className="text-xs text-gray-400 uppercase">Win Rate</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Target className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-2xl font-bold mb-1">42</p>
          <p className="text-xs text-gray-400 uppercase">Predictions</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-sky-500/20 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-sky-400" />
          </div>
          <p className="text-2xl font-bold mb-1">Level 5</p>
          <p className="text-xs text-gray-400 uppercase">Prophet</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div>
                <p className="font-semibold mb-1">Will BTC hit $100k?</p>
                <p className="text-sm text-gray-400">Bet: YES • $50</p>
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
