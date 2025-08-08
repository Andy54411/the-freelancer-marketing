'use client';

import { useEffect, useState } from 'react';
import { checkCompanyOnboardingStatus } from '@/lib/legacy-migration';

interface OnboardingStatus {
  needsOnboarding: boolean;
  completionPercentage: number;
  currentStep: number;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook to check if a company needs to complete onboarding
 * Used to show onboarding prompts for existing companies
 */
export function useCompanyOnboardingCheck(companyUid: string | null | undefined): OnboardingStatus {
  const [status, setStatus] = useState<OnboardingStatus>({
    needsOnboarding: false,
    completionPercentage: 100,
    currentStep: 1,
    isLoading: true,
  });

  useEffect(() => {
    if (!companyUid) {
      setStatus({
        needsOnboarding: false,
        completionPercentage: 100,
        currentStep: 1,
        isLoading: false,
      });
      return;
    }

    const checkOnboardingStatus = async () => {
      try {
        setStatus(prev => ({ ...prev, isLoading: true, error: undefined }));

        const result = await checkCompanyOnboardingStatus(companyUid);

        setStatus({
          needsOnboarding: result.needsOnboarding,
          completionPercentage: result.completionPercentage,
          currentStep: result.currentStep,
          isLoading: false,
        });

        // Log for debugging
        console.log(`🔍 Onboarding check for ${companyUid}:`, {
          needsOnboarding: result.needsOnboarding,
          completion: result.completionPercentage,
          currentStep: result.currentStep,
        });
      } catch (error) {
        console.error('❌ Error checking onboarding status:', error);
        setStatus({
          needsOnboarding: true,
          completionPercentage: 0,
          currentStep: 1,
          isLoading: false,
          error: 'Fehler beim Prüfen des Onboarding-Status',
        });
      }
    };

    checkOnboardingStatus();
  }, [companyUid]);

  return status;
}
