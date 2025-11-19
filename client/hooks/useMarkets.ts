'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Market } from '@/types/market';

export function useMarkets(category?: string) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Use simple collection name - markets will be stored at top level
    // If Firebase setup uses nested path, adjust in Firebase config or migrate data
    const marketsRef = collection(db, 'standard_markets');
    
    let q = query(
      marketsRef,
      orderBy('createdAt', 'desc')
    );

    if (category && category !== 'all') {
      q = query(q, where('category', '==', category));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const marketsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Market[];
        setMarkets(marketsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching markets:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [category]);

  return { markets, loading, error };
}

export function useMarket(marketId: string) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!marketId) {
      setLoading(false);
      return;
    }

    // Get reference to specific market document
    const { doc } = require('firebase/firestore');
    const marketRef = doc(db, 'standard_markets', marketId);

    const unsubscribe = onSnapshot(
      marketRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setMarket({ id: docSnapshot.id, ...docSnapshot.data() } as Market);
        } else {
          setMarket(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching market:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [marketId]);

  return { market, loading, error };
}
