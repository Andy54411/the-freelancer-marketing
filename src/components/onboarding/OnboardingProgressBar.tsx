'use client';

import React from 'react';
import { Check, Clock } from 'lucide-react';
import { OnboardingProgressProps } from '@/types/onboarding';

interface OnboardingProgressBarProps extends OnboardingProgressProps {
  // Extends OnboardingProgressProps with all required properties
}

const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  currentStep,
  totalSteps,
  completionPercentage,
  stepsData,
  canGoNext,
  canGoBack,
  onNext,
  onBack,
  isSaving = false,
  lastSaved
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-[#14ad9f] h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-4">
          {Array.from({ length: totalSteps }, (_, i) => {
            const stepNumber = i + 1;
            const isCompleted = stepsData.find(s => s.step === stepNumber)?.isCompleted || false;
            const isCurrent = stepNumber === currentStep;
            const isAccessible = stepNumber <= currentStep;
            
            return (
              <div key={stepNumber} className="flex items-center">
                <div 
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200 ${
                    isCompleted 
                      ? 'bg-[#14ad9f] text-white' 
                      : isCurrent 
                        ? 'bg-[#14ad9f] text-white ring-4 ring-[#14ad9f] ring-opacity-20' 
                        : isAccessible
                          ? 'bg-gray-300 text-gray-600 hover:bg-gray-400 cursor-pointer'
                          : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    stepNumber
                  )}
                </div>
                
                {/* Step connector line */}
                {stepNumber < totalSteps && (
                  <div 
                    className={`w-12 h-0.5 mx-2 transition-colors duration-200 ${
                      stepNumber < currentStep ? 'bg-[#14ad9f]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Status and Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {Math.round(completionPercentage)}% abgeschlossen • Schritt {currentStep} von {totalSteps}
            </span>
            
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border border-[#14ad9f] border-t-transparent rounded-full animate-spin" />
                  <span>Speichern...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span>Gespeichert um {formatTime(lastSaved)}</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  <span>Auto-Speicherung aktiv</span>
                </>
              )}
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button 
              className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                canGoBack 
                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-50' 
                  : 'text-gray-400 cursor-not-allowed'
              } rounded-md`}
              disabled={!canGoBack}
              onClick={onBack}
            >
              Zurück
            </button>
            
            <button 
              className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                canGoNext 
                  ? 'bg-[#14ad9f] text-white hover:bg-[#129488] hover:shadow-md transform hover:-translate-y-0.5' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!canGoNext}
              onClick={onNext}
            >
              {currentStep === totalSteps ? 'Abschließen' : 'Weiter'}
            </button>
          </div>
        </div>
        
        {/* Current step info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {stepsData.find(s => s.step === currentStep)?.title || `Schritt ${currentStep}`}
            {!canGoNext && (
              <span className="ml-2 text-orange-600">
                • Bitte füllen Sie alle Pflichtfelder aus
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingProgressBar;
