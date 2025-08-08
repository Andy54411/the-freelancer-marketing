'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { 
  OnboardingContextType, 
  CompanyOnboardingStatus, 
  stepValidationRules,
  onboardingSteps
} from '@/types/onboarding';

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
  companyId: string;
  initialStep?: number;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  companyId,
  initialStep
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<Record<number, any>>({});
  const [onboardingStatus, setOnboardingStatus] = useState<CompanyOnboardingStatus | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const totalSteps = onboardingSteps.length;

  // Load onboarding status
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      if (!companyId || !user) return;
      
      try {
        const onboardingDoc = await getDoc(doc(db, 'companies', companyId, 'onboarding', 'status'));
        if (onboardingDoc.exists()) {
          const data = onboardingDoc.data() as CompanyOnboardingStatus;
          setOnboardingStatus(data);
          setStepData(data.stepData || {});
          // Set current step based on saved progress or initialStep
          const stepNumber = initialStep || parseInt(data.currentStep) || 1;
          setCurrentStep(stepNumber);
        } else {
          // Create initial onboarding status for new companies
          const initialStatus: CompanyOnboardingStatus = {
            uid: companyId,
            status: 'pending_onboarding',
            completedSteps: [],
            currentStep: '1',
            startedAt: new Date(),
            registrationCompletedAt: new Date(),
            registrationMethod: 'new_registration',
            stepData: {},
            completionPercentage: 0
          };
          
          await setDoc(doc(db, 'companies', companyId, 'onboarding', 'status'), {
            ...initialStatus,
            startedAt: serverTimestamp(),
            registrationCompletedAt: serverTimestamp()
          });
          
          setOnboardingStatus(initialStatus);
        }
      } catch (error) {
        console.error('Error loading onboarding status:', error);
      }
    };

    loadOnboardingStatus();
  }, [companyId, user]);

  // Auto-save functionality (Stripe-style)
  useEffect(() => {
    if (!user || !companyId || Object.keys(stepData).length === 0) return;

    const saveTimer = setTimeout(async () => {
      await saveCurrentStep();
    }, 3000); // Auto-save after 3 seconds like Stripe

    return () => clearTimeout(saveTimer);
  }, [stepData, companyId, user]);

  // Validation functions
  const validateStep = useCallback((step: number, data: any): boolean => {
    const rules = stepValidationRules[step];
    if (!rules) return true;

    // Check required fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!data[field] || data[field] === '') {
          return false;
        }
      }
    }

    // Check validators
    if (rules.validators) {
      for (const [field, validator] of Object.entries(rules.validators)) {
        if (data[field] && !validator(data[field])) {
          return false;
        }
      }
    }

    // Check minimum lengths
    if (rules.minLength) {
      for (const [field, minLength] of Object.entries(rules.minLength)) {
        if (Array.isArray(data[field])) {
          if (data[field].length < minLength) return false;
        } else if (typeof data[field] === 'string') {
          if (data[field].length < minLength) return false;
        }
      }
    }

    return true;
  }, []);

  const getStepCompletion = useCallback((step: number): number => {
    const data = stepData[step] || {};
    const rules = stepValidationRules[step as keyof typeof stepValidationRules];
    
    if (!rules) return 0;

    const requiredFields = rules.required || [];
    const completedFields = requiredFields.filter(field => 
      data[field] && data[field] !== ''
    );

    return requiredFields.length > 0 
      ? (completedFields.length / requiredFields.length) * 100 
      : 0;
  }, [stepData]);

  const getOverallCompletion = useCallback((): number => {
    const stepCompletions = Array.from({ length: totalSteps }, (_, i) => 
      getStepCompletion(i + 1)
    );
    return stepCompletions.reduce((sum, completion) => sum + completion, 0) / totalSteps;
  }, [getStepCompletion, totalSteps]);

  const canGoNext = useCallback((): boolean => {
    return validateStep(currentStep, stepData[currentStep] || {});
  }, [currentStep, stepData, validateStep]);

  const canGoBack = useCallback((): boolean => {
    return currentStep > 1;
  }, [currentStep]);

  const canJumpToStep = useCallback((targetStep: number): boolean => {
    if (targetStep < 1 || targetStep > totalSteps) return false;
    
    // Can always go back to previous steps
    if (targetStep < currentStep) return true;
    
    // Can go to next step only if current is valid
    if (targetStep === currentStep + 1) {
      return canGoNext();
    }
    
    // Can't skip ahead
    return false;
  }, [currentStep, totalSteps, canGoNext]);

  const saveCurrentStep = useCallback(async (): Promise<void> => {
    if (!user || !companyId) return;

    setIsSaving(true);
    try {
      const newStatus: CompanyOnboardingStatus['status'] = getOverallCompletion() === 100 ? 'completed' : 'in_progress';
      
      const updatedStatus: CompanyOnboardingStatus = {
        ...onboardingStatus!,
        currentStep: currentStep.toString(),
        stepData,
        completionPercentage: getOverallCompletion(),
        status: newStatus
      };

      await updateDoc(doc(db, 'companies', companyId, 'onboarding', 'status'), {
        currentStep: currentStep.toString(),
        stepData,
        completionPercentage: getOverallCompletion(),
        status: newStatus,
        lastUpdated: serverTimestamp()
      });

      setOnboardingStatus(updatedStatus);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving onboarding step:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, companyId, currentStep, stepData, onboardingStatus, getOverallCompletion]);

  const goToStep = useCallback((step: number): void => {
    if (canJumpToStep(step)) {
      setCurrentStep(step);
    }
  }, [canJumpToStep]);

  const submitOnboarding = useCallback(async (): Promise<void> => {
    if (!user || !companyId) return;

    try {
      await updateDoc(doc(db, 'companies', companyId, 'onboarding', 'status'), {
        status: 'completed',
        completedAt: serverTimestamp(),
        completionPercentage: 100
      });

      // Update company document with onboarding completion
      await updateDoc(doc(db, 'companies', companyId), {
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        profileComplete: true
      });

    } catch (error) {
      console.error('Error submitting onboarding:', error);
      throw error;
    }
  }, [user, companyId]);

  // Helper functions
  const isStepCompleted = useCallback((step: number): boolean => {
    const rules = stepValidationRules[step];
    if (!rules || !stepData[step]) return false;
    
    const data = stepData[step];
    
    // Check required fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
          return false;
        }
      }
    }
    
    // Check validators
    if (rules.validators) {
      for (const [field, validator] of Object.entries(rules.validators)) {
        if (!validator(data[field])) {
          return false;
        }
      }
    }
    
    return true;
  }, [stepData]);

  const updateStepData = useCallback((step: number, data: any) => {
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data }
    }));
  }, []);

  const value: OnboardingContextType = {
    // Current State
    currentStep,
    totalSteps,
    completionPercentage: getOverallCompletion(),
    
    // Navigation Control
    canGoNext,
    canGoBack,
    canJumpToStep,
    
    // Data Management
    stepData,
    allStepsValid: getOverallCompletion() === 100,
    
    // Auto-Save
    autoSaveEnabled: true,
    lastSaved,
    isSaving,
    
    // Onboarding Management
    onboardingStatus,
    stepsData: onboardingSteps.map(step => ({
      step: step.step,
      title: step.title,
      description: step.description,
      isRequired: step.isRequired,
      estimatedTime: step.estimatedTime,
      isCompleted: isStepCompleted(step.step),
      isOptional: !step.isRequired
    })),
    
    // Progress Tracking
    getStepCompletion,
    getOverallCompletion,
    
    // Actions
    goToStep,
    goToNextStep: () => {
      if (canGoNext()) {
        setCurrentStep(prev => Math.min(prev + 1, onboardingSteps.length));
      }
    },
    goToPreviousStep: () => {
      if (canGoBack()) {
        setCurrentStep(prev => Math.max(prev - 1, 1));
      }
    },
    updateStepData,
    saveCurrentStep,
    submitOnboarding,
    startOnboarding: () => {
      setCurrentStep(1);
      if (onboardingStatus) {
        setOnboardingStatus({
          ...onboardingStatus,
          status: 'in_progress'
        });
      }
    },
    completeOnboarding: async () => {
      await submitOnboarding();
    },
    resetOnboarding: () => {
      setCurrentStep(1);
      setStepData({});
      if (onboardingStatus) {
        setOnboardingStatus({
          ...onboardingStatus,
          status: 'pending_onboarding',
          completionPercentage: 0
        });
      }
    }
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
