// Status Messages Hook for Google Ads Pages
// Centralized status message handling from URL search params

'use client';

import { useSearchParams } from 'next/navigation';

export interface StatusMessages {
  success?: string;
  error?: string;
  details?: string;
  accounts?: string;
  campaign_id?: string;
}

export const useStatusMessages = (): StatusMessages => {
  const searchParams = useSearchParams();

  return {
    success: searchParams.get('success') || undefined,
    error: searchParams.get('error') || undefined,
    details: searchParams.get('details') || undefined,
    accounts: searchParams.get('accounts') || undefined,
    campaign_id: searchParams.get('campaign_id') || undefined,
  };
};
