'use client';

import { useState, useEffect } from 'react';
import { getFinAPICredentialType } from '@/lib/finapi-config';

interface AccountingScoreData {
  score: number;
  totalTransactions: number;
  linkedTransactions: number;
  unlinkedTransactions: number;
  loading: boolean;
  error: string | null;
}

export function useAccountingScore(companyId: string | null): AccountingScoreData {
  const [data, setData] = useState<AccountingScoreData>({
    score: 0,
    totalTransactions: 0,
    linkedTransactions: 0,
    unlinkedTransactions: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!companyId) {
      setData({
        score: 0,
        totalTransactions: 0,
        linkedTransactions: 0,
        unlinkedTransactions: 0,
        loading: false,
        error: 'Keine Firmen-ID verfügbar',
      });
      return;
    }

    let isMounted = true;
    const validCompanyId = companyId; // TypeScript Type Guard

    async function loadAccountingScore() {
      try {
        const credentialType = getFinAPICredentialType();

        // 1. Transaktionen laden
        const transactionsResponse = await fetch(
          `/api/finapi/transactions?userId=${validCompanyId}&credentialType=${credentialType}&page=1&perPage=500`
        );

        if (!transactionsResponse.ok) {
          throw new Error('Fehler beim Laden der Transaktionen');
        }

        const transactionsData = await transactionsResponse.json();
        const totalTransactions = transactionsData.data?.transactions?.length || 0;

        if (totalTransactions === 0) {
          if (isMounted) {
            setData({
              score: 100,
              totalTransactions: 0,
              linkedTransactions: 0,
              unlinkedTransactions: 0,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // 2. Transaction Links laden
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');

        const transactionLinksRef = collection(
          db,
          'companies',
          validCompanyId,
          'transaction_links'
        );
        const snapshot = await getDocs(transactionLinksRef);

        const links = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];

        // 3. Zähle eindeutige verlinkte Transaktionen
        const linkedTransactionIds = new Set(links.map((link: any) => String(link.transactionId)));
        const linkedTransactions = linkedTransactionIds.size;
        const unlinkedTransactions = totalTransactions - linkedTransactions;

        // 4. Score berechnen (Prozentsatz der verlinkten Transaktionen)
        const score =
          totalTransactions > 0 ? Math.round((linkedTransactions / totalTransactions) * 100) : 100;

        if (isMounted) {
          setData({
            score,
            totalTransactions,
            linkedTransactions,
            unlinkedTransactions,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Error loading accounting score:', error);
        if (isMounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          }));
        }
      }
    }

    loadAccountingScore();

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return data;
}
