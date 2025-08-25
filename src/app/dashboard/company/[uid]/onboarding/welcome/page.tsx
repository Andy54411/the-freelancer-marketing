'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingWelcome from '@/components/onboarding/OnboardingWelcome';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface CompanyOnboardingWelcomePageProps {}

export default function CompanyOnboardingWelcomePage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const companyUid = params.uid as string;

  useEffect(() => {
    async function checkAuthorization() {
      if (!user || !companyUid) {
        router.push('/auth/login');
        return;
      }

      try {
        // Prüfe, ob der User Zugriff auf diese Company hat
        const companyDoc = await getDoc(doc(db, 'companies', companyUid));

        if (!companyDoc.exists()) {
          router.push('/dashboard');
          return;
        }

        const companyData = companyDoc.data();
        const isOwner = companyData.ownerUid === user.uid;
        const isMember = companyData.members?.includes(user.uid);

        if (!isOwner && !isMember) {
          router.push('/dashboard');
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
  }, [user, companyUid, router]);

  const handleStartOnboarding = () => {
    router.push(`/dashboard/company/${companyUid}/onboarding/step/1`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <div />; // Router redirect wird ausgeführt
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingWelcome
        companyUid={companyUid}
        onStartOnboarding={handleStartOnboarding}
      />
    </div>
  );
}
