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
  const [showManualForm, setShowManualForm] = useState(false);
  
  // Manual form state
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualResolutionDate, setManualResolutionDate] = useState('');
  const [manualLiquidityYes, setManualLiquidityYes] = useState('');
  const [manualLiquidityNo, setManualLiquidityNo] = useState('');
  const [manualCurrency, setManualCurrency] = useState<'BNB' | 'PRED'>('BNB');
  const [manualValidationError, setManualValidationError] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  
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

  const handleManualSubmit = async () => {
    setManualValidationError(null);

    // Validate all fields
    if (!manualTitle.trim() || !manualDescription.trim() || !manualResolutionDate || !manualLiquidityYes || !manualLiquidityNo) {
      setManualValidationError('Please fill ALL required fields: Title, Description, Resolution Date, and Liquidity Amount');
      return;
    }

    setIsSubmittingManual(true);

    try {
      const resolutionDate = new Date(manualResolutionDate);
      const resolutionTimeInSeconds = Math.floor(resolutionDate.getTime() / 1000);

      if (resolutionTimeInSeconds <= Math.floor(Date.now() / 1000)) {
        setManualValidationError('Resolution date must be in the future');
        setIsSubmittingManual(false);
        return;
      }

      console.log('Creating manual market:', {
        title: manualTitle,
        description: manualDescription,
        resolutionTime: resolutionTimeInSeconds,
      });

      // Determine initial liquidity based on currency
      const yesAmount = manualCurrency === 'BNB' ? manualLiquidityYes : '0';
      const noAmount = manualCurrency === 'BNB' ? manualLiquidityNo : '0';
      const yesPred = manualCurrency === 'PRED' ? manualLiquidityYes : '0';
      const noPred = manualCurrency === 'PRED' ? manualLiquidityNo : '0';

      createMarket(
        manualTitle,
        manualDescription,
        BigInt(resolutionTimeInSeconds),
        yesAmount,
        noAmount,
        yesPred,
        noPred
      );

      // Reset form on success
      setManualTitle('');
      setManualDescription('');
      setManualResolutionDate('');
      setManualLiquidityYes('');
      setManualLiquidityNo('');
      setShowManualForm(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create market';
      setManualValidationError(errorMsg);
      console.error('Error creating manual market:', err);
    } finally {
      setIsSubmittingManual(false);
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
      {!showManualForm ? (
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm mb-4">Or create manually</p>
          <button 
            onClick={() => setShowManualForm(true)}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
          >
            Manual Creation
          </button>
        </div>
      ) : (
        <div className="glass-card p-8 rounded-2xl mt-8">
          <h2 className="text-2xl font-bold mb-6">Create Market Manually</h2>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Title</label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g., Will Bitcoin reach $100K in 2025?"
                className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Description</label>
              <textarea
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Provide more details about the market..."
                rows={3}
                className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* Resolution Date */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Resolution Date</label>
              <input
                type="datetime-local"
                value={manualResolutionDate}
                onChange={(e) => setManualResolutionDate(e.target.value)}
                className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Currency Selection */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Currency</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setManualCurrency('BNB')}
                  className={`flex-1 p-3 rounded-xl border transition-all ${
                    manualCurrency === 'BNB'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                      : 'bg-black/30 border-white/10 text-gray-400'
                  }`}
                >
                  BNB
                </button>
                <button
                  onClick={() => setManualCurrency('PRED')}
                  className={`flex-1 p-3 rounded-xl border transition-all ${
                    manualCurrency === 'PRED'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                      : 'bg-black/30 border-white/10 text-gray-400'
                  }`}
                >
                  $PRED
                </button>
              </div>
            </div>

            {/* Liquidity Amount */}
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 mb-4">
              <p className="text-xs text-sky-400 flex items-center gap-2">
                <span>💡</span>
                Higher liquidity = More stable odds
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">YES Liquidity</label>
                <input
                  type="number"
                  value={manualLiquidityYes}
                  onChange={(e) => setManualLiquidityYes(e.target.value)}
                  placeholder="Amount"
                  step="0.001"
                  min="0"
                  className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">NO Liquidity</label>
                <input
                  type="number"
                  value={manualLiquidityNo}
                  onChange={(e) => setManualLiquidityNo(e.target.value)}
                  placeholder="Amount"
                  step="0.001"
                  min="0"
                  className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Validation Error */}
            {manualValidationError && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{manualValidationError}</p>
              </div>
            )}

            {/* Live Preview */}
            {manualTitle && (
              <div className="mt-6 p-4 bg-black/40 border border-white/10 rounded-xl">
                <p className="text-xs text-gray-400 mb-2">Live Preview</p>
                <p className="text-lg font-bold mb-3">{manualTitle}</p>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">50%</p>
                    <p className="text-xs text-gray-400">YES</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">50.0%</p>
                    <p className="text-xs text-gray-400">NO</p>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowManualForm(false)}
                className="flex-1 py-3 bg-gray-600/20 border border-gray-600/30 text-white font-medium rounded-xl hover:bg-gray-600/30 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={isSubmittingManual || isCreating}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingManual || isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Market'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
