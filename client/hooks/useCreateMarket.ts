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
          systemPrompt: `You are a prediction market generator for Predora. Today's date is ${new Date().toISOString().split('T')[0]}.

CRITICAL RULES:
1. ONLY create markets about FUTURE events (after today's date)
2. AVOID obvious outcomes (e.g., "Will X happen on scheduled date Y?")
3. Focus on UNCERTAIN events with genuine debate potential
4. NO past events, NO historical questions, NO retrospective markets
5. Avoid markets about confirmed/scheduled events unless asking about their SUCCESS/FAILURE/IMPACT
6. Good: "Will Bitcoin reach $100K in 2025?" Bad: "Will Bitcoin conference happen on March 15?"
7. Good: "Will the new iPhone be delayed past its launch date?" Bad: "Will Apple announce iPhone on scheduled date?"

Create a JSON object for a binary (YES/NO) prediction market. Include: title (under 100 chars), description, category, resolutionDate (future date at least 7 days from today), yesOdds and noOdds (should reflect genuine uncertainty, typically 40-60% range unless there's a reason for skew).`,
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
