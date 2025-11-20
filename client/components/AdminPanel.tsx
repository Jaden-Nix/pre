'use client';

import { useState } from 'react';
import { Shield, List, Zap, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { NormalMarketsResolve } from './admin/NormalMarketsResolve';
import { QuickPlayResolve } from './admin/QuickPlayResolve';
import { QuickPollResolve } from './admin/QuickPollResolve';
import { AIGuardrails } from './admin/AIGuardrails';
import { AccountAbstraction } from './admin/AccountAbstraction';

type AdminPage = 'normal-markets' | 'quick-play' | 'quick-poll' | 'ai-guardrails' | 'account-abstraction';

export function AdminPanel() {
  const [activePage, setActivePage] = useState<AdminPage>('normal-markets');
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    if (!adminSecret) {
      setLoginError('Please enter admin secret');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid admin secret');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Failed to verify admin secret. Is the server running?');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center p-6">
        <div className="glass-card p-8 rounded-2xl max-w-md w-full">
          <div className="text-center mb-6">
            <Shield className="w-16 h-16 mx-auto mb-4 text-sky-400" />
            <h1 className="text-3xl font-bold gradient-text mb-2">Admin Panel</h1>
            <p className="text-gray-400">Enter admin secret to access</p>
          </div>

          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Admin Secret"
            className="w-full p-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 mb-4"
          />

          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
              <p className="text-red-400 text-sm">{loginError}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginLoading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </div>
      </div>
    );
  }

  const pages = [
    { id: 'normal-markets', label: 'Normal Markets', icon: List },
    { id: 'quick-play', label: 'Quick Play', icon: Zap },
    { id: 'quick-poll', label: 'Quick Poll', icon: CheckCircle },
    { id: 'ai-guardrails', label: 'AI Guardrails', icon: AlertTriangle },
    { id: 'account-abstraction', label: 'Account Abstraction', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-[#161B22] border-r border-white/10 p-4">
          <div className="mb-8 p-4">
            <Shield className="w-10 h-10 text-sky-400 mx-auto mb-2" />
            <h1 className="text-xl font-bold text-center gradient-text">Admin Panel</h1>
          </div>

          <nav className="space-y-2">
            {pages.map((page) => {
              const Icon = page.icon;
              return (
                <button
                  key={page.id}
                  onClick={() => setActivePage(page.id as AdminPage)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activePage === page.id
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{page.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {activePage === 'normal-markets' && <NormalMarketsResolve adminSecret={adminSecret} />}
          {activePage === 'quick-play' && <QuickPlayResolve adminSecret={adminSecret} />}
          {activePage === 'quick-poll' && <QuickPollResolve adminSecret={adminSecret} />}
          {activePage === 'ai-guardrails' && <AIGuardrails adminSecret={adminSecret} />}
          {activePage === 'account-abstraction' && <AccountAbstraction adminSecret={adminSecret} />}
        </main>
      </div>
    </div>
  );
}
