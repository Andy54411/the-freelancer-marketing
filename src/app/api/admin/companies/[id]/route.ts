// Admin Company Details API
import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

// Support Ticket Interface
interface SupportTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if Firebase is properly initialized
    if (!isFirebaseAvailable() || !db) {
      console.error('Firebase not initialized');
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Hole das spezifische Unternehmen aus der Firebase companies Collection
    console.log(`[DEBUG] Fetching company from companies collection with ID: ${id}`);
    const companyDoc = await db!.collection('companies').doc(id).get();
    console.log(`[DEBUG] Company document exists: ${companyDoc.exists}`);

    // Vergleich: Schaue auch in users Collection
    const userDoc = await db!.collection('users').doc(id).get();
    console.log(`[DEBUG] User document exists in users collection: ${userDoc.exists}`);

    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`[DEBUG] User data from users collection:`, {
        id: userData?.id || 'missing',
        companyName: userData?.companyName || 'missing',
        email: userData?.email || 'missing',
        source: 'users_collection',
      });
    }

    if (!companyDoc.exists) {
      console.log(`[DEBUG] Company not found in companies collection: ${id}`);
      return NextResponse.json({ error: 'Company not found', company: null }, { status: 404 });
    }

    const data = companyDoc.data();
    console.log(`[DEBUG] Company data from companies collection:`, {
      id: data?.id || 'missing',
      companyName: data?.companyName || 'missing',
      email: data?.email || 'missing',
      source: 'companies_collection',
    });

    // Lade echte Statistiken aus auftraege und quotes Collections

    // Hole alle Aufträge wo diese Company der Anbieter ist
    const auftraegeSnapshot = await db!
      .collection('auftraege')
      .where('selectedAnbieterId', '==', id)
      .get();

    // Hole alle Quotes wo diese Company der Provider ist
    const quotesSnapshot = await db!.collection('quotes').where('providerId', '==', id).get();

    // Hole auch Payout Logs für komplette Einnahmenübersicht
    const payoutLogsSnapshot = await db
      .collection('payout_logs')
      .where('companyId', '==', id)
      .get();

    // Berechne Statistiken aus Aufträgen (verwende die gleiche Logik wie SectionCards)
    let totalRevenue = 0;
    const totalOrders = auftraegeSnapshot.size;
    let completedOrders = 0;

    auftraegeSnapshot.forEach(doc => {
      const auftrag = doc.data();
      let orderTotalRevenue = 0;

      console.log(`[DEBUG] Processing Auftrag ${doc.id}:`, {
        status: auftrag.status,
        jobCalculatedPriceInCents: auftrag.jobCalculatedPriceInCents,
        hasTimeTracking: !!auftrag.timeTracking?.timeEntries,
      });

      // 1. Basis-Auftragswert - NUR wenn Zahlung erhalten wurde (wie SectionCards)
      if (auftrag.jobCalculatedPriceInCents && auftrag.jobCalculatedPriceInCents > 0) {
        if (
          auftrag.status === 'zahlung_erhalten_clearing' ||
          auftrag.status === 'ABGESCHLOSSEN' ||
          auftrag.status === 'COMPLETED' ||
          auftrag.status === 'BEZAHLT' ||
          auftrag.status === 'PAID' ||
          auftrag.status === 'geld_freigegeben'
        ) {
          orderTotalRevenue += auftrag.jobCalculatedPriceInCents;
          console.log(
            `[DEBUG] Added base price: €${auftrag.jobCalculatedPriceInCents / 100} (status: ${auftrag.status})`
          );
        } else {
          console.log(`[DEBUG] Skipped base price due to status: ${auftrag.status}`);
        }
      }

      // 2. ZUSÄTZLICHE BEZAHLTE STUNDEN aus TimeTracking (wie SectionCards)
      if (auftrag.timeTracking?.timeEntries) {
        auftrag.timeTracking.timeEntries.forEach((entry: any) => {
          // NUR WIRKLICH BEZAHLTE UND ÜBERTRAGENE BETRÄGE berücksichtigen
          if (
            entry.billableAmount &&
            entry.billableAmount > 0 &&
            (entry.status === 'transferred' ||
              entry.status === 'paid' ||
              entry.platformHoldStatus === 'transferred' ||
              entry.billingStatus === 'transferred' ||
              entry.paymentStatus === 'paid')
          ) {
            orderTotalRevenue += entry.billableAmount;
            console.log(
              `[DEBUG] Added time tracking: €${entry.billableAmount / 100} (status: ${entry.status})`
            );
          }
        });
      }

      console.log(`[DEBUG] Total revenue for auftrag ${doc.id}: €${orderTotalRevenue / 100}`);
      totalRevenue += orderTotalRevenue;

      // Zähle abgeschlossene Aufträge
      if (auftrag.status === 'ABGESCHLOSSEN' || auftrag.status === 'COMPLETED') {
        completedOrders++;
      }
    });

    // Berechne Quote-Statistiken (vereinfacht, ohne Doppelzählung)
    let quotesTotalRevenue = 0;
    let paidQuotes = 0;

    quotesSnapshot.forEach(doc => {
      const quote = doc.data();
      console.log(`[DEBUG] Processing Quote ${doc.id}:`, {
        paymentStatus: quote.payment?.status,
        totalAmount: quote.payment?.totalAmount,
        amount: quote.amount,
        finalAmount: quote.finalAmount,
      });

      // Nur echte Quote-Zahlungen zählen (die nicht in Aufträgen enthalten sind)
      if (quote.payment?.status === 'paid') {
        let quoteAmount = 0;
        if (quote.payment?.totalAmount) {
          quoteAmount = quote.payment.totalAmount;
        } else if (quote.finalAmount) {
          quoteAmount = quote.finalAmount;
        } else if (quote.amount) {
          quoteAmount = quote.amount;
        }

        if (quoteAmount > 0) {
          quotesTotalRevenue += quoteAmount;
          paidQuotes++;
          console.log(`[DEBUG] Added quote revenue: €${quoteAmount / 100}`);
        }
      }
    });

    // Entferne Payout Logs um Doppelzählung zu vermeiden
    const payoutLogsRevenue = 0; // Nicht verwenden, um Doppelzählung zu vermeiden

    // Hole Reviews aus der companies/{id}/reviews Subcollection
    console.log(`[DEBUG] Fetching reviews from companies/${id}/reviews subcollection`);
    const reviewsSnapshot = await db!.collection('companies').doc(id).collection('reviews').get();
    console.log(`[DEBUG] Found ${reviewsSnapshot.size} reviews in subcollection`);

    let totalRating = 0;
    let reviewCount = 0;
    const reviews: any[] = [];

    reviewsSnapshot.forEach(doc => {
      const reviewData = doc.data();
      reviews.push({
        id: doc.id,
        ...reviewData,
        createdAt: reviewData.createdAt?.toDate() || new Date(),
      });

      if (reviewData.rating && typeof reviewData.rating === 'number') {
        totalRating += reviewData.rating;
        reviewCount++;
      }
    });

    const avgRating = reviewCount > 0 ? parseFloat((totalRating / reviewCount).toFixed(1)) : 0;

    console.log(`[DEBUG] Reviews calculated - Count: ${reviewCount}, Avg Rating: ${avgRating}`);

    // Kombiniere Gesamtumsatz (nur Aufträge + Quotes, keine Payout Logs)
    const combinedTotalRevenue = (totalRevenue + quotesTotalRevenue) / 100; // Konvertiere zu Euro
    const combinedTotalOrders = totalOrders + paidQuotes;

    console.log(`[DEBUG] Final Revenue Calculation:`, {
      auftraegeRevenue: totalRevenue / 100,
      quotesRevenue: quotesTotalRevenue / 100,
      combinedTotalRevenue: combinedTotalRevenue,
      totalOrders: totalOrders,
      paidQuotes: paidQuotes,
      combinedTotalOrders: combinedTotalOrders,
    });

    console.log(`[DEBUG] Final Revenue Calculation:`, {
      auftraegeRevenue: totalRevenue,
      quotesRevenue: quotesTotalRevenue,
      combinedTotalRevenue: combinedTotalRevenue,
      totalOrders: totalOrders,
      paidQuotes: paidQuotes,
      combinedTotalOrders: combinedTotalOrders,
    });

    // Bestimme Status basierend auf Admin-Freigabe und Onboarding-Status
    let status = 'inactive';
    let verificationStatus = 'pending';

    // Prüfe Admin-Freigabe
    const isAdminApproved = data?.adminApproved === true;

    // Prüfe Onboarding-Status
    const isOnboardingComplete =
      data?.onboardingCompleted === true ||
      data?.onboardingCompletionPercentage >= 100 ||
      data?.profileComplete === true;

    // Prüfe Dokumente
    const documentsComplete = data?.documentsCompleted === true;

    // Prüfe Profile-Status
    const profileActive = data?.profileStatus === 'active' || data?.status === 'active';

    console.log(`[DEBUG] Status Determination:`, {
      adminApproved: isAdminApproved,
      onboardingComplete: isOnboardingComplete,
      documentsComplete: documentsComplete,
      profileActive: profileActive,
      profileStatus: data?.profileStatus,
      status: data?.status,
    });

    // Status-Logik: Admin-freigegeben + Onboarding = Aktiv
    if (isAdminApproved && isOnboardingComplete) {
      status = 'active';
      verificationStatus = 'verified';
    } else if (data?.status === 'suspended') {
      status = 'suspended';
      verificationStatus = 'suspended';
    } else if (isOnboardingComplete && !isAdminApproved) {
      status = 'inactive'; // Wartet auf Admin-Freigabe
      verificationStatus = 'pending_admin_approval';
    } else {
      status = 'inactive';
      verificationStatus = 'pending_onboarding';
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

      // Kontaktdaten - prüfe mehrere mögliche Felder
      website: data?.website || data?.step1?.website || data?.companyWebsite,
      // Priorisiere verifizierte Webmail-Nummer, dann andere Quellen
      phone: data?.phoneVerifiedFromWebmail 
        ? (data?.phone || data?.phoneNumber) 
        : (data?.phone || data?.phoneNumber || data?.step2?.contactPerson?.phone || data?.step1?.phone || data?.companyPhoneNumber),
      phoneVerifiedFromWebmail: data?.phoneVerifiedFromWebmail || false,
      phoneVerifiedAt: data?.phoneVerifiedAt?.toDate?.()?.toISOString(),

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
      vatId: data?.step3?.vatId || data?.vatId,
      taxNumber: data?.step3?.taxNumber || data?.taxNumber,
      taxRate: data?.step5?.taxRate || data?.step2?.taxRate || data?.taxRate,
      kleinunternehmer: data?.kleinunternehmer || data?.step2?.kleinunternehmer,

      // Kontaktperson
      accountHolder: data?.accountHolder || data?.step4?.accountHolder,
      dateOfBirth: data?.step1?.dateOfBirth,

      // Bank und Finanzen
      iban: data?.step4?.iban || data?.bankDetails?.iban || data?.iban,
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
      profilePictureURL: data?.profilePictureURL || data?.step3?.profilePictureURL,
      profileBannerImage: data?.profileBannerImage || data?.step3?.profileBannerImage,
      profilePictureFirebaseUrl: data?.profilePictureFirebaseUrl,

      // Portfolio mit allen Bildern
      portfolio: data?.portfolio || data?.step3?.portfolio || [],
      portfolioItems: data?.portfolioItems || [],

      // Zertifikate und Dokumente
      certifications: data?.certifications || [],

      // Dokumente und Ausweise
      identityFrontUrl: data?.step3?.identityFrontUrl || data?.identityFrontUrl,
      identityBackUrl: data?.step3?.identityBackUrl || data?.identityBackUrl,
      businessLicenseURL: data?.step3?.businessLicenseURL || data?.businessLicenseURL,
      masterCraftsmanCertificateURL: data?.step3?.masterCraftsmanCertificateURL,
      companyRegister: data?.step3?.companyRegister || data?.companyRegister,

      // Stripe Document IDs für Dokumente
      identityFrontUrlStripeId: data?.identityFrontUrlStripeId,
      identityBackUrlStripeId: data?.identityBackUrlStripeId,
      businessLicenseStripeId: data?.businessLicenseStripeId,
      masterCraftsmanCertificateStripeId: data?.masterCraftsmanCertificateStripeId,

      // Document Status Flags
      hasIdentityDocuments: !!(data?.step3?.identityFrontUrl || data?.identityFrontUrl),
      hasBusinessLicense: !!(data?.step3?.businessLicenseURL || data?.businessLicenseURL),
      hasCompanyRegister: !!(data?.step3?.companyRegister || data?.companyRegister),

      // Bank- und Zahlungsdaten
      bankDetails: data?.bankDetails || {},
      bankConnections: data?.bankConnections || [],
      bankSyncStatus: data?.bankSyncStatus,
      lastBankSync: data?.lastBankSync,
      bic: data?.step4?.bic || data?.bankDetails?.bic || data?.bic,
      bankName: data?.step4?.bankName || data?.bankDetails?.bankName || data?.bankName || '',
      bankCountry: data?.step4?.bankCountry || data?.bankCountry,

      // Revolut Connections
      revolut_accounts: data?.revolut_accounts,
      revolut_connections: data?.revolut_connections,

      // Platform-spezifische Daten (ECHTE STATISTIKEN)
      totalOrders: combinedTotalOrders,
      totalRevenue: combinedTotalRevenue,
      avgRating: avgRating,
      reviewCount: reviewCount,

      // Zusätzliche Statistik-Details für Admin
      auftraegeCount: totalOrders,
      auftraegeRevenue: totalRevenue / 100,
      quotesCount: paidQuotes,
      quotesRevenue: quotesTotalRevenue / 100,
      completedOrders: completedOrders,

      // Admin Approval System
      adminApproved: data?.adminApproved || false,
      adminApprovedAt: data?.adminApprovedAt?.toDate?.()?.toISOString(),
      adminApprovedBy: data?.adminApprovedBy,
      adminNotes: data?.adminNotes,
      approvalStatus: data?.approvalStatus || 'pending',

      // Verifizierung und Status (erweitert)
      verified: isAdminApproved && isOnboardingComplete,
      verificationStatus: verificationStatus,
      lastVerificationUpdate: data?.onboardingCompletedAt?.toDate?.()?.toISOString(),

      // Zusätzliche Metadaten
      user_type: data?.user_type,
      createdByCallable: data?.createdByCallable,
      industryMcc: data?.step2?.industryMcc,

      // Management Flags (aus step1)
      isManagingDirectorOwner: data?.step1?.isManagingDirectorOwner,
      isActualDirector: data?.step1?.isActualDirector,
      isActualExecutive: data?.step1?.isActualExecutive,
      isActualOwner: data?.step1?.isActualOwner,
      ownershipPercentage: data?.step1?.ownershipPercentage,

      // Taskilo E-Mail Integration
      taskiloEmailConnected: data?.step5?.taskiloEmailConnected || data?.taskiloEmailConnected || false,
      taskiloEmail: data?.step5?.taskiloEmail || data?.taskiloEmail,
      gmailConnected: data?.step5?.gmailConnected || data?.gmailConnected || false,
      gmailEmail: data?.step5?.gmailEmail || data?.gmailEmail,
      emailType: data?.step5?.emailType || data?.emailType,

      // Legacy-Kompatibilität
      documentsUploaded: data?.documentsUploaded || [],
      notificationSettings: data?.notificationSettings,
      privacySettings: data?.privacySettings,
      paymentSettings: data?.paymentSettings,
    };

    // Support-Tickets für diese Company laden
    let supportTickets: SupportTicket[] = [];
    try {
      const ticketsSnapshot = await db!
        .collection('adminTickets')
        .where('customerEmail', '==', data?.email)
        .orderBy('createdAtTimestamp', 'desc')
        .limit(20)
        .get();

      supportTickets = ticketsSnapshot.docs.map(doc => {
        const ticketData = doc.data();
        return {
          id: doc.id,
          title: ticketData.title || 'Kein Titel',
          status: ticketData.status || 'open',
          priority: ticketData.priority || 'medium',
          category: ticketData.category || 'support',
          createdAt: ticketData.createdAt || ticketData.createdAtTimestamp?.toDate?.()?.toISOString(),
          updatedAt: ticketData.updatedAt || ticketData.updatedAtTimestamp?.toDate?.()?.toISOString(),
          commentsCount: ticketData.comments?.length || 0,
        };
      });
    } catch (ticketError) {
      console.log('[DEBUG] Error loading tickets:', ticketError);
      // Tickets sind optional - Fehler nicht werfen
    }

    return NextResponse.json({
      company,
      supportTickets,
      source: 'firebase_direct',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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
