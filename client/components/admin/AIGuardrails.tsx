'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Ban, Shield, TrendingUp } from 'lucide-react';

interface GuardrailStats {
  duplicatesBlocked: number;
  lowQualityBlocked: number;
  sybilDetected: number;
  suspiciousCreators: number;
}

interface FlaggedItem {
  id: string;
  type: 'duplicate' | 'low-quality' | 'sybil' | 'suspicious-creator';
  title: string;
  reason: string;
  createdAt: string;
  creatorId: string;
}

export function AIGuardrails({ adminSecret }: { adminSecret: string }) {
  const [stats, setStats] = useState<GuardrailStats>({
    duplicatesBlocked: 0,
    lowQualityBlocked: 0,
    sybilDetected: 0,
    suspiciousCreators: 0,
  });
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    duplicateThreshold: 0.85,
    qualityThreshold: 0.6,
    sybilSensitivity: 0.7,
    autoBlock: false,
  });

  useEffect(() => {
    fetchGuardrailData();
  }, []);

  const fetchGuardrailData = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/guardrails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
      });
      const data = await response.json();
      setStats(data.stats || stats);
      setFlaggedItems(data.flaggedItems || []);
    } catch (error) {
      console.error('Error fetching guardrail data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/admin/guardrails/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          adminSecret,
          settings,
        }),
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const handleUnflag = async (itemId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/admin/guardrails/unflag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          adminSecret,
          itemId,
        }),
      });
      fetchGuardrailData();
    } catch (error) {
      console.error('Error unflagging item:', error);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-8 h-8 text-orange-400" />
          <h1 className="text-3xl font-bold gradient-text">AI Guardrails</h1>
        </div>
        <p className="text-gray-400">Protect against duplicates, spam, and Sybil attacks</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Ban className="w-6 h-6 text-red-400" />
            <h3 className="font-bold text-gray-400">Duplicates</h3>
          </div>
          <p className="text-3xl font-bold text-red-400">{stats.duplicatesBlocked}</p>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-yellow-400" />
            <h3 className="font-bold text-gray-400">Low Quality</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{stats.lowQualityBlocked}</p>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <h3 className="font-bold text-gray-400">Sybil Detected</h3>
          </div>
          <p className="text-3xl font-bold text-orange-400">{stats.sybilDetected}</p>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            <h3 className="font-bold text-gray-400">Suspicious</h3>
          </div>
          <p className="text-3xl font-bold text-purple-400">{stats.suspiciousCreators}</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-xl mb-8">
        <h2 className="text-xl font-bold mb-4">Guardrail Settings</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Duplicate Similarity Threshold
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.duplicateThreshold}
              onChange={(e) => setSettings({ ...settings, duplicateThreshold: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="text-center mt-2 text-sky-400 font-bold">{(settings.duplicateThreshold * 100).toFixed(0)}%</div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Quality Threshold
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.qualityThreshold}
              onChange={(e) => setSettings({ ...settings, qualityThreshold: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="text-center mt-2 text-sky-400 font-bold">{(settings.qualityThreshold * 100).toFixed(0)}%</div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Sybil Detection Sensitivity
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sybilSensitivity}
              onChange={(e) => setSettings({ ...settings, sybilSensitivity: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="text-center mt-2 text-sky-400 font-bold">{(settings.sybilSensitivity * 100).toFixed(0)}%</div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoBlock}
              onChange={(e) => setSettings({ ...settings, autoBlock: e.target.checked })}
              className="w-5 h-5"
            />
            <label className="text-sm text-gray-400">
              Auto-block flagged items (requires review if unchecked)
            </label>
          </div>
        </div>

        <button
          onClick={handleUpdateSettings}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all"
        >
          Update Settings
        </button>
      </div>

      <div className="glass-card p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Recently Flagged Items</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedItems.map((item) => (
              <div key={item.id} className="p-4 bg-white/5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      item.type === 'duplicate' ? 'bg-red-500/20 text-red-400' :
                      item.type === 'low-quality' ? 'bg-yellow-500/20 text-yellow-400' :
                      item.type === 'sybil' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.type}
                    </span>
                    <span className="text-gray-500 text-xs">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <h4 className="font-bold mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-400">{item.reason}</p>
                </div>
                <button
                  onClick={() => handleUnflag(item.id)}
                  className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
