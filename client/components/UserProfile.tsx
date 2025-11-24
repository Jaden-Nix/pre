'use client';

import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Target, Zap, Wallet, Copy, ExternalLink } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface WalletInfo {
  address: string;
  balance: string;
  predBalance?: number;
}

interface BetActivity {
  id: string;
  marketTitle: string;
  choice: string;
  amount: number;
  timestamp: number;
  status: 'active' | 'won' | 'lost' | 'pending';
  potentialPayout?: number;
  potentialProfit?: number;
  roi?: string;
}

export function UserProfile() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [betActivity, setBetActivity] = useState<BetActivity[]>([]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await fetchWalletInfo(user.uid);
        await fetchUserBets(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchWalletInfo = async (uid: string) => {
    try {
      setLoading(true);
      
      // Clear any cached wallet addresses to get fresh data
      localStorage.removeItem('custodialWalletAddress');
      localStorage.removeItem('cachedWalletAddress');
      
      // Step 1: Sync the custodial wallet address to Firebase
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          const syncResponse = await fetch('/api/profile/sync-wallet-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, idToken })
          });
          
          const syncData = await syncResponse.json();
          if (syncData.success) {
            console.log('✅ Wallet address synced to Firebase:', syncData.walletAddress);
          }
        }
      } catch (e) {
        console.warn('Could not sync wallet address:', e);
      }
      
      // Step 2: Fetch the wallet address from custodial wallet (bypassing cache)
      const infoResponse = await fetch('/api/custodial-wallet/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ userId: uid })
      });
      
      const infoData = await infoResponse.json();
      let walletAddress = infoData.success ? infoData.address : null;
      
      console.log('🔍 Fetched wallet from backend:', walletAddress);
      
      // If custodial wallet fetch failed, try to get from /api/user-profile
      if (!walletAddress) {
        try {
          const profileResponse = await fetch('/api/user-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            body: JSON.stringify({ userId: uid })
          });
          
          const profileData = await profileResponse.json();
          if (profileData && profileData.walletAddress) {
            walletAddress = profileData.walletAddress;
            console.log('🔍 Fetched wallet from profile:', walletAddress);
          }
        } catch (e) {
          console.warn('Could not fetch user profile:', e);
        }
      }
      
      if (walletAddress) {
        // Now fetch balance for the actual wallet address
        const balanceResponse = await fetch('/api/custodial-wallet/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid })
        });
        
        const balanceData = await balanceResponse.json();
        
        // Fetch PRED balance from blockchain
        let predBalance = 0;
        try {
          const predResponse = await fetch('/api/blockchain/get-pred-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress })
          });
          
          const predData = await predResponse.json();
          if (predData.success) {
            predBalance = predData.balance;
          }
        } catch (e) {
          console.warn('Could not fetch PRED balance:', e);
        }
        
        setWalletInfo({
          address: walletAddress,
          balance: balanceData.success ? balanceData.balance : '0',
          predBalance: predBalance || 0
        });
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBets = async (uid: string) => {
    try {
      const response = await fetch('/api/quick-play/user-bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      
      const data = await response.json();
      if (data.success && data.bets) {
        const sortedBets = data.bets.sort((a: BetActivity, b: BetActivity) => b.timestamp - a.timestamp).slice(0, 5);
        setBetActivity(sortedBets);
      }
    } catch (error) {
      console.warn('Could not fetch user bets:', error);
    }
  };

  const copyAddress = () => {
    if (walletInfo?.address) {
      navigator.clipboard.writeText(walletInfo.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const resetWallet = async () => {
    if (!userId || !auth.currentUser) {
      alert('Please log in first');
      return;
    }

    if (!confirm('Are you sure you want to reset your wallet? This will delete the old wallet and create a new one. Make sure you have transferred any funds out first!')) {
      return;
    }

    try {
      setResetting(true);
      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetch('/api/wallet/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, idToken })
      });

      const data = await response.json();

      if (data.success) {
        setResetSuccess(true);
        setWalletInfo(null);
        
        // Refresh wallet info after a short delay
        setTimeout(() => {
          fetchWalletInfo(userId);
          setResetSuccess(false);
        }, 2000);
      } else {
        alert('Failed to reset wallet: ' + data.error);
      }
    } catch (error) {
      console.error('Error resetting wallet:', error);
      alert('Failed to reset wallet. Please try again.');
    } finally {
      setResetting(false);
    }
  };

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

      {/* Wallet Info Section */}
      {loading ? (
        <div className="glass-card p-6 rounded-2xl mb-8">
          <div className="animate-pulse flex items-center justify-center py-8">
            <p className="text-gray-400">Loading wallet information...</p>
          </div>
        </div>
      ) : walletInfo ? (
        <div className="glass-card p-6 rounded-2xl mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-6 h-6 text-sky-400" />
            <h2 className="text-xl font-bold">Custodial Wallet</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">Wallet Address</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-white/5 rounded-lg font-mono text-sm">
                  {formatAddress(walletInfo.address)}
                </code>
                <button
                  onClick={copyAddress}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="Copy address"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={`https://testnet.bscscan.com/address/${walletInfo.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="View on BSCScan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              {copied && (
                <p className="text-green-400 text-sm mt-2">Address copied!</p>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">BNB Balance</p>
                <p className="text-2xl font-bold text-sky-400">
                  {parseFloat(walletInfo.balance).toFixed(4)} BNB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">PRED Balance</p>
                <p className="text-2xl font-bold text-purple-400">
                  {walletInfo.predBalance?.toFixed(0) || '0'} PRED
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Network</p>
                <p className="text-lg font-semibold">BSC Testnet</p>
              </div>
            </div>
            
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                💡 <strong>Tip:</strong> Get free testnet BNB from the{' '}
                <a
                  href="https://testnet.bnbchain.org/faucet-smart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-200"
                >
                  BSC Faucet
                </a>
              </p>
            </div>

            {resetSuccess && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-300">
                  ✅ Wallet reset successful! Creating new wallet...
                </p>
              </div>
            )}

            <button
              onClick={resetWallet}
              disabled={resetting}
              className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 disabled:bg-gray-500/20 border border-red-500/30 disabled:border-gray-500/30 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              {resetting ? '🔄 Resetting Wallet...' : '🔧 Reset Wallet (Fix Wrong Balance)'}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 rounded-2xl mb-8">
          <p className="text-center text-gray-400">
            No wallet found. Please sign in to view your wallet.
          </p>
        </div>
      )}

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
          {betActivity.length > 0 ? (
            betActivity.map((bet) => (
              <div key={bet.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-white mb-1">{bet.marketTitle}</p>
                    <p className="text-sm text-gray-400">
                      Bet: <span className="text-sky-400 font-bold">{bet.choice}</span> • <span className="text-yellow-400">{bet.amount} BUSD</span>
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
                      bet.status === 'active'
                        ? 'bg-blue-500/20 text-blue-400'
                        : bet.status === 'won'
                        ? 'bg-green-500/20 text-green-400'
                        : bet.status === 'lost'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                  </span>
                </div>
                {bet.potentialPayout ? (
                  <div className="text-sm">
                    <span className="text-gray-400">Payout: </span>
                    <span className="text-green-400 font-bold">{bet.potentialPayout.toFixed(2)} BUSD</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-gray-400">ROI: </span>
                    <span className="text-yellow-400 font-bold text-base">{bet.roi}%</span>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-8">No bets yet. Start betting on Quick Play markets!</p>
          )}
        </div>
      </div>
    </div>
  );
}
