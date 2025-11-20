'use client';

import { useState } from 'react';

interface CreateMarketParams {
  systemPrompt: string;
  userPrompt: string;
}

interface AIResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  error?: string;
}

export function useCreateMarket() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMarket = async ({ userPrompt }: Partial<CreateMarketParams>) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: `You are a prediction market generator. Create a JSON object for a binary (YES/NO) prediction market based on the user's request. Include: title, description, category, resolutionDate (future date), and suggestedOdds (initial YES/NO probabilities). Keep titles under 100 characters.`,
          userPrompt: userPrompt || '',
          jsonSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              resolutionDate: { type: 'string' },
              yesOdds: { type: 'number' },
              noOdds: { type: 'number' },
            },
            required: ['title', 'description', 'category', 'resolutionDate', 'yesOdds', 'noOdds'],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: AIResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from AI');
      }

      const marketData = JSON.parse(data.candidates[0].content.parts[0].text);
      
      setLoading(false);
      return marketData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate market';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  return { generateMarket, loading, error };
}
