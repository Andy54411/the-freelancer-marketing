/**
 * Legacy Company Migration Script
 * Migriert bestehende Companies zu Onboarding System mit Grandfathered Status
 * Basierend auf Dokumentation: Real Example Migration für Company "0Rj5vGkBjeXrzZKBr4cFfV0jRuw1"
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Firebase Config (simplified for script)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface ExistingCompanyUser {
  uid: string;
  companyName: string;
  email: string;
  user_type: "firma";
  createdAt: any;
  
  // Registration Steps Data
  step1?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    personalStreet?: string;
    personalCity?: string;
    personalPostalCode?: string;
    personalCountry?: string;
    isManagingDirectorOwner?: boolean;
  };
  
  step2?: {
    companyName?: string;
    address?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    industry?: string;
    industryMcc?: string;
    legalForm?: string;
    website?: string;
    description?: string;
    employees?: string;
    languages?: string;
  };
  
  step3?: {
    hourlyRate?: string;
    profilePictureURL?: string;
    taxNumber?: string;
    vatId?: string;
    companyRegister?: string;
    ust?: string;
    profitMethod?: string;
    priceInput?: string;
  };
  
  step4?: {
    accountHolder?: string;
    iban?: string;
    bankCountry?: string;
    stripeAccountId?: string;
    stripeAccountChargesEnabled?: boolean;
    stripeAccountPayoutsEnabled?: boolean;
    bic?: string;
  };
  
  // Profile Data
  publicDescription?: string;
  skills?: string[];
  languages?: Array<{ language: string; proficiency: string; }>;
  portfolio?: any[];
  servicePackages?: any[];
  faqs?: any[];
  specialties?: string[];
  certifications?: any[];
  education?: any[];
  workingHours?: any[];
  
  // Location & Business Settings
  lat?: number;
  lng?: number;
  radiusKm?: number;
  instantBooking?: boolean;
  responseTimeGuarantee?: number;
  selectedCategory?: string;
  selectedSubcategory?: string;
  preferredInvoiceTemplate?: string;
  
  // File Uploads
  profilePictureFirebaseUrl?: string;
  profileBannerImage?: string;
  identityFrontFirebaseUrl?: string;
  identityBackFirebaseUrl?: string;
  businessLicenseFirebaseUrl?: string;
  
  // Stripe & Verification
  stripeVerificationStatus?: string;
  tosAcceptanceIp?: string;
  tosAcceptanceUserAgent?: string;
  registrationCompletedAt?: string;
  
  // Banking Integration (FinAPI)
  banking?: {
    isSetup?: boolean;
    totalBalance?: number;
    totalAccounts?: number;
    accounts?: Record<string, any>;
  };
}

interface OnboardingProgress {
  status: 'pending_onboarding' | 'in_progress' | 'completed' | 'approved' | 'grandfathered';
  currentStep: number;
  completionPercentage: number;
  stepsCompleted: number[];
  stepValidations: Record<number, boolean>;
  registrationMethod: 'new_registration' | 'existing_grandfathered';
  isLegacyCompany: boolean;
  legacyDataMigrated?: boolean;
  legacyDataMigrationDate?: any;
  legacyCompletionCalculated?: number;
  startedAt: any;
  completedAt?: any;
  approvedAt?: any;
  approvedBy?: string;
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
  lastAutoSave: any;
  stepCompletedAt: Record<number, any>;
}

// Calculate Real Completion based on existing Live Data
const calculateRealCompletion = (companyData: ExistingCompanyUser): OnboardingProgress => {
  console.log(`Analyzing company: ${companyData.companyName} (${companyData.uid})`);
  
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
    companyData.skills && companyData.skills.length >= 2 &&
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
    .map((isComplete, index) => isComplete ? index + 1 : null)
    .filter(step => step !== null) as number[];
  
  const completionPercentage = (completedSteps.length / 5) * 100;
  
  // Determine status based on completion
  let status: 'grandfathered' | 'approved' = 'grandfathered';
  let approvedAt = null;
  let approvedBy: string | undefined = undefined;
  
  if (completionPercentage >= 80) {
    status = 'approved';
    approvedAt = companyData.createdAt;
    approvedBy = 'system_migration';
  }
  
  console.log(`- Step 1 Complete: ${step1Complete}`);
  console.log(`- Step 2 Complete: ${step2Complete}`);
  console.log(`- Step 3 Complete: ${step3Complete}`);
  console.log(`- Step 4 Complete: ${step4Complete}`);
  console.log(`- Step 5 Complete: ${step5Complete}`);
  console.log(`- Overall Completion: ${completionPercentage}%`);
  console.log(`- Status: ${status}`);
  
  return {
    status,
    currentStep: Math.max(...completedSteps, 0),
    completionPercentage,
    stepsCompleted: completedSteps,
    stepValidations: {
      1: step1Complete,
      2: step2Complete,
      3: step3Complete,
      4: step4Complete,
      5: step5Complete
    },
    registrationMethod: 'existing_grandfathered',
    isLegacyCompany: true,
    legacyDataMigrated: true,
    legacyDataMigrationDate: serverTimestamp(),
    legacyCompletionCalculated: completionPercentage,
    startedAt: companyData.createdAt,
    completedAt: completionPercentage >= 80 ? companyData.createdAt : null,
    approvedAt,
    approvedBy,
    
    // Detailed step mapping für Real Data
    stepCompletionData: {
      step1: {
        personalDataComplete: !!(companyData.step1?.firstName && companyData.step1?.lastName),
        addressComplete: !!(companyData.step1?.personalStreet && companyData.step1?.personalCity),
        phoneVerified: !!companyData.step1?.phoneNumber,
        directorDataComplete: !!companyData.step1?.isManagingDirectorOwner,
        tosAccepted: !!companyData.tosAcceptanceIp
      },
      step2: {
        companyDataComplete: !!(companyData.step2?.companyName && companyData.step2?.address),
        legalFormSet: !!companyData.step2?.legalForm,
        websiteProvided: !!companyData.step2?.website,
        accountingSetup: !!(companyData.step3?.vatId || companyData.step3?.ust), 
        bankingComplete: !!(companyData.step4?.iban && companyData.step4?.accountHolder)
      },
      step3: {
        profilePictureUploaded: !!companyData.step3?.profilePictureURL,
        publicDescriptionComplete: !!(companyData.publicDescription && companyData.publicDescription.length >= 50),
        skillsAdded: !!(companyData.skills && companyData.skills.length >= 2),
        portfolioAdded: !!(companyData.portfolio && companyData.portfolio.length >= 1),
        servicePackagesCreated: !!(companyData.servicePackages && companyData.servicePackages.length >= 1),
        hourlyRateSet: !!companyData.step3?.hourlyRate,
        faqsCreated: !!(companyData.faqs && companyData.faqs.length >= 1)
      },
      step4: {
        categoriesSelected: !!(companyData.selectedCategory && companyData.selectedSubcategory),
        workingHoursSet: !!(companyData.workingHours && companyData.workingHours.length > 0),
        instantBookingConfigured: companyData.instantBooking !== undefined,
        responseTimeSet: !!companyData.responseTimeGuarantee,
        locationConfigured: !!(companyData.lat && companyData.lng)
      },
      step5: {
        allDataComplete: completionPercentage >= 60,
        documentsUploaded: !!(companyData.identityFrontFirebaseUrl && companyData.identityBackFirebaseUrl),
        stripeAccountCreated: !!companyData.step4?.stripeAccountId,
        verificationSubmitted: !!companyData.stripeVerificationStatus,
        readyForApproval: completionPercentage >= 80
      }
    },
    
    lastAutoSave: serverTimestamp(),
    stepCompletedAt: {
      ...(step1Complete && { 1: companyData.createdAt }),
      ...(step2Complete && { 2: companyData.createdAt }),
      ...(step3Complete && { 3: companyData.createdAt }),
      ...(step4Complete && { 4: companyData.createdAt }),
      ...(step5Complete && { 5: companyData.createdAt })
    }
  };
};

// Main Migration Function
const migrateLegacyCompanies = async () => {
  console.log('🚀 Starting Legacy Company Migration...');
  
  try {
    // Get all existing companies (user_type: "firma")
    const usersQuery = query(collection(db, 'users'), where('user_type', '==', 'firma'));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log(`Found ${usersSnapshot.docs.length} companies to analyze`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const companyData = userDoc.data() as ExistingCompanyUser;
      companyData.uid = userDoc.id;
      
      try {
        // Check if onboarding progress already exists
        const onboardingDoc = await getDoc(doc(db, 'users', userDoc.id, 'onboarding', 'progress'));
        
        if (onboardingDoc.exists()) {
          console.log(`⏭️  Skipping ${companyData.companyName} - onboarding data already exists`);
          skippedCount++;
          continue;
        }
        
        // Calculate completion based on real existing data
        const onboardingProgress = calculateRealCompletion(companyData);
        
        // Create onboarding progress document
        await setDoc(doc(db, 'users', userDoc.id, 'onboarding', 'progress'), onboardingProgress);
        
        console.log(`✅ Migrated: ${companyData.companyName} - ${onboardingProgress.completionPercentage}% complete - Status: ${onboardingProgress.status}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating ${companyData.companyName}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} companies`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount} companies`);
    console.log(`❌ Errors: ${errorCount} companies`);
    console.log(`📈 Total processed: ${migratedCount + skippedCount + errorCount} companies`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Execute Migration
if (require.main === module) {
  migrateLegacyCompanies()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateLegacyCompanies, calculateRealCompletion };
