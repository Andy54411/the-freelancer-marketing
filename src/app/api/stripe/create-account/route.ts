import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, auth } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY ist nicht definiert');
}

// Stripe mit zusätzlichen Optionen initialisieren
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
  throw new Error('STRIPE_SECRET_KEY muss ein Live-Key sein (sk_live_)');
}

// Stripe im Live-Modus initialisieren
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  maxNetworkRetries: 3,
  timeout: 20000,
  telemetry: false,
});

const translateStripeRequirement = (req: string): string => {
  if (req.startsWith('company.address.')) return `Firmenadresse (${req.substring(req.lastIndexOf('.') + 1)})`;
  if (req.startsWith('company.verification.document')) return "Firmen-Verifizierungsdokument (z.B. Handelsregisterauszug)";
  if (req === 'company.name') return "Firmenname";
  if (req === 'company.phone') return "Telefonnummer der Firma";
  if (req === 'company.tax_id') return "Nationale Steuernummer der Firma";
  if (req === 'company.registration_number') return "Handelsregisternummer";
  if (req === 'company.vat_id') return "Umsatzsteuer-ID der Firma";
  if (req.includes('percent_ownership')) return "Eigentumsanteil der Person";
  if (req === 'business_profile.mcc') return "MCC (Branchencode)";
  if (req === 'business_profile.url') return "Firmenwebseite (Ihr Profil auf Tilvo)";
  if (req.startsWith('person.') || req.startsWith('individual.')) {
    const prefix = req.startsWith('person.') ? 'person.' : 'individual.';
    const personField = req.substring(prefix.length);
    const baseText = "Angaben zur Person/Geschäftsführer";
    if (personField.startsWith('first_name')) return `${baseText}: Vorname`;
    if (personField.startsWith('last_name')) return `${baseText}: Nachname`;
    if (personField.startsWith('email')) return `${baseText}: E-Mail`;
    if (personField.startsWith('phone')) return `${baseText}: Telefonnummer`;
    if (personField.startsWith('dob.')) return `${baseText}: Geburtsdatum`;
    if (personField.startsWith('address.')) return `${baseText}: Private Adresse (${personField.substring(personField.lastIndexOf('.') + 1)})`;
    if (personField.startsWith('verification.document')) return `${baseText}: Ausweisdokument`;
    if (personField.startsWith('relationship.owner')) return "Nachweis der Eigentümerschaft";
    if (personField.startsWith('relationship.director')) return "Nachweis der Geschäftsführertätigkeit";
    if (personField.startsWith('relationship.executive')) return "Angaben zur leitenden Führungskraft";
    if (personField.startsWith('relationship.representative')) return "Angaben zum Vertreter";
    if (personField.startsWith('relationship.title')) return "Position/Titel des Vertreters";
    return `${baseText}: ${personField.replace('.', ' ')}`;
  }
  if (req.startsWith('external_account')) return "Bankverbindung";
  if (req.startsWith('tos_acceptance.')) return "Zustimmung zu den Stripe Nutzungsbedingungen";
  return `Benötigt: ${req.replace(/[._]/g, ' ')}`;
};

const mapLegalFormToStripeBusinessInfo = (
  legalForm: string | null | undefined
): { businessType: 'individual' | 'company' } => {
  if (!legalForm) {
    console.warn("[mapLegalFormToStripeBusinessInfo] Keine Rechtsform übergeben, Fallback auf business_type: 'company'.");
    return { businessType: 'company' };
  }
  const form = legalForm.toLowerCase().trim();

  // Einzelunternehmen & Freiberufler
  if (form.includes("einzelunternehmen") || form.includes("freiberufler")) {
    if (form.includes("e.k.") || form.includes("eingetragener kaufmann")) {
      return { businessType: 'company' };
    }
    return { businessType: 'individual' };
  }

  // Kapitalgesellschaften
  if (form.includes("gmbh") || form.includes("ug")) {
    return { businessType: 'company' };
  }
  if (form.includes("ag")) {
    return { businessType: 'company' };
  }

  // Personengesellschaften
  if (form.includes("gbr") || form.includes("ohg") || form.includes("kg") || form.includes("partnerschaft")) {
    return { businessType: 'company' };
  }

  // Sonstige & Unbekannte Rechtsformen
  if (form === "sonstige" || form.includes("andere") || form.includes("other")) {
    console.info(`[mapLegalFormToStripeBusinessInfo] Sonstige/Andere Rechtsform "${legalForm}", setze auf business_type: 'company'.`);
    return { businessType: 'company' };
  }

  // Fallback für wirklich unbekannte Rechtsformen
  console.warn(`[mapLegalFormToStripeBusinessInfo] Unbekannte Rechtsform "${legalForm}", Fallback auf business_type: 'company'.`);
  return { businessType: 'company' };
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] Start Stripe Account Creation');
    
    // Authentifizierung prüfen
    if (!auth) {
      console.error('[ERROR] Firebase Auth nicht initialisiert');
      return NextResponse.json(
        { error: 'Firebase Auth nicht initialisiert' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    const body = await request.json();
    const { clientIp, ...payloadFromClient } = body;

    console.log('[DEBUG] Request Payload:', {
      userId,
      clientIp,
      legalForm: payloadFromClient.legalForm,
      hasIdentityDocs: !!payloadFromClient.identityFrontFileId && !!payloadFromClient.identityBackFileId,
      hasBusinessLicense: !!payloadFromClient.businessLicenseFileId,
      hasProfilePicture: !!payloadFromClient.profilePictureFileId,
      hasBankInfo: !!payloadFromClient.iban && !!payloadFromClient.accountHolder
    });

    // Prüfe Firmen-Dokument
    const companyDocRef = await db!.collection("companies").doc(userId).get();
    if (!companyDocRef.exists) {
      return NextResponse.json(
        { error: 'Firmenprofil nicht gefunden. Nur Firmen können Stripe-Konten erstellen.' },
        { status: 400 }
      );
    }

    const existingFirestoreCompanyData = companyDocRef.data();
    if (!existingFirestoreCompanyData) {
      return NextResponse.json(
        { error: 'Fehler beim Lesen der Firmendaten aus Firestore.' },
        { status: 500 }
      );
    }

    // Prüfe ob bereits ein Stripe-Konto existiert
    if (existingFirestoreCompanyData.stripeAccountId?.startsWith('acct_')) {
      return NextResponse.json(
        { error: 'Firma hat bereits ein Stripe-Konto.' },
        { status: 400 }
      );
    }

    // Mapping der Rechtsform
    const { businessType } = mapLegalFormToStripeBusinessInfo(payloadFromClient.legalForm);

    // Validierung der Pflichtfelder
    const requiredFields: { key: string, name: string }[] = [
      { key: 'legalForm', name: 'Rechtsform' },
      { key: 'email', name: 'E-Mail' },
      { key: 'firstName', name: 'Vorname' },
      { key: 'lastName', name: 'Nachname' },
      { key: 'iban', name: 'IBAN' },
      { key: 'accountHolder', name: 'Kontoinhaber' },
      { key: 'bic', name: 'BIC' },
      { key: 'bankName', name: 'Bankname' },
      { key: 'mcc', name: 'MCC (Branchencode)' },
      { key: 'identityFrontFileId', name: 'Ausweisdokument (Vorderseite)' },
      { key: 'identityBackFileId', name: 'Ausweisdokument (Rückseite)' },
      { key: 'profilePictureFileId', name: 'Profilbild' },
    ];

    for (const field of requiredFields) {
      const value = payloadFromClient[field.key];
      if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
        return NextResponse.json(
          { error: `${field.name} ist eine Pflichtangabe.` },
          { status: 400 }
        );
      }
    }

    // Validiere Geburtsdatum
    if (!payloadFromClient.dateOfBirth) {
      return NextResponse.json(
        { error: 'Geburtsdatum des Ansprechpartners/Inhabers ist erforderlich.' },
        { status: 400 }
      );
    }

    const dateOfBirthStr = payloadFromClient.dateOfBirth;
    if (!dateOfBirthStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json(
        { error: 'Ungültiges Geburtsdatum-Format. Erwartet: YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const [yearDob, monthDob, dayDob] = dateOfBirthStr.split('-').map(Number);
    const dobDate = new Date(Date.UTC(yearDob, monthDob - 1, dayDob));
    const currentYear = new Date().getFullYear();
    const age = currentYear - yearDob;

    const isValidDate = dobDate.getUTCFullYear() === yearDob && 
                       dobDate.getUTCMonth() === monthDob - 1 && 
                       dobDate.getUTCDate() === dayDob;
    const isOldEnough = age >= 18;
    const isReasonableYear = yearDob > 1900 && yearDob <= currentYear;

    if (!isValidDate || !isOldEnough || !isReasonableYear) {
      return NextResponse.json(
        { error: 'Ungültiges Geburtsdatum oder Person zu jung (min. 18 Jahre).' },
        { status: 400 }
      );
    }

    // Weitere Validierungen basierend auf dem Business Type
    if (businessType === 'company') {
      // Prüfe zuerst die Tax ID für Unternehmen
      const cleanedTaxNumber = payloadFromClient.taxNumber?.trim();
      const cleanedVatId = payloadFromClient.vatId?.trim();

      if (!cleanedTaxNumber && !cleanedVatId) {
        return NextResponse.json(
          { error: `Nationale Steuernummer ODER USt-IdNr. für ${payloadFromClient.legalForm} erforderlich.` },
          { status: 400 }
        );
      }

      // Validiere das Format basierend auf dem Land
      if (payloadFromClient.companyCountry === 'CY') {
        // Für Zypern: 9-stellige Nummer
        if (cleanedTaxNumber && !/^\d{9}$/.test(cleanedTaxNumber)) {
          return NextResponse.json(
            { error: 'Zypriotische Steuernummer muss 9 Ziffern enthalten.' },
            { status: 400 }
          );
        }
        // Für Zypern VAT ID: CY + 9 Ziffern (z.B. CY12345678X)
        if (cleanedVatId && !/^CY\d{8}[A-Z]$/.test(cleanedVatId)) {
          return NextResponse.json(
            { error: 'Zypriotische USt-IdNr. muss dem Format CY12345678X entsprechen.' },
            { status: 400 }
          );
        }
      }

      if (!payloadFromClient.companyName?.trim()) {
        return NextResponse.json(
          { error: 'Firmenname ist erforderlich.' },
          { status: 400 }
        );
      }
      if (!payloadFromClient.companyAddressLine1?.trim() || 
          !payloadFromClient.companyCity?.trim() || 
          !payloadFromClient.companyPostalCode?.trim() || 
          !payloadFromClient.companyCountry?.trim()) {
        return NextResponse.json(
          { error: 'Vollständige Firmenadresse ist erforderlich.' },
          { status: 400 }
        );
      }
      if (payloadFromClient.companyCountry.length !== 2) {
        return NextResponse.json(
          { error: 'Ländercode der Firma muss 2-stellig sein (z.B. DE).' },
          { status: 400 }
        );
      }
      if (!payloadFromClient.businessLicenseFileId) {
        return NextResponse.json(
          { error: 'Gewerbeschein ist für Firmen erforderlich.' },
          { status: 400 }
        );
      }
    } else {
      const personalStreetToUse = payloadFromClient.personalStreet?.trim() || payloadFromClient.companyAddressLine1?.trim();
      const personalPostalCodeToUse = payloadFromClient.personalPostalCode?.trim() || payloadFromClient.companyPostalCode?.trim();
      const personalCityToUse = payloadFromClient.personalCity?.trim() || payloadFromClient.companyCity?.trim();
      const personalCountryToUse = payloadFromClient.personalCountry?.trim() || payloadFromClient.companyCountry?.trim();

      if (!personalStreetToUse || !personalPostalCodeToUse || !personalCityToUse || !personalCountryToUse) {
        return NextResponse.json(
          { error: 'Vollständige Adresse (Privat- oder Firmenadresse) für Einzelperson/Freiberufler erforderlich.' },
          { status: 400 }
        );
      }
      if (personalCountryToUse.length !== 2) {
        return NextResponse.json(
          { error: 'Verwendeter Ländercode muss 2-stellig sein.' },
          { status: 400 }
        );
      }
      if (!payloadFromClient.taxNumber?.trim() && !payloadFromClient.vatId?.trim()) {
        return NextResponse.json(
          { error: `Nationale Steuernummer ODER USt-IdNr. für ${payloadFromClient.legalForm} erforderlich.` },
          { status: 400 }
        );
      }
    }

    // Stripe Account erstellen
    const userAgent = existingFirestoreCompanyData.common?.tosAcceptanceUserAgent || 
                     request.headers.get('user-agent') || 
                     "UserAgentNotProvided";

    const frontendUrl = process.env.FRONTEND_URL || 'https://taskilo.de';
    const profileUrl = `${frontendUrl}/profile/${userId}`;

    // Bank Account vorbereiten
    const cleanedIban = payloadFromClient.iban?.replace(/\s+/g, '').toUpperCase();
    const cleanedBic = payloadFromClient.bic?.trim().toUpperCase();
    const cleanedAccountHolder = payloadFromClient.accountHolder?.trim();

    if (!cleanedAccountHolder) {
      return NextResponse.json(
        { error: 'Kontoinhaber ist erforderlich' },
        { status: 400 }
      );
    }

    // SWIFT/BIC Validierung (optional)
    if (cleanedBic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanedBic)) {
      return NextResponse.json(
        { error: 'BIC/SWIFT Format ungültig (falls angegeben)' },
        { status: 400 }
      );
    }

    // IBAN/Kontonummer Validierung
    if (!cleanedIban) {
      return NextResponse.json(
        { error: 'Bankkonto-Nummer oder IBAN ist erforderlich' },
        { status: 400 }
      );
    }

    // Firmensitzland bestimmen
    const companyCountry = businessType === 'company' 
      ? payloadFromClient.companyCountry 
      : payloadFromClient.personalCountry || payloadFromClient.companyCountry;
      
    // Verwende Live-Modus für Bankkonten
    const bankCountry = cleanedIban.substring(0, 2);
    
    if (!companyCountry) {
      return NextResponse.json(
        { error: 'Firmensitzland ist erforderlich' },
        { status: 400 }
      );
    }

    // Log Bank Details für Debugging
    console.log('[DEBUG] Bank Details:', {
      accountHolder: cleanedAccountHolder,
      iban: cleanedIban,
      bic: cleanedBic || 'Not provided',
      companyCountry,
      businessType
    });

    const accountParams: Stripe.AccountCreateParams = {
      type: "custom",
      country: businessType === 'company' 
        ? payloadFromClient.companyCountry!
        : payloadFromClient.personalCountry || payloadFromClient.companyCountry!,
      email: payloadFromClient.email!,
      business_type: businessType,
      capabilities: { 
        card_payments: { requested: true }, 
        transfers: { requested: true },
        sepa_debit_payments: { requested: true }
      },
      metadata: { 
        internal_user_id: userId, 
        created_by_api: "true", 
        legal_form_provided: payloadFromClient.legalForm || 'N/A' 
      },
      tos_acceptance: { 
        date: Math.floor(Date.now() / 1000), 
        ip: clientIp, 
        user_agent: userAgent 
      },
      business_profile: {
        mcc: payloadFromClient.mcc!,
        url: profileUrl,
      },
      external_account: {
        object: 'bank_account',
        currency: 'eur',
        country: cleanedIban.substring(0, 2),
        account_number: cleanedIban,
        account_holder_name: cleanedAccountHolder,
        account_holder_type: businessType === 'company' ? 'company' : 'individual'
      },
    };

    if (businessType === 'company') {
      // Stelle sicher, dass mindestens eine der beiden Steuer-IDs gesetzt ist
      const taxId = payloadFromClient.taxNumber?.trim();
      const vatId = payloadFromClient.vatId?.trim();

      accountParams.company = {
        name: payloadFromClient.companyName!,
        address: {
          line1: payloadFromClient.companyAddressLine1!,
          city: payloadFromClient.companyCity!,
          postal_code: payloadFromClient.companyPostalCode!,
          country: payloadFromClient.companyCountry!,
        },
        phone: payloadFromClient.companyPhoneNumber || payloadFromClient.phoneNumber,
        registration_number: payloadFromClient.companyRegister,
        tax_id: taxId,
        vat_id: vatId,
        owners_provided: true,
        executives_provided: true,
        directors_provided: true,
      };

      if (payloadFromClient.businessLicenseFileId && accountParams.company) {
        accountParams.company.verification = {
          document: { front: payloadFromClient.businessLicenseFileId }
        };
      }
    } else {
      const personalStreet = payloadFromClient.personalStreet?.trim() || payloadFromClient.companyAddressLine1?.trim();
      const personalHouse = payloadFromClient.personalHouseNumber?.trim();
      accountParams.individual = {
        first_name: payloadFromClient.firstName,
        last_name: payloadFromClient.lastName,
        email: payloadFromClient.email,
        phone: payloadFromClient.phoneNumber,
        dob: { day: dayDob, month: monthDob, year: yearDob },
        address: {
          line1: personalStreet ? `${personalStreet} ${personalHouse ?? ''}`.trim() : payloadFromClient.companyAddressLine1!,
          postal_code: payloadFromClient.personalPostalCode || payloadFromClient.companyPostalCode!,
          city: payloadFromClient.personalCity || payloadFromClient.companyCity!,
          country: payloadFromClient.personalCountry || payloadFromClient.companyCountry!,
        },
        verification: {
          document: {
            front: payloadFromClient.identityFrontFileId,
            back: payloadFromClient.identityBackFileId,
          }
        }
      };
    }

      // Profil-Bild separat nach Account-Erstellung hochladen    // Account Parameter Debug Log
    console.log('[DEBUG] Stripe Account Params:', JSON.stringify({
      type: accountParams.type,
      country: accountParams.country,
      businessType: accountParams.business_type,
      capabilities: accountParams.capabilities,
      tosAcceptance: {
        date: accountParams.tos_acceptance?.date,
        hasIp: !!accountParams.tos_acceptance?.ip
      },
      businessProfile: accountParams.business_profile,
      hasCompany: !!accountParams.company,
      hasIndividual: !!accountParams.individual,
      bankAccount: {
        hasExternalAccount: !!accountParams.external_account,
        accountHolderName: (accountParams.external_account as any)?.account_holder_name,
        country: (accountParams.external_account as any)?.country,
        currency: (accountParams.external_account as any)?.currency,
      }
    }, null, 2));

        // Account mit Retry-Mechanismus erstellen
    let account: Stripe.Account | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    let lastError;

    while (retryCount <= maxRetries) {
      try {
        account = await stripe.accounts.create(accountParams);
        console.log(`✅ Stripe Account ${account.id} wurde erstellt.`);
        break;
      } catch (error: any) {
        console.error('[ERROR] Stripe Account Creation failed:', {
          error: error.message,
          type: error.type,
          code: error.code,
          param: error.param,
          attemptNumber: retryCount + 1
        });
        lastError = error;
        retryCount++;
        
        if (error.type === 'StripeInvalidRequestError') {
          return NextResponse.json(
            { 
              error: error.message,
              code: error.code,
              param: error.param 
            },
            { status: 400 }
          );
        }
        
        const isRateLimitError = 
          error.type === 'RateLimitError' || 
          error.code === 'rate_limit' ||
          (error.message && (
            error.message.includes('too quickly') ||
            error.message.includes('creation attempts per second')
          ));
        
        if (isRateLimitError && retryCount <= maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`⚠️ Rate Limit erreicht, Retry ${retryCount}/${maxRetries} nach ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        if (retryCount > maxRetries) {
          return NextResponse.json(
            { error: 'Maximale Anzahl an Versuchen erreicht.' },
            { status: 500 }
          );
        }
      }
    }

    if (!account) {
      return NextResponse.json(
        { error: 'Account konnte nicht erstellt werden.' },
        { status: 500 }
      );
    }

    // Person für Company Account erstellen
    let personId: string | undefined;
    if (businessType === 'company') {
      const hasRequiredPersonData =
        payloadFromClient.firstName &&
        payloadFromClient.lastName &&
        payloadFromClient.email &&
        payloadFromClient.dateOfBirth &&
        payloadFromClient.identityFrontFileId &&
        payloadFromClient.identityBackFileId;

      const hasPersonalAddress = 
        payloadFromClient.personalStreet &&
        payloadFromClient.personalPostalCode &&
        payloadFromClient.personalCity &&
        payloadFromClient.personalCountry;

      const hasFirmAddress =
        payloadFromClient.companyAddressLine1 &&
        payloadFromClient.companyPostalCode &&
        payloadFromClient.companyCity &&
        payloadFromClient.companyCountry;

      if (hasRequiredPersonData && (hasPersonalAddress || hasFirmAddress)) {
        const usePersonalAddress = hasPersonalAddress;
        const personPayload: Stripe.AccountCreatePersonParams = {
          first_name: payloadFromClient.firstName!,
          last_name: payloadFromClient.lastName!,
          email: payloadFromClient.email!,
          phone: payloadFromClient.phoneNumber,
          relationship: {
            representative: true,
            director: payloadFromClient.isActualDirector,
            owner: payloadFromClient.isActualOwner,
            executive: payloadFromClient.isActualExecutive,
            title: payloadFromClient.actualRepresentativeTitle,
          },
          verification: {
            document: {
              front: payloadFromClient.identityFrontFileId!,
              back: payloadFromClient.identityBackFileId!,
            }
          },
          dob: { 
            day: dayDob, 
            month: monthDob, 
            year: yearDob 
          },
          address: {
            line1: usePersonalAddress
              ? `${payloadFromClient.personalStreet!} ${payloadFromClient.personalHouseNumber || ''}`.trim()
              : payloadFromClient.companyAddressLine1!,
            postal_code: usePersonalAddress
              ? payloadFromClient.personalPostalCode!
              : payloadFromClient.companyPostalCode!,
            city: usePersonalAddress
              ? payloadFromClient.personalCity!
              : payloadFromClient.companyCity!,
            country: usePersonalAddress
              ? payloadFromClient.personalCountry!
              : payloadFromClient.companyCountry!,
          },
        };

        if (payloadFromClient.isManagingDirectorOwner) {
          personPayload.relationship = {
            ...personPayload.relationship,
            owner: true,
            director: true,
            executive: true,
            title: "Geschäftsführender Gesellschafter",
            percent_ownership: payloadFromClient.ownershipPercentage,
          };
        }

        try {
          const person = await stripe.accounts.createPerson(account.id, personPayload);
          personId = person.id;
          console.log(`✅ Stripe Person ${person.id} erfolgreich für Account ${account.id} erstellt.`);
        } catch (error: any) {
          console.error('Fehler beim Erstellen der Person:', error);
        }
      }
    }

    // Status der Account-Erstellung loggen
    console.log('[DEBUG] Stripe Account Status:', {
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      requirements: {
        currentlyDue: account.requirements?.currently_due,
        eventuallyDue: account.requirements?.eventually_due,
        pendingVerification: account.requirements?.pending_verification
      }
    });

    // Profil-Bild als Business Icon hochladen
    if (payloadFromClient.profilePictureFileId) {
      try {
        // Neues File mit korrektem Purpose hochladen
        const formData = new FormData();
        formData.append('file', payloadFromClient.profilePictureFile);
        formData.append('purpose', 'business_icon');
        formData.append('userId', userId);

        const { UPLOAD_STRIPE_FILE_API_URL } = await import('@/lib/constants');
        const uploadResponse = await fetch(UPLOAD_STRIPE_FILE_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          console.error('[ERROR] Business Icon Upload fehlgeschlagen:', await uploadResponse.text());
        } else {
          const iconUploadResult = await uploadResponse.json();
          if (iconUploadResult.success && iconUploadResult.stripeFileId) {
            // Icon zum Account hinzufügen
            await stripe.accounts.update(account.id, {
              settings: {
                branding: {
                  icon: iconUploadResult.stripeFileId
                }
              }
            });
            console.log('[DEBUG] Business Icon erfolgreich hinzugefügt');
          }
        }
      } catch (iconError) {
        console.error('[ERROR] Fehler beim Hinzufügen des Business Icons:', iconError);
        // Nicht-kritischer Fehler, Account-Erstellung trotzdem fortsetzen
      }
    }

    // Firestore Update
    const firestoreUpdateData: { [key: string]: any } = {
      stripeAccountId: account.id,
      stripeAccountDetailsSubmitted: account.details_submitted,
      stripeAccountPayoutsEnabled: account.payouts_enabled,
      stripeAccountChargesEnabled: account.charges_enabled,
      stripeAccountCreationDate: FieldValue.serverTimestamp(),
      stripeAccountError: FieldValue.delete(),
      "common.createdByApi": "true",
      "step1.dateOfBirth": payloadFromClient.dateOfBirth || null,
      "step1.phoneNumber": payloadFromClient.phoneNumber || null,
      "step1.personalStreet": payloadFromClient.personalStreet || null,
      "step1.personalHouseNumber": payloadFromClient.personalHouseNumber || null,
      "step1.personalPostalCode": payloadFromClient.personalPostalCode || null,
      "step1.personalCity": payloadFromClient.personalCity || null,
      "step1.personalCountry": payloadFromClient.personalCountry || null,
      "step1.isManagingDirectorOwner": payloadFromClient.isManagingDirectorOwner ?? true,
      "step1.ownershipPercentage": payloadFromClient.ownershipPercentage ?? null,
      "step1.isActualDirector": payloadFromClient.isActualDirector ?? null,
      "step1.isActualOwner": payloadFromClient.isActualOwner ?? null,
      "step1.actualOwnershipPercentage": payloadFromClient.actualOwnershipPercentage ?? null,
      "step1.isActualExecutive": payloadFromClient.isActualExecutive ?? null,
      "step1.actualRepresentativeTitle": payloadFromClient.actualRepresentativeTitle || null,
      "step2.legalForm": payloadFromClient.legalForm || null,
      "step2.companyName": payloadFromClient.companyName || null,
      "step2.industryMcc": payloadFromClient.mcc || null,
      "step2.website": payloadFromClient.companyWebsite || null,
      "step3.companyRegister": payloadFromClient.companyRegister || null,
      "step3.taxNumber": payloadFromClient.taxNumber || null,
      "step3.vatId": payloadFromClient.vatId || null,
      "step3.profilePictureURL": payloadFromClient.profilePictureUrl || null,
      "step3.businessLicenseURL": payloadFromClient.businessLicenseUrl || null,
      "step3.masterCraftsmanCertificateURL": payloadFromClient.masterCraftsmanCertificateUrl || null,
      "step3.identityFrontUrl": payloadFromClient.identityFrontUrl || null,
      "step3.identityBackUrl": payloadFromClient.identityBackUrl || null,
      "step4.iban": payloadFromClient.iban || null,
      "step4.bic": payloadFromClient.bic || null,
      "step4.bankName": payloadFromClient.bankName || null,
      "step4.accountHolder": payloadFromClient.accountHolder || null,
    };

    if (personId) {
      firestoreUpdateData.stripeRepresentativePersonId = personId;
    }

    await db!.collection('companies').doc(userId).update(firestoreUpdateData);

    // Prüfe die finalen Requirements
    const finalAccountData = await stripe.accounts.retrieve(account.id);
    const finalMissingFields: string[] = [];
    
    (finalAccountData.requirements?.currently_due || [])
      .forEach(req => finalMissingFields.push(translateStripeRequirement(req)));
    
    (finalAccountData.requirements?.eventually_due || [])
      .forEach(req => finalMissingFields.push(`Benötigt (später): ${translateStripeRequirement(req)}`));

    return NextResponse.json({
      success: true,
      accountId: account.id,
      personId: personId,
      message: "Stripe Konto erfolgreich erstellt und alle Anforderungen erfüllt.",
      missingFields: [...new Set(finalMissingFields)],
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
    });

  } catch (error: any) {
    console.error('Stripe Account Creation Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ein unerwarteter Fehler ist aufgetreten',
        code: error.code,
        type: error.type,
      },
      { status: error.statusCode || 500 }
    );
  }
}