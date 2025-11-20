'use client';

import { AlertCircle } from 'lucide-react';

export function FirebaseConfigError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505]">
      <div className="max-w-2xl w-full glass-panel rounded-3xl p-8 border border-red-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold text-white">Firebase Configuration Required</h2>
            <p className="text-gray-300 leading-relaxed">{message}</p>
            <div className="mt-6 p-4 bg-black/30 rounded-xl border border-white/10">
              <h3 className="text-sm font-bold text-sky-400 mb-2">Quick Setup:</h3>
              <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                <li>Create a <code className="px-2 py-0.5 bg-white/5 rounded">client/.env.local</code> file</li>
                <li>Add your Firebase configuration (see <code className="px-2 py-0.5 bg-white/5 rounded">client/SETUP.md</code>)</li>
                <li>Restart the development server</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
