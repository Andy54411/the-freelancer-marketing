// Admin Company Details API
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log(`Fetching company details for ID: ${id}`);

    // Hole das spezifische Unternehmen aus der Firebase companies Collection
    const companyDoc = await db.collection('companies').doc(id).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found', company: null }, { status: 404 });
    }

    const data = companyDoc.data();

    // Lade echte Statistiken aus auftraege und quotes Collections
    console.log(`Loading statistics for company ${id}...`);

    // Hole alle Aufträge wo diese Company der Anbieter ist
    const auftraegeSnapshot = await db
      .collection('auftraege')
      .where('selectedAnbieterId', '==', id)
      .get();

    // Hole alle Quotes wo diese Company der Provider ist
    const quotesSnapshot = await db.collection('quotes').where('providerId', '==', id).get();

    console.log(
      `Found ${auftraegeSnapshot.size} auftraege and ${quotesSnapshot.size} quotes for company ${id}`
    );

    // Berechne Statistiken aus Aufträgen
    let totalRevenue = 0;
    const totalOrders = auftraegeSnapshot.size;
    let completedOrders = 0;

    auftraegeSnapshot.forEach(doc => {
      const auftrag = doc.data();
      // Addiere den Umsatz (in Cents, konvertiere zu Euro)
      if (auftrag.jobCalculatedPriceInCents) {
        totalRevenue += auftrag.jobCalculatedPriceInCents / 100;
      }
      // Zähle abgeschlossene Aufträge
      if (auftrag.status === 'ABGESCHLOSSEN' || auftrag.status === 'COMPLETED') {
        completedOrders++;
      }
    });

    // Berechne Statistiken aus Quotes
    let quotesTotalRevenue = 0;
    let paidQuotes = 0;

    quotesSnapshot.forEach(doc => {
      const quote = doc.data();
      // Addiere Umsatz aus bezahlten Quotes
      if (quote.payment?.status === 'paid' && quote.payment?.totalAmount) {
        quotesTotalRevenue += quote.payment.totalAmount;
        paidQuotes++;
      }
    });

    // Kombiniere Gesamtumsatz
    const combinedTotalRevenue = totalRevenue + quotesTotalRevenue;
    const combinedTotalOrders = totalOrders + paidQuotes;

    // Placeholder für Bewertungen (könnte aus einer reviews Collection kommen)
    const avgRating = 0; // TODO: Implementiere echte Bewertungslogik
    const reviewCount = 0;

    console.log(
      `Statistics calculated: Revenue: €${combinedTotalRevenue}, Orders: ${combinedTotalOrders}`
    );

    // Bestimme Status basierend auf verschiedenen Status-Feldern
    let status = 'inactive';
    if (data?.profileStatus === 'active' || data?.status === 'active') {
      status = 'active';
    } else if (data?.status === 'suspended') {
      status = 'suspended';
    } else if (
      data?.profileStatus === 'pending_review' ||
      data?.status === 'pending_verification'
    ) {
      status = 'inactive';
    }

    const company = {
      id: companyDoc.id,
      email: data?.email,
      name: data?.companyName || data?.email,
      type: 'company',
      companyName: data?.companyName,

      // Industrie und Kategorie
      industry: data?.selectedCategory || data?.industry,
      selectedSubcategory: data?.selectedSubcategory,

      // Kontaktdaten
      website: data?.website || data?.step1?.website,
      phone: data?.step1?.phoneNumber || data?.companyPhoneNumber,

      // Status und Verifizierung
      status: status,
      profileStatus: data?.profileStatus,
      stripeVerificationStatus: data?.stripeVerificationStatus,

      // Zeitstempel
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      onboardingCompletedAt: data?.onboardingCompletedAt?.toDate?.()?.toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString(),

      // Adressdaten - Company
      address: `${data?.companyStreet || ''} ${data?.companyHouseNumber || ''}`.trim(),
      city: data?.companyCity,
      postalCode: data?.companyPostalCode,
      country: data?.companyCountry,
      location: data?.location,
      lat: data?.lat,
      lng: data?.lng,

      // Adressdaten - Personal
      personalAddress: data?.step1?.personalStreet,
      personalCity: data?.step1?.personalCity,
      personalPostalCode: data?.step1?.personalPostalCode,
      personalCountry: data?.step1?.personalCountry,

      // Beschreibung und Services
      description: data?.description || data?.step1?.description,
      skills: data?.skills || [],
      languages: data?.languages || [],
      serviceAreas: data?.serviceAreas || [],

      // Stripe und Payment
      stripeAccountId: data?.step5?.stripeAccountId || data?.stripeAccountId,
      stripeAccountChargesEnabled: data?.step5?.stripeAccountChargesEnabled,
      stripeAccountPayoutsEnabled: data?.step5?.stripeAccountPayoutsEnabled,
      stripeAccountDetailsSubmitted: data?.step5?.stripeAccountDetailsSubmitted,
      stripeAccountCreationDate: data?.step5?.stripeAccountCreationDate?.toDate?.()?.toISOString(),

      // Geschäftsdaten
      businessType: data?.businessType || data?.step1?.businessType,
      legalForm: data?.legalForm || data?.step2?.legalForm,
      vatNumber: data?.step3?.vatId || data?.vatNumber,
      vatId: data?.step3?.vatId,
      taxNumber: data?.step3?.taxNumber,
      taxRate: data?.step5?.taxRate || data?.step2?.taxRate,
      kleinunternehmer: data?.kleinunternehmer || data?.step2?.kleinunternehmer,

      // Kontaktperson
      accountHolder: data?.accountHolder || data?.step4?.accountHolder,
      dateOfBirth: data?.step1?.dateOfBirth,

      // Bank und Finanzen
      iban: data?.iban || data?.step4?.iban,
      employees: data?.employees || data?.step1?.employees,
      hourlyRate: data?.hourlyRate,
      priceInput: data?.priceInput || data?.step2?.priceInput,
      profitMethod: data?.profitMethod || data?.step2?.profitMethod,

      // Onboarding und Profile
      onboardingCompleted: data?.onboardingCompleted,
      onboardingCompletionPercentage: data?.onboardingCompletionPercentage,
      onboardingCurrentStep: data?.onboardingCurrentStep,
      profileComplete: data?.profileComplete,
      documentsCompleted: data?.documentsCompleted || data?.step5?.documentsCompleted,

      // Verfügbarkeit und Service
      availabilityType: data?.availabilityType || data?.step4?.availabilityType,
      advanceBookingHours: data?.advanceBookingHours || data?.step4?.advanceBookingHours,
      maxTravelDistance: data?.maxTravelDistance || data?.step4?.maxTravelDistance,
      travelCosts: data?.step4?.travelCosts || data?.step5?.travelCosts,
      travelCostPerKm: data?.step4?.travelCostPerKm || data?.step5?.travelCostPerKm,
      radiusKm: data?.radiusKm,

      // Bilder und Medien
      profilePictureURL: data?.step3?.profilePictureURL,
      profileBannerImage: data?.profileBannerImage || data?.step3?.profileBannerImage,

      // Dokumente
      identityFrontUrl: data?.step3?.identityFrontUrl,
      identityBackUrl: data?.step3?.identityBackUrl,
      businessLicenseURL: data?.step3?.businessLicenseURL,
      companyRegister: data?.step3?.companyRegister,

      // Platform-spezifische Daten (ECHTE STATISTIKEN)
      totalOrders: combinedTotalOrders,
      totalRevenue: combinedTotalRevenue,
      avgRating: avgRating,
      reviewCount: reviewCount,

      // Zusätzliche Statistik-Details für Admin
      auftraegeCount: totalOrders,
      auftraegeRevenue: totalRevenue,
      quotesCount: paidQuotes,
      quotesRevenue: quotesTotalRevenue,
      completedOrders: completedOrders,

      // Admin Approval System
      adminApproved: data?.adminApproved || false,
      adminApprovedAt: data?.adminApprovedAt?.toDate?.()?.toISOString(),
      adminApprovedBy: data?.adminApprovedBy,
      adminNotes: data?.adminNotes,
      approvalStatus: data?.approvalStatus || 'pending',

      // Verifizierung und Status (erweitert)
      verified: data?.verified || data?.profileComplete || false,
      verificationStatus: data?.stripeVerificationStatus || data?.profileStatus || 'pending',
      lastVerificationUpdate: data?.onboardingCompletedAt?.toDate?.()?.toISOString(),

      // Zusätzliche Metadaten
      userType: data?.userType,
      createdByCallable: data?.createdByCallable,
      industryMcc: data?.step2?.industryMcc,

      // Verifikationsdokumente Status
      hasIdentityDocuments: !!(data?.step3?.identityFrontUrl && data?.step3?.identityBackUrl),
      hasBusinessLicense: !!data?.step3?.businessLicenseURL,
      hasCompanyRegister: !!data?.step3?.companyRegister,

      // Management Flags (aus step1)
      isManagingDirectorOwner: data?.step1?.isManagingDirectorOwner,
      isActualDirector: data?.step1?.isActualDirector,
      isActualExecutive: data?.step1?.isActualExecutive,
      isActualOwner: data?.step1?.isActualOwner,
      ownershipPercentage: data?.step1?.ownershipPercentage,

      // Legacy-Kompatibilität
      documentsUploaded: data?.documentsUploaded || [],
      notificationSettings: data?.notificationSettings,
      privacySettings: data?.privacySettings,
      paymentSettings: data?.paymentSettings,
    };

    console.log(`Successfully fetched company details for ${id}`);

    return NextResponse.json({
      company,
      source: 'firebase_direct',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error fetching company details for ${params}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to fetch company details',
        details: error instanceof Error ? error.message : 'Unknown error',
        company: null,
      },
      { status: 500 }
    );
  }
}
