/**
 * Legacy Company Data Migration Script
 * Migrates existing companies to the new onboarding system
 * Based on real live data structure analysis from Taskilo database
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface ExistingCompanyUser {
  uid: string;
  companyName: string;
  email: string;
  user_type: 'firma';
  createdAt: any;

  // Registration Steps Data (already exists)
  step1?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phoneNumber: string;
    personalStreet: string;
    personalCity: string;
    personalPostalCode: string;
    personalCountry: string;
    isManagingDirectorOwner: boolean;
  };

  step2?: {
    companyName: string;
    address: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    industry: string;
    industryMcc: string;
    legalForm: string;
    website: string;
    description: string;
    employees: string;
    languages: string;
  };

  step3?: {
    hourlyRate: string;
    profilePictureURL: string;
    taxNumber: string;
    vatId: string;
    companyRegister: string;
    ust?: string;
    profitMethod?: string;
    priceInput?: string;
  };

  step4?: {
    accountHolder: string;
    iban: string;
    bankCountry: string;
    stripeAccountId: string;
    stripeAccountChargesEnabled: boolean;
    stripeAccountPayoutsEnabled: boolean;
    bic?: string;
  };

  // Profile Data (already exists)
  publicDescription?: string;
  skills?: string[];
  languages?: Array<{ language: string; proficiency: string }>;
  portfolio?: any[];
  servicePackages?: any[];
  faqs?: any[];
  specialties?: string[];
  certifications?: any[];
  education?: any[];
  workingHours?: any[];

  // Location & Business Settings (already exists)
  lat?: number;
  lng?: number;
  radiusKm?: number;
  instantBooking?: boolean;
  responseTimeGuarantee?: number;
  selectedCategory?: string;
  selectedSubcategory?: string;
  preferredInvoiceTemplate?: string;

  // File Uploads (already exists)
  profilePictureFirebaseUrl?: string;
  profileBannerImage?: string;
  identityFrontFirebaseUrl?: string;
  identityBackFirebaseUrl?: string;
  businessLicenseFirebaseUrl?: string;

  // Stripe & Verification (already exists)
  stripeVerificationStatus?: string;
  tosAcceptanceIp?: string;
  tosAcceptanceUserAgent?: string;
  registrationCompletedAt?: string;

  // Banking Integration (FinAPI) (already exists)
  banking?: {
    isSetup: boolean;
    totalBalance: number;
    totalAccounts: number;
    accounts: Record<
      string,
      {
        accountName: string;
        iban: string;
        balance: number;
        currency: string;
        isDefault: boolean;
      }
    >;
  };
}

interface OnboardingProgress {
  status: 'pending_onboarding' | 'in_progress' | 'completed' | 'approved' | 'grandfathered';
  currentStep: number;
  completionPercentage: number;

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

  stepsCompleted: number[];
  stepValidations: Record<number, boolean>;
  lastAutoSave: any;
  startedAt: any;
  stepCompletedAt: Record<number, any>;
  completedAt?: any;
  approvedAt?: any;
  approvedBy?: string;
  registrationCompletedAt: any;
  registrationMethod: 'new_registration' | 'existing_grandfathered';
  isLegacyCompany: boolean;
  legacyDataMigrated?: boolean;
  legacyDataMigrationDate?: any;
  legacyCompletionCalculated?: number;
}

/**
 * Clean object by removing undefined values before saving to Firestore
 */
function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore).filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    });
    return cleaned;
  }

  return obj;
}

/**
 * Calculate completion percentage based on existing company data
 * Real example: "Mietkoch Andy" (UID: 0Rj5vGkBjeXrzZKBr4cFfV0jRuw1)
 */
function calculateRealCompletion(companyData: ExistingCompanyUser): OnboardingProgress {
  // Step 1: Personal & Company Basic Data
  const step1Complete = !!(
    companyData.step1?.firstName &&
    companyData.step1?.lastName &&
    companyData.companyName &&
    companyData.email &&
    companyData.tosAcceptanceIp
  );

  // Step 2: Business Setup & Banking
  const step2Complete = !!(
    companyData.step2?.industry &&
    companyData.step2?.legalForm &&
    companyData.step4?.iban &&
    companyData.step4?.accountHolder &&
    companyData.step2?.website
  );

  // Step 3: Profile & Services
  const step3Complete = !!(
    companyData.step3?.profilePictureURL &&
    companyData.skills &&
    companyData.skills.length >= 2 &&
    companyData.step3?.hourlyRate &&
    companyData.selectedCategory
  );

  // Step 4: Categories & Location
  const step4Complete = !!(
    companyData.selectedCategory &&
    companyData.selectedSubcategory &&
    companyData.lat &&
    companyData.lng &&
    companyData.radiusKm
  );

  // Step 5: Stripe & Verification
  const step5Complete = !!(
    companyData.step4?.stripeAccountId &&
    companyData.stripeVerificationStatus &&
    companyData.step4?.stripeAccountChargesEnabled
  );

  const completedSteps = [step1Complete, step2Complete, step3Complete, step4Complete, step5Complete]
    .map((isComplete, index) => (isComplete ? index + 1 : null))
    .filter(step => step !== null) as number[];

  const completionPercentage = (completedSteps.length / 5) * 100;

  return {
    status: completionPercentage >= 80 ? 'approved' : 'grandfathered',
    currentStep: Math.max(...completedSteps, 0),
    completionPercentage,
    stepsCompleted: completedSteps,
    registrationMethod: 'existing_grandfathered',
    isLegacyCompany: true,
    legacyDataMigrated: true,
    legacyDataMigrationDate: serverTimestamp(),
    legacyCompletionCalculated: completionPercentage,
    startedAt: companyData.createdAt,
    // Nur completedAt und approvedAt setzen wenn completion >= 80%
    ...(completionPercentage >= 80 && {
      completedAt: companyData.createdAt,
      approvedAt: companyData.createdAt,
      approvedBy: 'system_migration',
    }),
    registrationCompletedAt: companyData.createdAt,
    lastAutoSave: serverTimestamp(),

    // Detailed step mapping for real data
    stepCompletionData: {
      step1: {
        personalDataComplete: !!(companyData.step1?.firstName && companyData.step1?.lastName),
        addressComplete: !!(companyData.step1?.personalStreet && companyData.step1?.personalCity),
        phoneVerified: !!companyData.step1?.phoneNumber,
        directorDataComplete: !!companyData.step1?.isManagingDirectorOwner,
        tosAccepted: !!companyData.tosAcceptanceIp,
      },
      step2: {
        companyDataComplete: !!(companyData.step2?.companyName && companyData.step2?.address),
        legalFormSet: !!companyData.step2?.legalForm,
        websiteProvided: !!companyData.step2?.website,
        accountingSetup: !!companyData.step3?.vatId,
        bankingComplete: !!(companyData.step4?.iban && companyData.step4?.accountHolder),
      },
      step3: {
        profilePictureUploaded: !!companyData.step3?.profilePictureURL,
        publicDescriptionComplete: (companyData.publicDescription?.length || 0) >= 200,
        skillsAdded: (companyData.skills?.length || 0) >= 2,
        portfolioAdded: (companyData.portfolio?.length || 0) >= 1,
        servicePackagesCreated: (companyData.servicePackages?.length || 0) >= 1,
        hourlyRateSet: !!companyData.step3?.hourlyRate,
        faqsCreated: (companyData.faqs?.length || 0) >= 3,
      },
      step4: {
        categoriesSelected: !!(companyData.selectedCategory && companyData.selectedSubcategory),
        workingHoursSet: (companyData.workingHours?.length || 0) > 0,
        instantBookingConfigured: companyData.instantBooking !== undefined,
        responseTimeSet: !!companyData.responseTimeGuarantee,
        locationConfigured: !!(companyData.lat && companyData.lng),
      },
      step5: {
        allDataComplete: completionPercentage >= 60,
        documentsUploaded: !!(
          companyData.identityFrontFirebaseUrl && companyData.identityBackFirebaseUrl
        ),
        stripeAccountCreated: !!companyData.step4?.stripeAccountId,
        verificationSubmitted: !!companyData.stripeVerificationStatus,
        readyForApproval: completionPercentage >= 80,
      },
    },

    stepValidations: {
      1: step1Complete,
      2: step2Complete,
      3: step3Complete,
      4: step4Complete,
      5: step5Complete,
    },
    stepCompletedAt: {},
  };
}

/**
 * Main migration function - migrates all existing companies
 */
export async function migrateLegacyCompanies(): Promise<{
  success: number;
  errors: number;
  total: number;
}> {
  console.log('🚀 Starting Legacy Company Migration...');

  let successCount = 0;
  let errorCount = 0;
  let totalCount = 0;

  try {
    // Get all existing companies (user_type: "firma")
    const companiesQuery = query(collection(db, 'users'), where('user_type', '==', 'firma'));

    const companiesSnapshot = await getDocs(companiesQuery);
    totalCount = companiesSnapshot.docs.length;

    console.log(`📊 Found ${totalCount} companies to migrate`);

    for (const companyDoc of companiesSnapshot.docs) {
      try {
        const companyData = companyDoc.data() as ExistingCompanyUser;
        companyData.uid = companyDoc.id;

        // Calculate onboarding progress based on existing data
        const onboardingProgress = calculateRealCompletion(companyData);

        // Clean the progress object to remove undefined values
        const cleanedProgress = cleanForFirestore(onboardingProgress);

        // Create onboarding progress document
        await setDoc(doc(db, 'users', companyDoc.id, 'onboarding', 'progress'), cleanedProgress);

        successCount++;

        console.log(
          `✅ Migrated: ${companyData.companyName} - ${onboardingProgress.completionPercentage}% complete - Status: ${onboardingProgress.status}`
        );

        // Special log for real example "Mietkoch Andy"
        if (companyData.companyName === 'Mietkoch Andy') {
          console.log('🎯 REAL EXAMPLE MIGRATED:', {
            uid: companyData.uid,
            companyName: companyData.companyName,
            completionPercentage: onboardingProgress.completionPercentage,
            status: onboardingProgress.status,
            stepsCompleted: onboardingProgress.stepsCompleted,
            hasStripeAccount: !!companyData.step4?.stripeAccountId,
            hasSkills: companyData.skills?.length || 0,
            hasCategory: !!companyData.selectedCategory,
          });
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating company ${companyDoc.id}:`, error);
      }
    }

    console.log(`🎉 Migration Complete!`);
    console.log(`✅ Successfully migrated: ${successCount} companies`);
    console.log(`❌ Errors: ${errorCount} companies`);
    console.log(`📊 Total processed: ${totalCount} companies`);

    return {
      success: successCount,
      errors: errorCount,
      total: totalCount,
    };
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

/**
 * Migrate a single company by UID (for testing)
 */
export async function migrateSingleCompany(companyUid: string): Promise<OnboardingProgress> {
  console.log(`🔄 Migrating single company: ${companyUid}`);

  try {
    // This would be replaced with actual Firestore call
    // const companyDoc = await getDoc(doc(db, 'users', companyUid));
    // const companyData = companyDoc.data() as ExistingCompanyUser;

    // For testing with real "Mietkoch Andy" data:
    const testCompanyData: ExistingCompanyUser = {
      uid: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1',
      companyName: 'Mietkoch Andy',
      email: 'a.staudinger32@icloud.com',
      user_type: 'firma',
      createdAt: { toDate: () => new Date('2025-07-24T16:49:38.167Z') },
      step1: {
        firstName: 'andy',
        lastName: 'staudinger',
        dateOfBirth: '1984-02-01',
        phoneNumber: '+491605979000',
        personalStreet: 'Siedlung am Wald 6',
        personalCity: 'Sellin',
        personalPostalCode: '18586',
        personalCountry: 'DE',
        isManagingDirectorOwner: true,
      },
      step2: {
        companyName: 'Mietkoch Andy',
        address: 'Siedlung am Wald 6',
        street: 'Siedlung am Wald 6',
        city: 'Sellin',
        postalCode: '18586',
        country: 'DE',
        industry: 'Hotel & Gastronomie',
        industryMcc: '5812',
        legalForm: 'GmbH',
        website: 'https//mietkoch.de',
        description: 'Testetetkabwdna,jefnak...',
        employees: '3',
        languages: 'Deutsch',
      },
      step3: {
        hourlyRate: '41',
        profilePictureURL: 'https://storage.googleapis.com/...',
        taxNumber: '',
        vatId: 'DE123456789',
        companyRegister: 'RE4329816294z128',
      },
      step4: {
        accountHolder: 'Andy Staudinger',
        iban: 'DE89370400440532013000',
        bankCountry: 'DE',
        stripeAccountId: 'acct_1RoSL4DlTKEWRrRh',
        stripeAccountChargesEnabled: true,
        stripeAccountPayoutsEnabled: false,
      },
      skills: ['Deutsche Küche', 'Fine dish'],
      languages: [{ language: 'Englisch', proficiency: 'Fortgeschritten' }],
      portfolio: [],
      servicePackages: [],
      faqs: [],
      lat: 54.3703519,
      lng: 13.7028588,
      radiusKm: 30,
      instantBooking: false,
      responseTimeGuarantee: 24,
      selectedCategory: 'Hotel & Gastronomie',
      selectedSubcategory: 'Mietkoch',
      tosAcceptanceIp: '85.199.68.45',
      stripeVerificationStatus: 'pending',
    };

    const onboardingProgress = calculateRealCompletion(testCompanyData);

    console.log('🎯 Migration result for Mietkoch Andy:', {
      completionPercentage: onboardingProgress.completionPercentage,
      status: onboardingProgress.status,
      stepsCompleted: onboardingProgress.stepsCompleted,
    });

    return onboardingProgress;
  } catch (error) {
    console.error(`❌ Error migrating company ${companyUid}:`, error);
    throw error;
  }
}

/**
 * Run migration from admin dashboard
 */
export async function runMigrationFromAdmin(): Promise<string> {
  try {
    const result = await migrateLegacyCompanies();
    return `Migration completed successfully! Migrated ${result.success} of ${result.total} companies (${result.errors} errors)`;
  } catch (error) {
    return `Migration failed: ${error}`;
  }
}

/**
 * Check completion status for a specific company in real-time
 * This function checks existing companies and determines if they need onboarding
 */
export async function checkCompanyOnboardingStatus(companyUid: string): Promise<{
  needsOnboarding: boolean;
  completionPercentage: number;
  currentStep: number;
  onboardingProgress?: OnboardingProgress;
}> {
  try {
    // First check if they already have onboarding progress
    const onboardingRef = doc(db, 'companies', companyUid, 'onboarding', 'progress');
    const onboardingSnap = await getDoc(onboardingRef);

    if (onboardingSnap.exists()) {
      const onboardingData = onboardingSnap.data() as OnboardingProgress;
      return {
        needsOnboarding: onboardingData.completionPercentage < 100,
        completionPercentage: onboardingData.completionPercentage,
        currentStep: findNextIncompleteStep(onboardingData),
        onboardingProgress: onboardingData,
      };
    }

    // If no onboarding progress exists, check their legacy data
    const userRef = doc(db, 'users', companyUid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return {
        needsOnboarding: true,
        completionPercentage: 0,
        currentStep: 1,
      };
    }

    const userData = userSnap.data() as ExistingCompanyUser;

    // Calculate completion based on existing data
    const calculatedProgress = calculateRealCompletion(userData);

    // Clean the progress object to remove undefined values before saving
    const cleanedProgress = cleanForFirestore(calculatedProgress);

    // Auto-create onboarding progress if it doesn't exist
    await setDoc(onboardingRef, cleanedProgress);

    return {
      needsOnboarding: calculatedProgress.completionPercentage < 100,
      completionPercentage: calculatedProgress.completionPercentage,
      currentStep: findNextIncompleteStep(calculatedProgress),
      onboardingProgress: calculatedProgress,
    };
  } catch (error) {
    console.error(`❌ Error checking onboarding status for ${companyUid}:`, error);
    return {
      needsOnboarding: true,
      completionPercentage: 0,
      currentStep: 1,
    };
  }
}

/**
 * Find the next incomplete step based on completion data
 */
function findNextIncompleteStep(progress: OnboardingProgress): number {
  const steps = [1, 2, 3, 4, 5];

  for (const step of steps) {
    if (!progress.stepsCompleted.includes(step)) {
      return step;
    }
  }

  return 1; // Default to step 1 if all steps are marked as complete
}
