'use client';

import { useState, useEffect } from 'react';
import { Settings, Zap, DollarSign, Users, ExternalLink } from 'lucide-react';

export function AccountAbstraction({ adminSecret }: { adminSecret: string }) {
  const [config, setConfig] = useState({
    googleAuthEnabled: false,
    appleAuthEnabled: false,
    gasSponsorship: true,
    gasLimit: '0.01',
    paymasterUrl: '',
    biconomyApiKey: '',
  });

  const [stats, setStats] = useState({
    totalUsers: 0,
    googleLogins: 0,
    appleLogins: 0,
    gasSponsoredTxs: 0,
    totalGasSpent: '0.00',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const [configRes, statsRes] = await Promise.all([
          fetch(`${apiUrl}/api/admin/account-abstraction/config`, {
            headers: { 'x-admin-secret': adminSecret }
          }),
          fetch(`${apiUrl}/api/admin/account-abstraction/stats`, {
            headers: { 'x-admin-secret': adminSecret }
          })
        ]);
        
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData);
        }
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching AA data:', error);
      }
    };
    
    fetchData();
  }, [adminSecret]);

  const handleSaveConfig = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/admin/account-abstraction/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          adminSecret,
          config,
        }),
      });
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-sky-400" />
          <h1 className="text-3xl font-bold gradient-text">Account Abstraction</h1>
        </div>
        <p className="text-gray-400">Configure social login and gas sponsorship</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-sky-400" />
            <h3 className="font-bold text-gray-400">Total Users</h3>
          </div>
          <p className="text-3xl font-bold text-sky-400">{stats.totalUsers}</p>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔵</span>
            <h3 className="font-bold text-gray-400">Google</h3>
          </div>
          <p className="text-3xl font-bold">{stats.googleLogins}</p>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🍎</span>
            <h3 className="font-bold text-gray-400">Apple</h3>
          </div>
          <p className="text-3xl font-bold">{stats.appleLogins}</p>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-green-400" />
            <h3 className="font-bold text-gray-400">Gas Spent</h3>
          </div>
          <p className="text-3xl font-bold text-green-400">${stats.totalGasSpent}</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-xl mb-6">
        <h2 className="text-xl font-bold mb-4">Authentication Configuration</h2>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔵</span>
              <div>
                <h3 className="font-bold">Google Login</h3>
                <p className="text-sm text-gray-400">Allow users to sign in with Google</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.googleAuthEnabled}
                onChange={(e) => setConfig({ ...config, googleAuthEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍎</span>
              <div>
                <h3 className="font-bold">Apple Login</h3>
                <p className="text-sm text-gray-400">Allow users to sign in with Apple</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.appleAuthEnabled}
                onChange={(e) => setConfig({ ...config, appleAuthEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>
        </div>

        <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-5 h-5 text-sky-400 mt-0.5" />
            <div>
              <h4 className="font-bold text-sky-400 mb-1">Setup Replit Auth</h4>
              <p className="text-sm text-gray-300 mb-2">
                Use Replit's built-in authentication to easily set up Google, Apple, GitHub, and email login.
              </p>
              <a
                href="https://docs.replit.com/category/authentication"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sky-400 hover:underline"
              >
                View Documentation →
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Gas Sponsorship Settings
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <h3 className="font-bold">Enable Gas Sponsorship</h3>
              <p className="text-sm text-gray-400">Automatically pay gas fees for users</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.gasSponsorship}
                onChange={(e) => setConfig({ ...config, gasSponsorship: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Gas Limit per User (BNB)</label>
            <input
              type="text"
              value={config.gasLimit}
              onChange={(e) => setConfig({ ...config, gasLimit: e.target.value })}
              className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-sky-500"
              placeholder="0.01"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Paymaster URL</label>
            <input
              type="text"
              value={config.paymasterUrl}
              onChange={(e) => setConfig({ ...config, paymasterUrl: e.target.value })}
              className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-sky-500"
              placeholder="https://paymaster.biconomy.io/..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Biconomy API Key</label>
            <input
              type="password"
              value={config.biconomyApiKey}
              onChange={(e) => setConfig({ ...config, biconomyApiKey: e.target.value })}
              className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-sky-500"
              placeholder="Enter your Biconomy API key"
            />
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-300">
              ⚠️ Gas sponsorship requires a Biconomy account and sufficient funds in your paymaster.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          className="mt-6 w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}
