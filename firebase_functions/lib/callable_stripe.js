"use strict";
// /Users/andystaudinger/Tilvo/functions/src/callable_stripe.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripeAccountStatus = exports.getSavedPaymentMethods = exports.createSetupIntent = exports.updateStripeCompanyDetails = exports.createStripeAccountIfComplete = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
// Angepasste Importe
const helpers_1 = require("./helpers");
const firestore_1 = require("firebase-admin/firestore");
const translateStripeRequirement = (req) => {
    if (req.startsWith('company.address.'))
        return `Firmenadresse (${req.substring(req.lastIndexOf('.') + 1)})`;
    if (req.startsWith('company.verification.document'))
        return "Firmen-Verifizierungsdokument (z.B. Handelsregisterauszug)";
    if (req === 'company.name')
        return "Firmenname";
    if (req === 'company.phone')
        return "Telefonnummer der Firma";
    if (req === 'company.tax_id')
        return "Nationale Steuernummer der Firma";
    if (req === 'company.registration_number')
        return "Handelsregisternummer";
    if (req === 'company.vat_id')
        return "Umsatzsteuer-ID der Firma";
    if (req.includes('percent_ownership'))
        return "Eigentumsanteil der Person";
    if (req === 'business_profile.mcc')
        return "MCC (Branchencode)";
    if (req === 'business_profile.url')
        return "Firmenwebseite (Ihr Profil auf Tilvo)";
    if (req.startsWith('person.') || req.startsWith('individual.')) {
        const prefix = req.startsWith('person.') ? 'person.' : 'individual.';
        const personField = req.substring(prefix.length);
        const baseText = "Angaben zur Person/Geschäftsführer";
        if (personField.startsWith('first_name'))
            return `${baseText}: Vorname`;
        if (personField.startsWith('last_name'))
            return `${baseText}: Nachname`;
        if (personField.startsWith('email'))
            return `${baseText}: E-Mail`;
        if (personField.startsWith('phone'))
            return `${baseText}: Telefonnummer`;
        if (personField.startsWith('dob.'))
            return `${baseText}: Geburtsdatum`;
        if (personField.startsWith('address.'))
            return `${baseText}: Private Adresse (${personField.substring(personField.lastIndexOf('.') + 1)})`;
        if (personField.startsWith('verification.document'))
            return `${baseText}: Ausweisdokument`;
        if (personField.startsWith('relationship.owner'))
            return "Nachweis der Eigentümerschaft";
        if (personField.startsWith('relationship.director'))
            return "Nachweis der Geschäftsführertätigkeit";
        if (personField.startsWith('relationship.executive'))
            return "Angaben zur leitenden Führungskraft";
        if (personField.startsWith('relationship.representative'))
            return "Angaben zum Vertreter";
        if (personField.startsWith('relationship.title'))
            return "Position/Titel des Vertreters";
        return `${baseText}: ${personField.replace('.', ' ')}`;
    }
    if (req.startsWith('external_account'))
        return "Bankverbindung";
    if (req.startsWith('tos_acceptance.'))
        return "Zustimmung zu den Stripe Nutzungsbedingungen";
    return `Benötigt: ${req.replace(/[._]/g, ' ')}`;
};
const mapLegalFormToStripeBusinessInfo = (legalForm) => {
    if (!legalForm) {
        v2_1.logger.warn("[mapLegalFormToStripeBusinessInfo] Keine Rechtsform übergeben, Fallback auf business_type: 'company', company.structure: undefined.");
        return { businessType: 'company', companyStructure: undefined };
    }
    const form = legalForm.toLowerCase();
    if (form.includes("einzelunternehmen") || form.includes("freiberufler")) {
        if (form.includes("e.k.") || form.includes("eingetragener kaufmann")) {
            return { businessType: 'company', companyStructure: 'sole_proprietorship' };
        }
        return { businessType: 'individual' };
    }
    if (form.includes("gmbh") || form.includes("ug"))
        return { businessType: 'company', companyStructure: undefined };
    if (form.includes("ag"))
        return { businessType: 'company', companyStructure: "public_company" };
    if (form.includes("gbr") || form.includes("ohg") || form.includes("kg") || form.includes("partnerschaft"))
        return { businessType: 'company', companyStructure: "unincorporated_partnership" };
    v2_1.logger.warn(`[mapLegalFormToStripeBusinessInfo] Unbekannte Rechtsform "${legalForm}", Fallback auf business_type: 'company', company.structure: undefined.`);
    return { businessType: 'company', companyStructure: undefined };
};
exports.createStripeAccountIfComplete = (0, https_1.onCall)(async (request) => {
    v2_1.logger.info('[createStripeAccountIfComplete] Aufgerufen mit Payload:', JSON.stringify(request.data));
    const localStripe = (0, helpers_1.getStripeInstance)();
    const { userId, clientIp, ...payloadFromClient } = request.data;
    // Hier die öffentliche URL verwenden
    const publicFrontendURL = (0, helpers_1.getPublicFrontendURL)();
    if (!userId || !clientIp || clientIp.length < 7) {
        throw new https_1.HttpsError("invalid-argument", "Nutzer-ID und gültige IP sind erforderlich.");
    }
    v2_1.logger.info('[DEBUG] Punkt 1: Basis-Infos (userId, IP) OK.');
    const userDocRef = helpers_1.db.collection("users").doc(userId);
    const userDocSnapshot = await userDocRef.get();
    if (!userDocSnapshot.exists) {
        throw new https_1.HttpsError("not-found", `Nutzerdokument ${userId} nicht gefunden.`);
    }
    const existingFirestoreUserData = userDocSnapshot.data();
    if (!existingFirestoreUserData) {
        throw new https_1.HttpsError("internal", "Fehler beim Lesen der Nutzerdaten aus Firestore.");
    }
    v2_1.logger.info('[DEBUG] Punkt 2: Nutzerdokument aus Firestore geladen OK.');
    if (existingFirestoreUserData.stripeAccountId?.startsWith('acct_')) {
        throw new https_1.HttpsError("already-exists", "Nutzer hat bereits ein Stripe-Konto.");
    }
    v2_1.logger.info('[DEBUG] Punkt 3: Kein bestehendes Stripe-Konto gefunden, fahre fort OK.');
    if (existingFirestoreUserData.user_type !== "firma") {
        throw new https_1.HttpsError("failed-precondition", "Nur Nutzer vom Typ 'Firma' können Stripe-Konten erstellen.");
    }
    v2_1.logger.info('[DEBUG] Punkt 4: Nutzer ist Typ "Firma" OK.');
    const { businessType, companyStructure } = mapLegalFormToStripeBusinessInfo(payloadFromClient.legalForm);
    v2_1.logger.info(`[DEBUG] Punkt 5: Rechtsform gemappt. Typ: ${businessType}, Struktur: ${companyStructure}`);
    // VALIDIERUNG START
    if (!payloadFromClient.legalForm?.trim())
        throw new https_1.HttpsError("failed-precondition", "Rechtsform ist eine Pflichtangabe.");
    v2_1.logger.info('[DEBUG] Validierung OK: legalForm');
    if (!payloadFromClient.email?.trim())
        throw new https_1.HttpsError("failed-precondition", "E-Mail ist erforderlich.");
    v2_1.logger.info('[DEBUG] Validierung OK: email');
    if (!payloadFromClient.firstName?.trim())
        throw new https_1.HttpsError("failed-precondition", "Vorname ist erforderlich.");
    v2_1.logger.info('[DEBUG] Validierung OK: firstName');
    if (!payloadFromClient.lastName?.trim())
        throw new https_1.HttpsError("failed-precondition", "Nachname ist erforderlich.");
    v2_1.logger.info('[DEBUG] Validierung OK: lastName');
    if (!payloadFromClient.iban?.trim())
        throw new https_1.HttpsError("failed-precondition", "IBAN ist erforderlich.");
    v2_1.logger.info('[DEBUG] Validierung OK: iban');
    if (!payloadFromClient.accountHolder?.trim())
        throw new https_1.HttpsError("failed-precondition", "Kontoinhaber ist erforderlich.");
    v2_1.logger.info('[DEBUG] Validierung OK: accountHolder');
    if (!payloadFromClient.mcc?.trim())
        throw new https_1.HttpsError("failed-precondition", "MCC (Branchencode) ist erforderlich.");
    v2_1.logger.info('[DEBUG] Validierung OK: mcc');
    if (!payloadFromClient.identityFrontFileId || !payloadFromClient.identityBackFileId)
        throw new https_1.HttpsError("failed-precondition", "Ausweisdokumente (Vorder- und Rückseite) sind erforderlich.");
    v2_1.logger.info('[DEBUG] Validierung OK: identityFileIds');
    if (!payloadFromClient.profilePictureFileId)
        throw new https_1.HttpsError("failed-precondition", "Profilbild ist erforderlich.");
    v2_1.logger.info('[DEBUG] Validierung OK: profilePictureFileId');
    if (!payloadFromClient.dateOfBirth) {
        throw new https_1.HttpsError("failed-precondition", "Geburtsdatum des Ansprechpartners/Inhabers ist erforderlich.");
    }
    v2_1.logger.info('[DEBUG] Validierung OK: dateOfBirth existiert.');
    const [yearDob, monthDob, dayDob] = payloadFromClient.dateOfBirth.split('-').map(Number);
    const dobDate = new Date(Date.UTC(yearDob, monthDob - 1, dayDob));
    if (!(dobDate.getUTCFullYear() === yearDob && dobDate.getUTCMonth() === monthDob - 1 && dobDate.getUTCDate() === dayDob && yearDob > 1900 && yearDob < (new Date().getFullYear() - 17))) {
        v2_1.logger.error(`FEHLER bei DOB-Validierung: Jahr=${yearDob}, Monat=${monthDob}, Tag=${dayDob}`);
        throw new https_1.HttpsError("invalid-argument", "Ungültiges Geburtsdatum oder Person zu jung.");
    }
    v2_1.logger.info('[DEBUG] Validierung OK: dateOfBirth ist gültiges Format und Alter.');
    if (businessType === 'company') {
        v2_1.logger.info('[DEBUG] Starte Validierungen für "company".');
        if (!payloadFromClient.companyName?.trim())
            throw new https_1.HttpsError("failed-precondition", "Firmenname ist erforderlich.");
        if (!payloadFromClient.companyAddressLine1?.trim() || !payloadFromClient.companyCity?.trim() || !payloadFromClient.companyPostalCode?.trim() || !payloadFromClient.companyCountry?.trim()) {
            throw new https_1.HttpsError("failed-precondition", "Vollständige Firmenadresse ist erforderlich.");
        }
        if (payloadFromClient.companyCountry && payloadFromClient.companyCountry.length !== 2)
            throw new https_1.HttpsError("invalid-argument", "Ländercode Firma muss 2-stellig sein.");
        if (!payloadFromClient.businessLicenseFileId)
            throw new https_1.HttpsError("failed-precondition", "Gewerbeschein ist für Firmen erforderlich.");
        v2_1.logger.info('[DEBUG] Company-Validierung OK: Basis-Infos.');
    }
    else { // businessType === 'individual'
        v2_1.logger.info('[DEBUG] Starte Validierungen für "individual".');
        const personalStreetToUse = payloadFromClient.personalStreet?.trim() || payloadFromClient.companyAddressLine1?.trim();
        const personalPostalCodeToUse = payloadFromClient.personalPostalCode?.trim() || payloadFromClient.companyPostalCode?.trim();
        const personalCityToUse = payloadFromClient.personalCity?.trim() || payloadFromClient.companyCity?.trim();
        const personalCountryToUse = payloadFromClient.personalCountry?.trim() || payloadFromClient.companyCountry?.trim();
        if (!personalStreetToUse || !personalPostalCodeToUse || !personalCityToUse || !personalCountryToUse) {
            throw new https_1.HttpsError("failed-precondition", "Vollständige Adresse (Privat- oder Firmenadresse) für Einzelperson/Freiberufler erforderlich.");
        }
        if (personalCountryToUse && personalCountryToUse.length !== 2) {
            throw new https_1.HttpsError("invalid-argument", "Verwendeter Ländercode muss 2-stellig sein.");
        }
        v2_1.logger.info('[DEBUG] Individual-Validierung OK: Adresse.');
        if (!payloadFromClient.taxNumber?.trim() && !payloadFromClient.vatId?.trim()) {
            throw new https_1.HttpsError("failed-precondition", `Nationale Steuernummer ODER USt-IdNr. für ${payloadFromClient.legalForm} erforderlich.`);
        }
        v2_1.logger.info('[DEBUG] Individual-Validierung OK: Steuernummer.');
    }
    v2_1.logger.info('[DEBUG] Alle Validierungen bestanden. Fahre fort mit Kontoerstellung.');
    const userAgent = existingFirestoreUserData.common?.tosAcceptanceUserAgent || request.rawRequest?.headers["user-agent"] || "UserAgentNotProvided";
    const undefinedIfNull = (val) => val === null ? undefined : val;
    // Verwendung der öffentlichen URL für Stripe Business Profile
    const platformProfileUrl = `${publicFrontendURL}/profil/${userId}`;
    const accountParams = {
        type: "custom",
        country: businessType === 'company' ? undefinedIfNull(payloadFromClient.companyCountry) : undefinedIfNull(payloadFromClient.personalCountry || payloadFromClient.companyCountry),
        email: payloadFromClient.email,
        business_type: businessType,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { internal_user_id: userId, created_by_callable: "true", legal_form_provided: undefinedIfNull(payloadFromClient.legalForm) || 'N/A' },
        tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: clientIp, user_agent: userAgent },
        business_profile: {
            mcc: payloadFromClient.mcc,
            url: platformProfileUrl,
        },
    };
    if (businessType === 'company') {
        accountParams.company = {
            name: payloadFromClient.companyName,
            address: {
                line1: payloadFromClient.companyAddressLine1,
                city: payloadFromClient.companyCity,
                postal_code: payloadFromClient.companyPostalCode,
                country: undefinedIfNull(payloadFromClient.companyCountry),
            },
            phone: undefinedIfNull(payloadFromClient.companyPhoneNumber || payloadFromClient.phoneNumber),
            registration_number: undefinedIfNull(payloadFromClient.companyRegister),
            tax_id: undefinedIfNull(payloadFromClient.taxNumber),
            vat_id: undefinedIfNull(payloadFromClient.vatId),
            structure: companyStructure,
        };
        if (payloadFromClient.businessLicenseFileId && accountParams.company) {
            if (!accountParams.company.verification)
                accountParams.company.verification = { document: {} };
            accountParams.company.verification.document = { front: payloadFromClient.businessLicenseFileId };
        }
    }
    else {
        const personalStreet = undefinedIfNull(payloadFromClient.personalStreet?.trim() || payloadFromClient.companyAddressLine1?.trim());
        const personalHouse = undefinedIfNull(payloadFromClient.personalHouseNumber?.trim());
        accountParams.individual = {
            first_name: payloadFromClient.firstName,
            last_name: payloadFromClient.lastName,
            email: payloadFromClient.email,
            phone: undefinedIfNull(payloadFromClient.phoneNumber),
            dob: { day: dayDob, month: monthDob, year: yearDob },
            address: {
                line1: personalStreet ? `${personalStreet} ${personalHouse ?? ''}`.trim() : undefinedIfNull(payloadFromClient.companyAddressLine1),
                postal_code: undefinedIfNull(payloadFromClient.personalPostalCode || payloadFromClient.companyPostalCode),
                city: undefinedIfNull(payloadFromClient.personalCity || payloadFromClient.companyCity),
                country: undefinedIfNull(payloadFromClient.personalCountry || payloadFromClient.companyCountry),
            },
            verification: {
                document: {
                    front: payloadFromClient.identityFrontFileId,
                    back: payloadFromClient.identityBackFileId,
                }
            }
        };
    }
    if (payloadFromClient.iban && payloadFromClient.accountHolder) {
        accountParams.external_account = {
            object: "bank_account",
            country: businessType === 'company' ? undefinedIfNull(payloadFromClient.companyCountry) : undefinedIfNull(payloadFromClient.personalCountry || payloadFromClient.companyCountry),
            currency: "eur",
            account_number: (payloadFromClient.iban).replace(/\s/g, ""),
            account_holder_name: payloadFromClient.accountHolder,
        };
    }
    if (payloadFromClient.profilePictureFileId) {
        accountParams.settings = { ...accountParams.settings, branding: { icon: payloadFromClient.profilePictureFileId } };
    }
    let account;
    try {
        v2_1.logger.info(">>>> VERSUCHE, STRIPE KONTO ZU ERSTELLEN mit Parametern:", JSON.stringify(accountParams, null, 2));
        account = await localStripe.accounts.create(accountParams);
        v2_1.logger.info(`✅✅✅ ERFOLG! Stripe Account ${account.id} wurde erstellt.`);
    }
    catch (e) {
        v2_1.logger.error("🔥🔥🔥 STRIPE API FEHLER 🔥🔥🔥:", {
            message: e.message,
            type: e.type,
            code: e.code,
            param: e.param,
            raw: e.raw
        });
        throw new https_1.HttpsError("internal", e.raw?.message || "Fehler bei initialer Kontoerstellung durch Stripe.");
    }
    v2_1.logger.info(">>>> NACH dem Stripe API Call. Account-Daten:", account);
    if (businessType === 'company') {
        const personRelationship = {
            representative: true,
            director: payloadFromClient.isActualDirector,
            owner: payloadFromClient.isActualOwner,
            executive: payloadFromClient.isActualExecutive,
            title: payloadFromClient.actualRepresentativeTitle,
        };
        if (payloadFromClient.isManagingDirectorOwner) {
            personRelationship.owner = true;
            personRelationship.director = true;
            personRelationship.executive = true;
            personRelationship.title = "Geschäftsführender Gesellschafter";
            personRelationship.percent_ownership = payloadFromClient.ownershipPercentage;
        }
        const personPayload = {
            first_name: payloadFromClient.firstName,
            last_name: payloadFromClient.lastName,
            email: payloadFromClient.email,
            phone: undefinedIfNull(payloadFromClient.phoneNumber),
            relationship: personRelationship,
            verification: { document: { front: payloadFromClient.identityFrontFileId, back: payloadFromClient.identityBackFileId } },
            dob: { day: dayDob, month: monthDob, year: yearDob },
            address: {
                line1: `${payloadFromClient.personalStreet} ${payloadFromClient.personalHouseNumber ?? ''}`.trim(),
                postal_code: payloadFromClient.personalPostalCode,
                city: payloadFromClient.personalCity,
                country: payloadFromClient.personalCountry,
            },
        };
        try {
            const person = await localStripe.accounts.createPerson(account.id, personPayload);
            await userDocRef.update({ stripeRepresentativePersonId: person.id });
        }
        catch (e) {
            await localStripe.accounts.del(account.id);
            throw new https_1.HttpsError("internal", e.raw?.message || "Fehler beim Erstellen der Personendaten bei Stripe.");
        }
    }
    const firestoreUpdateData = {
        stripeAccountId: account.id,
        stripeAccountDetailsSubmitted: account.details_submitted,
        stripeAccountPayoutsEnabled: account.payouts_enabled,
        stripeAccountChargesEnabled: account.charges_enabled,
        stripeAccountCreationDate: firestore_1.FieldValue.serverTimestamp(),
        stripeAccountError: firestore_1.FieldValue.delete(),
        "common.createdByCallable": "true",
        "step1.dateOfBirth": payloadFromClient.dateOfBirth || null,
        "step1.phoneNumber": payloadFromClient.phoneNumber || null,
        "step1.personalStreet": payloadFromClient.personalStreet || null,
        "step1.personalHouseNumber": payloadFromClient.personalHouseNumber || null,
        "step1.personalPostalCode": payloadFromClient.personalPostalCode || null,
        "step1.personalCity": payloadFromClient.personalCity || null,
        "step1.personalCountry": payloadFromClient.personalCountry || null,
        "step1.isManagingDirectorOwner": payloadFromClient.isManagingDirectorOwner ?? true,
        "step1.ownershipPercentage": payloadFromClient.ownershipPercentage ?? null,
        "step1.isActualDirector": payloadFromClient.isActualDirector === undefined ? null : payloadFromClient.isActualDirector,
        "step1.isActualOwner": payloadFromClient.isActualOwner === undefined ? null : payloadFromClient.isActualOwner,
        "step1.actualOwnershipPercentage": payloadFromClient.actualOwnershipPercentage ?? null,
        "step1.isActualExecutive": payloadFromClient.isActualExecutive === undefined ? null : payloadFromClient.isActualExecutive,
        "step1.actualRepresentativeTitle": payloadFromClient.actualRepresentativeTitle || null,
        "step2.legalForm": payloadFromClient.legalForm || null,
        "step2.companyName": payloadFromClient.companyName || null,
        "step2.industryMcc": payloadFromClient.mcc || null,
        "step2.website": payloadFromClient.companyWebsite || null,
        "step3.companyRegister": payloadFromClient.companyRegister || null,
        "step3.taxNumber": payloadFromClient.taxNumber || null,
        "step3.vatId": payloadFromClient.vatId || null,
        "step3.profilePictureURL": payloadFromClient.profilePictureFileId || null,
        "step3.businessLicenseURL": payloadFromClient.businessLicenseFileId || null,
        "step3.masterCraftsmanCertificateURL": payloadFromClient.masterCraftsmanCertificateFileId || firestore_1.FieldValue.delete(),
        "step3.identityFrontUrl": payloadFromClient.identityFrontFileId || null,
        "step3.identityBackUrl": payloadFromClient.identityBackFileId || null,
    };
    await userDocRef.update(firestoreUpdateData);
    const sendgrid = (0, helpers_1.getSendGridClient)();
    if (sendgrid && payloadFromClient.email && payloadFromClient.firstName) {
        const recipientName = payloadFromClient.firstName;
        const entityName = businessType === 'company' ? payloadFromClient.companyName : `${payloadFromClient.firstName} ${payloadFromClient.lastName}`;
        const emailContent = {
            to: payloadFromClient.email,
            from: { email: "support@tilvo.com", name: "Tilvo Team" },
            subject: `Dein Tilvo Konto wurde bei Stripe angelegt`,
            html: `<p>Hallo ${recipientName},</p><p>Dein Stripe-Konto (<code>${account.id}</code>) für "<strong>${entityName}</strong>" wurde initial bei Stripe angelegt. Bitte vervollständige alle notwendigen Angaben in deinem Tilvo Dashboard, um dein Konto zu aktivieren.</p><p>Viel Erfolg!</p><p>Dein Tilvo-Team</p>`,
            text: `Hallo ${recipientName},\n\nDein Stripe-Konto (${account.id}) für "${entityName}" wurde initial bei Stripe angelegt. Bitte vervollständige alle notwendigen Angaben in deinem Tilvo Dashboard, um dein Konto zu aktivieren.\n\nViel Erfolg,\nDein Tilvo-Team`,
        };
        try {
            await sendgrid.send(emailContent);
        }
        catch (e) {
            v2_1.logger.error("Mail Senden (Firma):", e.response?.body || e.message, e);
        }
    }
    const finalAccountData = await localStripe.accounts.retrieve(account.id);
    const finalMissingFields = [];
    (finalAccountData.requirements?.currently_due || []).forEach(req => finalMissingFields.push(translateStripeRequirement(req)));
    (finalAccountData.requirements?.eventually_due || []).forEach(req => finalMissingFields.push(`Benötigt (später): ${translateStripeRequirement(req)}`));
    return {
        success: true,
        accountId: account.id,
        message: "Stripe Konto erfolgreich erstellt und alle Anforderungen erfüllt.",
        missingFields: [...new Set(finalMissingFields)],
    };
});
exports.updateStripeCompanyDetails = (0, https_1.onCall)(async (request) => {
    v2_1.logger.info("[updateStripeCompanyDetails] Aufgerufen mit request.data:", JSON.stringify(request.data));
    if (!request.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    const userId = request.auth.uid;
    const localStripe = (0, helpers_1.getStripeInstance)();
    // Hier die Emulator-Callback-URL für Account Links verwenden
    const emulatorCallbackFrontendURL = (0, helpers_1.getEmulatorCallbackFrontendURL)();
    const userDocRef = helpers_1.db.collection("users").doc(userId);
    try {
        const userDoc = await userDocRef.get();
        if (!userDoc.exists)
            throw new https_1.HttpsError("not-found", "Benutzerprofil nicht gefunden.");
        const currentFirestoreUserData = userDoc.data();
        if (!currentFirestoreUserData)
            throw new https_1.HttpsError("internal", "Nutzerdaten nicht lesbar.");
        const stripeAccountId = currentFirestoreUserData.stripeAccountId;
        if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
            throw new https_1.HttpsError("failed-precondition", "Stripe-Konto ID ist nicht vorhanden oder ungültig.");
        }
        const currentStripeAccount = await localStripe.accounts.retrieve(stripeAccountId);
        const currentBusinessType = currentStripeAccount.business_type;
        const updatePayloadFromClient = request.data;
        const accountUpdateParams = {};
        if (currentBusinessType === 'company') {
            const companyUpdates = {};
            if (updatePayloadFromClient.companyPhoneNumber !== undefined)
                companyUpdates.phone = updatePayloadFromClient.companyPhoneNumber || undefined;
            if (updatePayloadFromClient.companyRegister !== undefined)
                companyUpdates.registration_number = updatePayloadFromClient.companyRegister || undefined;
            if (updatePayloadFromClient.taxNumber !== undefined)
                companyUpdates.tax_id = updatePayloadFromClient.taxNumber || undefined;
            if (updatePayloadFromClient.vatId !== undefined)
                companyUpdates.vat_id = updatePayloadFromClient.vatId || undefined;
            if (Object.keys(companyUpdates).length > 0)
                accountUpdateParams.company = companyUpdates;
        }
        else {
            const individualUpdates = {};
            if (updatePayloadFromClient.representativeFirstName)
                individualUpdates.first_name = updatePayloadFromClient.representativeFirstName;
            if (updatePayloadFromClient.representativeLastName)
                individualUpdates.last_name = updatePayloadFromClient.representativeLastName;
            if (updatePayloadFromClient.representativeEmail)
                individualUpdates.email = updatePayloadFromClient.representativeEmail;
            if (updatePayloadFromClient.representativePhone)
                individualUpdates.phone = updatePayloadFromClient.representativePhone;
            if (updatePayloadFromClient.representativeDateOfBirth) {
                const [year, month, day] = updatePayloadFromClient.representativeDateOfBirth.split('-').map(Number);
                if (day && month && year && year > 1900 && year < (new Date().getFullYear() - 5) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    individualUpdates.dob = { day, month, year };
                }
            }
            if (updatePayloadFromClient.representativeAddressStreet && updatePayloadFromClient.representativeAddressPostalCode && updatePayloadFromClient.representativeAddressCity && updatePayloadFromClient.representativeAddressCountry) {
                individualUpdates.address = {
                    line1: `${updatePayloadFromClient.representativeAddressStreet} ${updatePayloadFromClient.representativeAddressHouseNumber ?? ''}`.trim(),
                    postal_code: updatePayloadFromClient.representativeAddressPostalCode,
                    city: updatePayloadFromClient.representativeAddressCity,
                    country: updatePayloadFromClient.representativeAddressCountry,
                };
            }
            const verificationIndividual = {};
            const documentIndividual = {};
            if (updatePayloadFromClient.identityFrontFileId)
                documentIndividual.front = updatePayloadFromClient.identityFrontFileId;
            // FEHLER BEHOBEN: `updatePayload` zu `updatePayloadFromClient` geändert
            if (updatePayloadFromClient.identityBackFileId)
                documentIndividual.back = updatePayloadFromClient.identityBackFileId;
            if (Object.keys(documentIndividual).length > 0)
                verificationIndividual.document = documentIndividual;
            if (Object.keys(verificationIndividual).length > 0)
                individualUpdates.verification = verificationIndividual;
            if (Object.keys(individualUpdates).length > 0)
                accountUpdateParams.individual = individualUpdates;
        }
        const businessProfileUpdates = {};
        if (updatePayloadFromClient.companyWebsite !== undefined) {
            businessProfileUpdates.url = updatePayloadFromClient.companyWebsite || "";
        }
        if (updatePayloadFromClient.mcc !== undefined)
            businessProfileUpdates.mcc = updatePayloadFromClient.mcc || undefined;
        if (Object.keys(businessProfileUpdates).length > 0)
            accountUpdateParams.business_profile = businessProfileUpdates;
        if (updatePayloadFromClient.iban && updatePayloadFromClient.accountHolder && updatePayloadFromClient.bankCountry) {
            accountUpdateParams.external_account = {
                object: 'bank_account',
                account_holder_name: updatePayloadFromClient.accountHolder,
                account_number: updatePayloadFromClient.iban.replace(/\s/g, ''),
                country: updatePayloadFromClient.bankCountry,
            };
        }
        if (Object.keys(accountUpdateParams).length > 0) {
            await localStripe.accounts.update(stripeAccountId, accountUpdateParams);
            v2_1.logger.info(`Stripe Account ${stripeAccountId} (Typ: ${currentBusinessType}) aktualisiert.`);
        }
        if (currentBusinessType === 'company') {
            let personIdToUpdate = currentFirestoreUserData.stripeRepresentativePersonId;
            const personDataToUpdate = {};
            let isCreatingNewPerson = false;
            if (updatePayloadFromClient.representativeFirstName)
                personDataToUpdate.first_name = updatePayloadFromClient.representativeFirstName;
            if (updatePayloadFromClient.representativeLastName)
                personDataToUpdate.last_name = updatePayloadFromClient.representativeLastName;
            if (updatePayloadFromClient.representativeEmail)
                personDataToUpdate.email = updatePayloadFromClient.representativeEmail;
            if (updatePayloadFromClient.representativePhone)
                personDataToUpdate.phone = updatePayloadFromClient.representativePhone;
            if (updatePayloadFromClient.representativeDateOfBirth) {
                const [year, month, day] = updatePayloadFromClient.representativeDateOfBirth.split('-').map(Number);
                if (day && month && year && year > 1900 && year < (new Date().getFullYear() - 5) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    personDataToUpdate.dob = { day, month, year };
                }
                else {
                    v2_1.logger.warn(`[updateStripeCompanyDetails] Ungültiges DOB-Format für Update: ${updatePayloadFromClient.representativeDateOfBirth}`);
                }
            }
            if (updatePayloadFromClient.representativeAddressStreet && updatePayloadFromClient.representativeAddressPostalCode && updatePayloadFromClient.representativeAddressCity && updatePayloadFromClient.representativeAddressCountry) {
                personDataToUpdate.address = {
                    line1: `${updatePayloadFromClient.representativeAddressStreet} ${updatePayloadFromClient.representativeAddressHouseNumber ?? ''}`.trim(),
                    postal_code: updatePayloadFromClient.representativeAddressPostalCode,
                    city: updatePayloadFromClient.representativeAddressCity,
                    country: updatePayloadFromClient.representativeAddressCountry,
                };
            }
            const relationship = {};
            if (updatePayloadFromClient.isRepresentative !== undefined)
                relationship.representative = updatePayloadFromClient.isRepresentative;
            else
                relationship.representative = true;
            if (updatePayloadFromClient.isOwner !== undefined)
                relationship.owner = updatePayloadFromClient.isOwner;
            if (updatePayloadFromClient.isDirector !== undefined)
                relationship.director = updatePayloadFromClient.isDirector;
            if (updatePayloadFromClient.isExecutive !== undefined)
                relationship.executive = updatePayloadFromClient.isExecutive;
            if (updatePayloadFromClient.representativeTitle)
                relationship.title = updatePayloadFromClient.representativeTitle;
            if (Object.keys(relationship).length > 0) {
                personDataToUpdate.relationship = relationship;
            }
            const verification = {};
            const documentData = {};
            if (updatePayloadFromClient.identityFrontFileId)
                documentData.front = updatePayloadFromClient.identityFrontFileId;
            if (updatePayloadFromClient.identityBackFileId)
                documentData.back = updatePayloadFromClient.identityBackFileId;
            if (Object.keys(documentData).length > 0)
                verification.document = documentData;
            if (Object.keys(verification).length > 0)
                personDataToUpdate.verification = verification;
            if (Object.keys(personDataToUpdate).length > 0) {
                if (!personIdToUpdate) {
                    const personsList = await localStripe.accounts.listPersons(stripeAccountId, { relationship: { representative: true }, limit: 1 });
                    if (personsList.data.length > 0) {
                        personIdToUpdate = personsList.data[0].id;
                    }
                    else {
                        if (personDataToUpdate.first_name && personDataToUpdate.last_name && personDataToUpdate.email && personDataToUpdate.dob) {
                            isCreatingNewPerson = true;
                        }
                        else {
                            v2_1.logger.warn(`[updateStripeCompanyDetails] Minimale Personendaten für Neuerstellung fehlen für Account ${stripeAccountId}.`);
                        }
                    }
                }
                if (isCreatingNewPerson && personIdToUpdate === undefined) {
                    const createPersonPayload = { ...personDataToUpdate };
                    const createdPerson = await localStripe.accounts.createPerson(stripeAccountId, createPersonPayload);
                    personIdToUpdate = createdPerson.id;
                    await userDocRef.update({ stripeRepresentativePersonId: personIdToUpdate });
                    v2_1.logger.info(`Stripe Person ${personIdToUpdate} für Account ${stripeAccountId} NEU erstellt via Update-Funktion.`);
                }
                else if (personIdToUpdate) {
                    await localStripe.accounts.updatePerson(stripeAccountId, personIdToUpdate, personDataToUpdate);
                    v2_1.logger.info(`Stripe Person ${personIdToUpdate} für Account ${stripeAccountId} aktualisiert.`);
                }
            }
        }
        await userDocRef.update({ stripeAccountError: firestore_1.FieldValue.delete(), updatedAt: firestore_1.FieldValue.serverTimestamp() });
        const companyDocRef = helpers_1.db.collection("companies").doc(userId);
        if ((await companyDocRef.get()).exists) {
            await companyDocRef.set({ stripeAccountError: firestore_1.FieldValue.delete(), updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        }
        const refreshedAccountAfterUpdate = await localStripe.accounts.retrieve(stripeAccountId);
        let accountLinkUrlResponse = undefined;
        const finalMissingFieldsList = [];
        (refreshedAccountAfterUpdate.requirements?.currently_due || []).forEach((req) => finalMissingFieldsList.push(translateStripeRequirement(req)));
        (refreshedAccountAfterUpdate.requirements?.eventually_due || []).forEach((req) => finalMissingFieldsList.push(`Benötigt (später): ${translateStripeRequirement(req)}`));
        if (!refreshedAccountAfterUpdate.details_submitted && finalMissingFieldsList.length === 0 && (refreshedAccountAfterUpdate.requirements?.currently_due?.length === 0)) {
            finalMissingFieldsList.push("Allgemeine Kontodetails bei Stripe vervollständigen");
        }
        if ((refreshedAccountAfterUpdate.requirements?.errors?.length ?? 0) > 0) {
            (refreshedAccountAfterUpdate.requirements.errors || []).forEach((err) => {
                finalMissingFieldsList.push(`Fehler von Stripe: ${err.reason} (betrifft: ${translateStripeRequirement(err.requirement)})`);
            });
        }
        const uniqueFinalMissingFieldsList = [...new Set(finalMissingFieldsList)];
        if (uniqueFinalMissingFieldsList.length > 0) {
            const accLink = await localStripe.accountLinks.create({
                account: stripeAccountId,
                // Hier die Emulator-Callback-URL für Account Links verwenden
                refresh_url: `${emulatorCallbackFrontendURL}/dashboard/company/${userId}/settings?stripe_refresh=true`,
                return_url: `${emulatorCallbackFrontendURL}/dashboard/company/${userId}/settings?stripe_return=true`,
                type: 'account_update',
                collect: 'currently_due',
            });
            accountLinkUrlResponse = accLink.url;
            return { success: true, message: "Profildetails aktualisiert, aber einige Angaben werden noch von Stripe benötigt oder es gibt Fehler.", accountLinkUrl: accountLinkUrlResponse, missingFields: [...new Set(uniqueFinalMissingFieldsList)] };
        }
        return { success: true, message: "Profildetails erfolgreich bei Stripe aktualisiert.", accountLinkUrl: undefined, missingFields: [] };
    }
    catch (error) {
        v2_1.logger.error(`[updateStripeCompanyDetails] Fehler für Nutzer ${userId}:`, { message: error.message, type: error.type, code: error.code, param: error.param, raw: error.raw });
        let errMsg = "Interner Fehler beim Aktualisieren der Stripe-Informationen.";
        if (error instanceof https_1.HttpsError)
            errMsg = error.message;
        else if (error.type === "StripeInvalidRequestError" || error.type === "StripeCardError")
            errMsg = error.message;
        else if (error.message)
            errMsg = error.message;
        try {
            const userDocForError = helpers_1.db.collection("users").doc(userId);
            await userDocForError.update({ stripeAccountError: errMsg, updatedAt: firestore_1.FieldValue.serverTimestamp() });
            const companyDocRefForError = helpers_1.db.collection("companies").doc(userId);
            if ((await companyDocRefForError.get()).exists) {
                await companyDocRefForError.set({ stripeAccountError: errMsg, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
            }
        }
        catch (dbError) {
            v2_1.logger.error(`DB-Fehler beim Speichern des Stripe-Fehlers für ${userId} im Catch-Block von updateStripeCompanyDetails:`, dbError.message);
        }
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", errMsg, error.raw?.code || error.code || error.type);
    }
});
// --- NEUE FUNKTION: createSetupIntent ---
/**
 * Erstellt einen Stripe SetupIntent, um eine Zahlungsmethode für einen Benutzer zu speichern.
 * Gibt das clientSecret zurück, das vom Frontend verwendet wird, um die Payment Method zu erfassen.
 */
exports.createSetupIntent = (0, https_1.onCall)(async (request) => {
    v2_1.logger.info("[createSetupIntent] Aufgerufen.");
    // Überprüfen der Authentifizierung
    if (!request.auth?.uid) {
        v2_1.logger.warn("[createSetupIntent] Unauthentifizierter Aufruf.");
        throw new https_1.HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    }
    const firebaseUserId = request.auth.uid;
    const localStripe = (0, helpers_1.getStripeInstance)();
    try {
        const userDocRef = helpers_1.db.collection("users").doc(firebaseUserId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            v2_1.logger.error(`[createSetupIntent] Nutzerprofil ${firebaseUserId} nicht gefunden.`);
            throw new https_1.HttpsError("not-found", "Nutzerprofil nicht gefunden.");
        }
        const userData = userDoc.data();
        // Stellen Sie sicher, dass der Benutzer bereits einen Stripe Customer hat
        if (!userData.stripeCustomerId) {
            v2_1.logger.error(`[createSetupIntent] Stripe Customer ID fehlt für Nutzer ${firebaseUserId}.`);
            throw new https_1.HttpsError("failed-precondition", "Stripe Customer ID fehlt. Bitte erstellen Sie zuerst einen Kunden.");
        }
        // Erstellen des SetupIntent
        const setupIntent = await localStripe.setupIntents.create({
            customer: userData.stripeCustomerId, // Der Stripe Customer, dem die PaymentMethod zugeordnet werden soll
            usage: 'off_session', // Ermöglicht das spätere Wiederverwenden der PaymentMethod
            // Sie können hier weitere Parameter wie metadata hinzufügen, wenn nötig
        });
        v2_1.logger.info(`[createSetupIntent] SetupIntent ${setupIntent.id} für Nutzer ${firebaseUserId} erstellt.`);
        return { clientSecret: setupIntent.client_secret }; // client_secret ist immer vorhanden bei successful creation
    }
    catch (e) {
        v2_1.logger.error(`[createSetupIntent] Fehler für Nutzer ${firebaseUserId}:`, e);
        if (e instanceof https_1.HttpsError) {
            throw e;
        }
        // Generische Fehlermeldung für das Frontend
        throw new https_1.HttpsError("internal", "Fehler beim Erstellen des SetupIntent.", e.message);
    }
});
// --- NEUE FUNKTION: getSavedPaymentMethods ---
/**
 * Ruft die im Firestore-Nutzerdokument gespeicherten PaymentMethods ab.
 * Beachten Sie: Diese Funktion holt die Daten aus Firestore. Für die aktuellsten
 * Details einer PaymentMethod sollten Sie Stripe.paymentMethods.retrieve verwenden.
 * Für eine Liste, die direkt von Stripe abgerufen wird (und nicht nur die Firestore-Kopie),
 * müssten Sie stripe.customers.listPaymentMethods verwenden.
 */
exports.getSavedPaymentMethods = (0, https_1.onCall)(async (request) => {
    v2_1.logger.info("[getSavedPaymentMethods] Aufgerufen.");
    if (!request.auth?.uid) {
        v2_1.logger.warn("[getSavedPaymentMethods] Unauthentifizierter Aufruf.");
        throw new https_1.HttpsError("unauthenticated", "Nutzer nicht authentifiziert.");
    }
    const firebaseUserId = request.auth.uid;
    const localStripe = (0, helpers_1.getStripeInstance)(); // Nur für den Fall, dass Sie hier direkt Stripe aufrufen wollen
    // um die aktuellsten Details zu erhalten, anstatt nur Firestore
    try {
        const userDocRef = helpers_1.db.collection("users").doc(firebaseUserId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            v2_1.logger.error(`[getSavedPaymentMethods] Nutzerprofil ${firebaseUserId} nicht gefunden.`);
            throw new https_1.HttpsError("not-found", "Nutzerprofil nicht gefunden.");
        }
        const userData = userDoc.data();
        // Option A: Laden aus Firestore (empfohlen für eine schnelle Anzeige von Übersichten)
        // Das 'savedPaymentMethods'-Array sollte durch den webhook handler (setup_intent.succeeded) befüllt werden.
        const savedMethods = userData.savedPaymentMethods || [];
        v2_1.logger.info(`[getSavedPaymentMethods] ${savedMethods.length} PaymentMethods aus Firestore für Nutzer ${firebaseUserId} geladen.`);
        return { savedPaymentMethods: savedMethods };
        // Option B: Laden direkt von Stripe (wenn Sie immer die aktuellsten Stripe-Informationen benötigen)
        // Dies wäre performanter, wenn das Firestore-Array nicht die primäre Quelle ist.
        /*
        if (!userData.stripeCustomerId) {
          loggerV2.info(`[getSavedPaymentMethods] Keine Stripe Customer ID für Nutzer ${firebaseUserId}.`);
          return { savedPaymentMethods: [] };
        }
        const stripePaymentMethods = await localStripe.paymentMethods.list({
          customer: userData.stripeCustomerId,
          type: 'card', // Oder andere Typen, die Sie abrufen möchten
          limit: 10, // Passen Sie das Limit an
        });
        loggerV2.info(`[getSavedPaymentMethods] ${stripePaymentMethods.data.length} PaymentMethods von Stripe für Nutzer ${firebaseUserId} geladen.`);
        return { savedPaymentMethods: stripePaymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
          type: pm.type,
          // Fügen Sie hier weitere benötigte Details hinzu
        }))};
        */
    }
    catch (e) {
        v2_1.logger.error(`[getSavedPaymentMethods] Fehler für Nutzer ${firebaseUserId}:`, e);
        if (e instanceof https_1.HttpsError) {
            throw e;
        }
        throw new https_1.HttpsError("internal", "Fehler beim Abrufen der gespeicherten Zahlungsmethoden.", e.message);
    }
});
exports.getStripeAccountStatus = (0, https_1.onCall)(async (request) => {
    v2_1.logger.info("[getStripeAccountStatus] Aufgerufen.");
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Nutzer muss angemeldet sein.");
    }
    const userId = request.auth.uid;
    const localStripe = (0, helpers_1.getStripeInstance)();
    // Hier die Emulator-Callback-URL für Account Links verwenden
    const emulatorCallbackFrontendURL = (0, helpers_1.getEmulatorCallbackFrontendURL)();
    try {
        const userDoc = await helpers_1.db.collection("users").doc(userId).get();
        if (!userDoc.exists)
            throw new https_1.HttpsError("not-found", "Nutzerdokument nicht gefunden.");
        const userData = userDoc.data();
        if (userData?.user_type !== "firma")
            throw new https_1.HttpsError("permission-denied", "Nur Firmen können Status abrufen.");
        const stripeAccountId = userData.stripeAccountId;
        if (!stripeAccountId?.startsWith("acct_")) {
            return {
                success: false, message: "Kein Stripe-Konto verknüpft oder ID ungültig.",
                accountId: null, detailsSubmitted: null, chargesEnabled: null,
                payoutsEnabled: null, requirements: null, accountLinkUrl: undefined,
                missingFields: ["Kein Stripe-Konto vorhanden oder verknüpft."]
            };
        }
        const account = await localStripe.accounts.retrieve(stripeAccountId);
        const currentMissingFields = [];
        (account.requirements?.currently_due || []).forEach((req) => currentMissingFields.push(translateStripeRequirement(req)));
        (account.requirements?.eventually_due || []).forEach((req) => currentMissingFields.push(`Benötigt (später): ${translateStripeRequirement(req)}`));
        if (!account.details_submitted && currentMissingFields.length === 0 && (account.requirements?.currently_due?.length === 0)) {
            currentMissingFields.push("Allgemeine Kontodetails bei Stripe vervollständigen oder initiale Anforderungen prüfen.");
        }
        if (account.requirements?.errors && account.requirements.errors.length > 0) {
            account.requirements.errors.forEach((err) => {
                currentMissingFields.push(`Fehler von Stripe: ${err.reason} (betrifft: ${translateStripeRequirement(err.requirement)})`);
            });
        }
        const uniqueMissingFields = [...new Set(currentMissingFields)];
        let accountLinkUrl = undefined;
        const needsStripeUIIntervention = (account.requirements?.errors?.length ?? 0) > 0 ||
            ((account.requirements?.currently_due?.length ?? 0) > 0 && !account.charges_enabled);
        if (needsStripeUIIntervention) {
            try {
                const accLinkParams = {
                    account: stripeAccountId,
                    // Hier die Emulator-Callback-URL für Account Links verwenden
                    refresh_url: `${emulatorCallbackFrontendURL}/dashboard/company/${userId}/settings?stripe_refresh=true`,
                    return_url: `${emulatorCallbackFrontendURL}/dashboard/company/${userId}/settings?stripe_return=true`,
                    type: "account_update",
                    collect: "currently_due",
                };
                const accLink = await localStripe.accountLinks.create(accLinkParams);
                accountLinkUrl = accLink.url;
            }
            catch (linkError) {
                v2_1.logger.error(`[getStripeAccountStatus] Fehler Account Link für ${stripeAccountId}:`, { message: linkError.message, type: linkError.type });
            }
        }
        return {
            success: true,
            accountId: account.id,
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            requirements: account.requirements || null,
            accountLinkUrl: accountLinkUrl,
            missingFields: uniqueMissingFields
        };
    }
    catch (e) {
        v2_1.logger.error(`Fehler getStripeAccountStatus für ${userId}:`, { message: e.message, code: e.code, type: e.type });
        if (e.code === "resource_missing" && e.param === "account") {
            try {
                await helpers_1.db.collection("users").doc(userId).update({ stripeAccountId: firestore_1.FieldValue.delete(), stripeAccountError: "Stripe-Konto nicht gefunden." });
            }
            catch (dbErr) {
                v2_1.logger.error("Fehler Löschen ungültige Stripe ID:", dbErr.message);
            }
            return {
                success: false, message: "Zugehöriges Stripe-Konto nicht gefunden.",
                accountId: null,
                detailsSubmitted: null,
                chargesEnabled: null,
                payoutsEnabled: null,
                requirements: null, accountLinkUrl: undefined,
                missingFields: ["Stripe-Konto nicht gefunden."]
            };
        }
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError("internal", e.message || "Fehler Abruf Stripe-Status.", e.details);
    }
});
//# sourceMappingURL=callable_stripe.js.map