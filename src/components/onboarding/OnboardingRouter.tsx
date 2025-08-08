'use client';

import React from 'react';
import OnboardingStep1 from './steps/OnboardingStep1';
import OnboardingStep2 from './steps/OnboardingStep2';
import OnboardingStep3 from './steps/OnboardingStep3';
import OnboardingStep4 from './steps/OnboardingStep4';
import OnboardingStep5 from './steps/OnboardingStep5';

interface OnboardingRouterProps {
  currentStep: number;
  companyUid: string;
}

const OnboardingRouter: React.FC<OnboardingRouterProps> = ({ currentStep, companyUid }) => {
  switch (currentStep) {
    case 1:
      return <OnboardingStep1 companyUid={companyUid} />;
    case 2:
      return <OnboardingStep2 companyUid={companyUid} />;
    case 3:
      return <OnboardingStep3 companyUid={companyUid} />;
    case 4:
      return <OnboardingStep4 companyUid={companyUid} />;
    case 5:
      return <OnboardingStep5 companyUid={companyUid} />;
    default:
      return (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900">
            Ungültiger Schritt
          </h3>
          <p className="text-gray-600 mt-2">
            Schritt {currentStep} existiert nicht.
          </p>
        </div>
      );
  }
};

export default OnboardingRouter;
