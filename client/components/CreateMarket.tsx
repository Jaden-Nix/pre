'use client';

import { useState } from 'react';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { useCreateMarket } from '@/hooks/useCreateMarket';
import { useCreateMarketContract } from '@/hooks/useContract';

export function CreateMarket() {
  const [prompt, setPrompt] = useState('');
  const [generatedMarket, setGeneratedMarket] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const { generateMarket, loading, error } = useCreateMarket();
  const { createMarket, isLoading: isCreating, isSuccess, error: contractError } = useCreateMarketContract();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const marketData = await generateMarket({ userPrompt: prompt });
      setGeneratedMarket(marketData);
      setPublishError(null);
    } catch (err) {
      console.error('Failed to generate market:', err);
    }
  };

  const handlePublish = async () => {
    if (!generatedMarket) return;
    setIsPublishing(true);
    setPublishError(null);

    try {
      const resolutionDate = new Date(generatedMarket.resolutionDate);
      const resolutionTimeInSeconds = Math.floor(resolutionDate.getTime() / 1000);

      console.log('Publishing market:', {
        title: generatedMarket.title,
        description: generatedMarket.description,
        resolutionTime: resolutionTimeInSeconds,
      });

      createMarket(
        generatedMarket.title,
        generatedMarket.description,
        BigInt(resolutionTimeInSeconds),
        '0.01', // Initial YES BNB
        '0.01', // Initial NO BNB
        '0',    // Initial YES PRED
        '0'     // Initial NO PRED
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to publish market';
      setPublishError(errorMsg);
      console.error('Error publishing market:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Create Market</h1>
        <p className="text-gray-400">Let AI generate a prediction market for you</p>
      </div>

      {/* AI Generator */}
      <div className="glass-card p-8 rounded-2xl mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-bold">AI Market Generator</h2>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Will Nigeria beat Congo in the next match?"
          className="w-full p-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 resize-none"
          rows={4}
        />

        <button
          onClick={handleGenerate}
          disabled={!prompt || loading}
          className="w-full mt-4 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Market
            </span>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Generated Market Preview */}
      {generatedMarket && (
        <div className="glass-card p-8 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-bold">Generated Market</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Title</label>
              <p className="text-lg font-semibold">{generatedMarket.title}</p>
            </div>

            <div>
              <label className="text-sm text-gray-400">Description</label>
              <p className="text-gray-300">{generatedMarket.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Category</label>
                <p className="font-semibold">{generatedMarket.category}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Resolution Date</label>
                <p className="font-semibold">{new Date(generatedMarket.resolutionDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Suggested Odds</label>
              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-2">
                <span>Yes {generatedMarket.yesOdds}%</span>
                <span>No {generatedMarket.noOdds}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 shadow-[0_0_10px_#22c55e]" 
                  style={{ width: `${generatedMarket.yesOdds}%` }}
                />
                <div 
                  className="bg-red-500" 
                  style={{ width: `${generatedMarket.noOdds}%` }}
                />
              </div>
            </div>

            <button 
              onClick={handlePublish}
              disabled={isPublishing || isCreating}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing || isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing...
                </span>
              ) : (
                'Publish Market'
              )}
            </button>

            {(publishError || contractError) && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{publishError || contractError?.message}</p>
              </div>
            )}

            {isSuccess && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <p className="text-green-400 text-sm">Market published successfully!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Option */}
      <div className="text-center mt-8">
        <p className="text-gray-500 text-sm mb-4">Or create manually</p>
        <button className="px-6 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors">
          Manual Creation
        </button>
      </div>
    </div>
  );
}
