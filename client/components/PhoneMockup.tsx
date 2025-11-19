'use client';

import { Home, BarChart2, Plus, Zap, User } from 'lucide-react';

export function PhoneMockup() {
  return (
    <div className="relative flex justify-center lg:justify-end h-[600px] items-center perspective-1000">
      {/* The Phone */}
      <div className="phone-mockup relative w-[300px] h-[600px] bg-black rounded-[45px] border-[8px] border-[#2a2a2a] shadow-2xl overflow-hidden ring-1 ring-white/20 transform hover:rotate-0 transition-transform duration-500" style={{ transform: 'rotateY(-15deg) rotateX(10deg) rotateZ(-5deg)' }}>
        {/* Glossy Reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent z-20 pointer-events-none" />

        {/* Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30 flex justify-center items-center">
          <div className="w-16 h-4 bg-[#111] rounded-full" />
        </div>

        {/* Screen Content */}
        <div className="w-full h-full bg-[#0D1117] flex flex-col relative overflow-hidden">
          {/* Header */}
          <div className="pt-14 pb-4 px-5 flex justify-between items-center">
            <span className="text-xl font-bold gradient-text">Predora</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" />
          </div>

          {/* Card Stack */}
          <div className="flex-1 relative flex justify-center items-center p-4">
            {/* Card Behind */}
            <div className="absolute w-full max-w-[240px] h-[360px] bg-[#161b22] rounded-3xl border border-white/5 scale-90 translate-y-4 opacity-60" />
            
            {/* Front Card */}
            <div className="relative w-full max-w-[260px] h-[380px] glass-panel rounded-3xl p-6 flex flex-col justify-between border-t border-white/20 shadow-[0_20px_50px_-12px_rgba(56,189,248,0.3)]">
              <div className="absolute top-4 right-4 px-2 py-1 bg-sky-500/20 text-sky-400 text-[10px] font-bold rounded-full">
                CRYPTO
              </div>

              <div className="mt-8">
                <h3 className="text-2xl font-bold leading-tight text-white mb-2">
                  Will BTC break $100k?
                </h3>
                <p className="text-xs text-gray-400">Resolves Dec 31</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                  <span>Yes 65%</span>
                  <span>No 35%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                  <div className="w-[65%] bg-green-500 shadow-[0_0_10px_#22c55e]" />
                  <div className="w-[35%] bg-red-500" />
                </div>

                {/* Tap Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="h-12 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm">
                    NO
                  </div>
                  <div className="h-12 rounded-xl border border-green-500/30 bg-green-500/10 flex items-center justify-center text-green-400 font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    YES
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Nav */}
          <div className="h-20 bg-[#161b22]/80 backdrop-blur-md border-t border-white/5 flex justify-around items-center px-4">
            <Home className="text-sky-400 w-6 h-6" />
            <BarChart2 className="text-gray-600 w-6 h-6" />
            <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/40 -mt-8 border-4 border-[#0D1117]">
              <Plus className="text-white w-6 h-6" />
            </div>
            <Zap className="text-gray-600 w-6 h-6" />
            <User className="text-gray-600 w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 right-0 glass-card p-3 rounded-2xl animate-float z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
            🎉
          </div>
          <div>
            <p className="text-xs text-gray-400 font-mono">You Won!</p>
            <p className="text-sm font-bold text-white">+$450.00</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-40 -left-10 glass-card p-3 rounded-2xl animate-float z-40" style={{ animationDelay: '1s' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
            🤖
          </div>
          <div>
            <p className="text-xs text-gray-400 font-mono">AI Judge</p>
            <p className="text-sm font-bold text-white">Market Resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
