'use client';

import React from 'react';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import OnboardingRouter from './OnboardingRouter';
import OnboardingProgressBar from './OnboardingProgressBar';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface OnboardingContainerProps {
  companyUid: string;
  initialStep?: number;
}

const OnboardingContent: React.FC<OnboardingContainerProps> = ({ companyUid, initialStep }) => {
  const {
    currentStep,
    totalSteps,
    completionPercentage,
    stepsData,
    canGoNext,
    canGoBack,
    goToNextStep,
    goToPreviousStep,
    isSaving,
    lastSaved,
    onboardingStatus
  } = useOnboarding();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Taskilo" className="h-8" />
              <span className="text-gray-600">Unternehmens-Setup</span>
            </div>
            <div className="text-sm text-gray-600">
              Schritt {currentStep} von {totalSteps}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-4 py-8 ${currentStep === 5 ? 'pb-8' : 'pb-32'}`}>
        {/* Step Header */}
        <div className="mb-8">
          <div className="text-sm text-gray-600 mb-2">
            Schritt {currentStep} von {totalSteps}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {stepsData.find(s => s.step === currentStep)?.title || `Schritt ${currentStep}`}
          </h1>
          <p className="text-gray-600 mt-2">
            {stepsData.find(s => s.step === currentStep)?.description || ''}
          </p>
          <div className="text-sm text-gray-500 mt-1">
            Geschätzte Zeit: {stepsData.find(s => s.step === currentStep)?.estimatedTime || '5 Minuten'}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <OnboardingRouter currentStep={currentStep} companyUid={companyUid} />
        </div>
      </div>

      {/* Progress Footer - Hidden in Step 5 */}
      {currentStep !== 5 && (
        <OnboardingProgressBar
          currentStep={currentStep}
          totalSteps={totalSteps}
          completionPercentage={completionPercentage}
          stepsData={stepsData.map(step => ({
            step: step.step,
            title: step.title,
            isCompleted: step.isCompleted || false,
            isOptional: !step.isRequired
          }))}
          canGoNext={canGoNext()}
          canGoBack={canGoBack()}
          onNext={goToNextStep}
          onBack={goToPreviousStep}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />
      )}
    </div>
  );
};

const OnboardingContainer: React.FC<OnboardingContainerProps> = ({ companyUid, initialStep }) => {
  return (
    <OnboardingProvider companyId={companyUid} initialStep={initialStep}>
      <OnboardingContent companyUid={companyUid} initialStep={initialStep} />
    </OnboardingProvider>
  );
};

export default OnboardingContainer;
