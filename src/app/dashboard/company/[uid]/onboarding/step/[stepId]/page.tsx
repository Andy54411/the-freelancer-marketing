'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingContainer from '@/components/onboarding/OnboardingContainer';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export default function CompanyOnboardingStepPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const companyUid = params?.uid as string;
  const stepId = parseInt(params?.stepId as string) || 1;

  useEffect(() => {
    async function checkAuthorization() {
      if (!user || !companyUid || !params) {
        router.push('/');
        return;
      }

      try {
        // COMPANIES-ONLY: Prüfe ob der User Zugriff auf diese Company hat über companies collection
        const companyDoc = await getDoc(doc(db, 'companies', companyUid));

        if (!companyDoc.exists()) {
          router.push('/dashboard');
          return;
        }

        const companyData = companyDoc.data();
        const isOwner = companyData.uid === user.uid || companyUid === user.uid;

        if (!isOwner) {
          router.push('/dashboard');
          return;
        }

        // Prüfe gültigen Step-Bereich (6 Steps im Onboarding)
        if (stepId < 1 || stepId > 6) {
          router.push(`/dashboard/company/${companyUid}/onboarding/step/1`);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthorization();
  }, [user, companyUid, stepId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <div></div>; // Router redirect wird ausgeführt
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingContainer companyUid={companyUid} initialStep={stepId} />
    </div>
  );
}
