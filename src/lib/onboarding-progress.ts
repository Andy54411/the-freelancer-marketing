/**
 * Onboarding Progress Management für Firestore Integration
 * Vervollständigt die Onboarding System Implementation
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface OnboardingProgress {
  uid: string;
  status:
    | 'pending_onboarding'
    | 'in_progress'
    | 'completed'
    | 'approved'
    | 'rejected'
    | 'grandfathered';
  currentStep: number;
  completionPercentage: number;
  lastActivity: Date;
  stepsCompleted: number[];
  requiresApproval: boolean;
  adminNotes?: string;
  isLegacyCompany?: boolean;
  registrationMethod?: string;

  // Step completion tracking
  stepCompletionData: {
    step1: {
      personalDataComplete: boolean;
      addressComplete: boolean;
      phoneVerified: boolean;
      directorDataComplete: boolean;
      tosAccepted: boolean;
    };
    step2: {
      companyDataComplete: boolean;
      legalFormSet: boolean;
      websiteProvided: boolean;
      accountingSetup: boolean;
      bankingComplete: boolean;
    };
    step3: {
      profilePictureUploaded: boolean;
      publicDescriptionComplete: boolean;
      skillsAdded: boolean;
      portfolioAdded: boolean;
      servicePackagesCreated: boolean;
      hourlyRateSet: boolean;
      faqsCreated: boolean;
    };
    step4: {
      categoriesSelected: boolean;
      workingHoursSet: boolean;
      instantBookingConfigured: boolean;
      responseTimeSet: boolean;
      locationConfigured: boolean;
    };
    step5: {
      allDataComplete: boolean;
      documentsUploaded: boolean;
      stripeAccountCreated: boolean;
      verificationSubmitted: boolean;
      readyForApproval: boolean;
    };
  };

  // Timestamps
  startedAt: Timestamp;
  stepCompletedAt: Record<number, Timestamp>;
  completedAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  registrationCompletedAt: Timestamp;
  lastAutoSave: Timestamp;
}

/**
 * Initialisiert Onboarding Progress für neue Company
 */
export async function initializeOnboardingProgress(
  companyUid: string,
  registrationMethod: 'new_registration' | 'existing_grandfathered' = 'new_registration'
): Promise<OnboardingProgress> {
  const initialProgress: OnboardingProgress = {
    uid: companyUid,
    status: registrationMethod === 'new_registration' ? 'pending_onboarding' : 'grandfathered',
    currentStep: 1,
    completionPercentage: 0,
    lastActivity: new Date(),
    stepsCompleted: [],
    requiresApproval: false,
    isLegacyCompany: registrationMethod === 'existing_grandfathered',
    registrationMethod,

    stepCompletionData: {
      step1: {
        personalDataComplete: false,
        addressComplete: false,
        phoneVerified: false,
        directorDataComplete: false,
        tosAccepted: false,
      },
      step2: {
        companyDataComplete: false,
        legalFormSet: false,
        websiteProvided: false,
        accountingSetup: false,
        bankingComplete: false,
      },
      step3: {
        profilePictureUploaded: false,
        publicDescriptionComplete: false,
        skillsAdded: false,
        portfolioAdded: false,
        servicePackagesCreated: false,
        hourlyRateSet: false,
        faqsCreated: false,
      },
      step4: {
        categoriesSelected: false,
        workingHoursSet: false,
        instantBookingConfigured: false,
        responseTimeSet: false,
        locationConfigured: false,
      },
      step5: {
        allDataComplete: false,
        documentsUploaded: false,
        stripeAccountCreated: false,
        verificationSubmitted: false,
        readyForApproval: false,
      },
    },

    startedAt: serverTimestamp() as Timestamp,
    stepCompletedAt: {},
    registrationCompletedAt: serverTimestamp() as Timestamp,
    lastAutoSave: serverTimestamp() as Timestamp,
  };

  // Speichere zu Firestore
  await setDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'), initialProgress);

  return initialProgress;
}

/**
 * Lade Onboarding Progress für Company
 */
export async function getOnboardingProgress(
  companyUid: string
): Promise<OnboardingProgress | null> {
  try {
    const progressDoc = await getDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'));

    if (progressDoc.exists()) {
      return progressDoc.data() as OnboardingProgress;
    }

    return null;
  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    return null;
  }
}

/**
 * Update Onboarding Progress Step
 */
export async function updateOnboardingStep(
  companyUid: string,
  stepNumber: number,
  stepData: any,
  isCompleted: boolean = false
): Promise<void> {
  try {
    const progressRef = doc(db, 'users', companyUid, 'onboarding', 'progress');
    const currentProgress = await getDoc(progressRef);

    if (!currentProgress.exists()) {
      // Initialize if doesn't exist
      await initializeOnboardingProgress(companyUid);
    }

    const updateData: any = {
      currentStep: stepNumber,
      lastActivity: serverTimestamp(),
      lastAutoSave: serverTimestamp(),
      status: 'in_progress',
    };

    // Add step to completed steps if completed
    if (isCompleted) {
      const progressData = currentProgress.data() as OnboardingProgress;
      const completedSteps = progressData.stepsCompleted || [];

      if (!completedSteps.includes(stepNumber)) {
        updateData.stepsCompleted = [...completedSteps, stepNumber];
        updateData[`stepCompletedAt.${stepNumber}`] = serverTimestamp();
      }
    }

    // Calculate completion percentage
    const totalSteps = 5;
    const completedCount = (updateData.stepsCompleted || []).length;
    updateData.completionPercentage = (completedCount / totalSteps) * 100;

    // Update status based on completion
    if (updateData.completionPercentage >= 100) {
      updateData.status = 'completed';
      updateData.requiresApproval = true;
      updateData.completedAt = serverTimestamp();
    }

    await updateDoc(progressRef, updateData);
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    throw error;
  }
}

/**
 * Komplettiere Onboarding (Step 5 final submission)
 */
export async function completeOnboarding(companyUid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'), {
      status: 'completed',
      completionPercentage: 100,
      requiresApproval: true,
      completedAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      stepsCompleted: [1, 2, 3, 4, 5],
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
}

/**
 * Admin: Approve Company Onboarding
 */
export async function approveCompanyOnboarding(
  companyUid: string,
  approvedBy: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'), {
      status: 'approved',
      requiresApproval: false,
      approvedAt: serverTimestamp(),
      approvedBy,
      lastActivity: serverTimestamp(),
    });

    // Update main user document
    await updateDoc(doc(db, 'users', companyUid), {
      onboardingApproved: true,
      onboardingApprovedAt: serverTimestamp(),
      profileStatus: 'approved',
    });
  } catch (error) {
    console.error('Error approving company onboarding:', error);
    throw error;
  }
}

/**
 * Admin: Reject Company Onboarding
 */
export async function rejectCompanyOnboarding(
  companyUid: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', companyUid, 'onboarding', 'progress'), {
      status: 'rejected',
      requiresApproval: false,
      rejectedAt: serverTimestamp(),
      rejectedBy,
      rejectionReason: reason,
      lastActivity: serverTimestamp(),
    });

    // Update main user document
    await updateDoc(doc(db, 'users', companyUid), {
      profileStatus: 'rejected',
      rejectionReason: reason,
    });
  } catch (error) {
    console.error('Error rejecting company onboarding:', error);
    throw error;
  }
}

/**
 * Check if Company can access Dashboard (verwendet in Middleware)
 */
export async function canAccessDashboard(companyUid: string): Promise<boolean> {
  try {
    const progress = await getOnboardingProgress(companyUid);

    if (!progress) {
      // Kein Progress = Legacy Company, allow access
      return true;
    }

    // Allow access based on status
    const allowedStatuses = ['approved', 'grandfathered'];
    return allowedStatuses.includes(progress.status);
  } catch (error) {
    console.error('Error checking dashboard access:', error);
    // Allow access on error (safe fallback)
    return true;
  }
}

/**
 * Force Onboarding Check (verwendet in Middleware)
 */
export async function requiresOnboarding(companyUid: string): Promise<boolean> {
  try {
    const progress = await getOnboardingProgress(companyUid);

    if (!progress) {
      // Kein Progress = Legacy Company, no onboarding required
      return false;
    }

    // Require onboarding for new registrations that aren't completed
    const statusesRequiringOnboarding = ['pending_onboarding', 'in_progress'];
    return (
      progress.registrationMethod === 'new_registration' &&
      statusesRequiringOnboarding.includes(progress.status)
    );
  } catch (error) {
    console.error('Error checking onboarding requirement:', error);
    // Don't require onboarding on error (safe fallback)
    return false;
  }
}

/**
 * Get All Companies with Onboarding Status (für Admin Dashboard)
 */
export async function getAllCompaniesWithOnboardingStatus(): Promise<any[]> {
  try {
    // Get all companies
    const usersQuery = query(collection(db, 'users'), where('user_type', '==', 'firma'));
    const usersSnapshot = await getDocs(usersQuery);

    const companiesWithProgress: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Get onboarding progress
      const progressDoc = await getDoc(doc(db, 'users', userDoc.id, 'onboarding', 'progress'));

      let onboardingData: any = null;
      if (progressDoc.exists()) {
        onboardingData = progressDoc.data();
      }

      // Calculate default status for legacy companies
      const isLegacyCompany = !onboardingData;
      const defaultStatus = isLegacyCompany ? 'grandfathered' : 'pending_onboarding';

      companiesWithProgress.push({
        uid: userDoc.id,
        companyName: userData.companyName || 'Unbekanntes Unternehmen',
        email: userData.email || '',
        registrationDate: userData.createdAt?.toDate() || new Date(),
        onboardingStatus: onboardingData?.status || defaultStatus,
        currentStep: onboardingData?.currentStep || 0,
        completionPercentage: onboardingData?.completionPercentage || 0,
        lastActivity:
          onboardingData?.lastActivity?.toDate() || userData.createdAt?.toDate() || new Date(),
        stepsCompleted: onboardingData?.stepsCompleted || [],
        requiresApproval: onboardingData?.requiresApproval || false,
        adminNotes: onboardingData?.adminNotes || '',
        isLegacyCompany,
        registrationMethod: onboardingData?.registrationMethod || 'existing_grandfathered',
      });
    }

    return companiesWithProgress;
  } catch (error) {
    console.error('Error getting companies with onboarding status:', error);
    return [];
  }
}
