'use client';

import { useState } from 'react';
import { Home, BarChart2, Plus, Zap, User } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { QuickPlay } from '@/components/QuickPlay';
import { MarketsList } from '@/components/MarketsList';
import { UserProfile } from '@/components/UserProfile';
import { CreateMarket } from '@/components/CreateMarket';
import { FirebaseConfigError } from '@/components/FirebaseConfigError';
import { getFirebaseErrorMessage } from '@/lib/firebase';

export default function AppPage() {
  const firebaseError = getFirebaseErrorMessage();
  
  if (firebaseError) {
    return <FirebaseConfigError message={firebaseError} />;
  }
  
  const [activeTab, setActiveTab] = useState<'home' | 'markets' | 'create' | 'quick' | 'profile'>('home');

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Top Navigation - Desktop Only */}
      <nav className="hidden md:flex fixed top-0 w-full z-50 bg-[#161B22]/95 backdrop-blur-xl border-b border-white/10 h-16">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold gradient-text">Predora</span>
          </div>
          
          <div className="flex items-center gap-4">
            <ConnectButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:pt-16 pb-24 min-h-screen">
        {activeTab === 'home' && <QuickPlay />}
        {activeTab === 'markets' && <MarketsList />}
        {activeTab === 'create' && <CreateMarket />}
        {activeTab === 'quick' && <QuickPlay />}
        {activeTab === 'profile' && <UserProfile />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 bg-[#161B22]/95 backdrop-blur-xl border-t border-white/10 h-20">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'home' ? 'text-sky-400' : 'text-gray-500'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('markets')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'markets' ? 'text-sky-400' : 'text-gray-500'
            }`}
          >
            <BarChart2 className="w-6 h-6" />
            <span className="text-xs font-medium">Markets</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className="relative -mt-8 w-16 h-16 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/40 border-4 border-[#0D1117]"
          >
            <Plus className="w-8 h-8 text-white" />
          </button>

          <button
            onClick={() => setActiveTab('quick')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'quick' ? 'text-sky-400' : 'text-gray-500'
            }`}
          >
            <Zap className="w-6 h-6" />
            <span className="text-xs font-medium">Quick</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'profile' ? 'text-sky-400' : 'text-gray-500'
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
