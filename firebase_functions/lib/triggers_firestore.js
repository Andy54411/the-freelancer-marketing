"use strict";
// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_firestore.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripeCustomAccountOnUserUpdate = exports.updateUserProfile = exports.createUserProfile = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const helpers_1 = require("./helpers");
const firestore_2 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const constants_1 = require("./constants");
// Parameter zentral definieren
const STRIPE_SECRET_KEY_TRIGGERS = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
// Helper function to clean and normalize company data before writing to Firestore.
const cleanAndNormalizeCompanyData = (data) => {
    const cleanedData = { ...data };
    Object.keys(cleanedData).forEach((key) => {
        if (cleanedData[key] === undefined || cleanedData[key] === "") {
            cleanedData[key] = null;
        }
    });
    if (cleanedData.hourlyRate !== null && isNaN(cleanedData.hourlyRate))
        cleanedData.hourlyRate = null;
    if (cleanedData.radiusKm !== null && isNaN(cleanedData.radiusKm))
        cleanedData.radiusKm = null;
    if (cleanedData.lat !== null && isNaN(Number(cleanedData.lat)))
        cleanedData.lat = null;
    if (cleanedData.lng !== null && isNaN(Number(cleanedData.lng)))
        cleanedData.lng = null;
    return cleanedData;
};
exports.createUserProfile = (0, firestore_1.onDocumentCreated)("users/{userId}", async (event) => {
    const snapshot = event.data;
    const userId = event.params.userId;
    if (!snapshot || !snapshot.data) {
        v2_1.logger.warn(`[createUserProfile] User data for ${userId} is undefined. Skipping.`);
        return null;
    }
    const db = (0, helpers_1.getDb)();
    const userData = snapshot.data();
    v2_1.logger.info(`[createUserProfile Trigger] Verarbeite User ${userId}. Quelldaten (userData):`, JSON.stringify(userData, null, 2));
    if (userData.user_type === "firma") {
        const companyData = {
            uid: userId,
            user_type: "firma",
            companyName: userData.companyName || constants_1.UNNAMED_COMPANY,
            postalCode: userData.companyPostalCodeForBackend || null,
            companyCity: userData.companyCityForBackend || null,
            selectedCategory: userData.selectedCategory || null,
            selectedSubcategory: userData.selectedSubcategory || null,
            stripeAccountId: userData.stripeAccountId || null, // HINZUGEFÜGT
            hourlyRate: Number(userData.hourlyRate) || null,
            lat: userData.lat ?? null,
            lng: userData.lng ?? null,
            radiusKm: Number(userData.radiusKm) || null,
            profilePictureURL: userData.profilePictureFirebaseUrl || null,
            industryMcc: userData.industryMcc || null,
            description: userData.description || "",
            createdAt: firestore_2.FieldValue.serverTimestamp(),
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
            profileLastUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
        };
        const finalCompanyData = cleanAndNormalizeCompanyData(companyData);
        v2_1.logger.info(`[createUserProfile] Schreibe companyData-Objekt für ${userId}:`, JSON.stringify(finalCompanyData, null, 2));
        try {
            await db.collection("companies").doc(userId).set(finalCompanyData, { merge: true });
            v2_1.logger.info(`[createUserProfile] Company-Dokument für ${userId} erstellt/gemerged.`);
        }
        catch (error) {
            v2_1.logger.error(`[createUserProfile] Fehler bei Company-Dokument für ${userId}:`, error.message, error);
        }
    }
    return null;
});
exports.updateUserProfile = (0, firestore_1.onDocumentUpdated)("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const snapshotAfter = event.data?.after;
    if (!snapshotAfter) {
        v2_1.logger.warn(`[updateUserProfile] Kein Daten-Snapshot nach Update für User ${userId}. Abbruch.`);
        return null;
    }
    const db = (0, helpers_1.getDb)();
    const userData = snapshotAfter.data();
    if (typeof userData !== "object" || userData === null) {
        v2_1.logger.warn(`[updateUserProfile] Userdaten für ${userId} nach Update ungültig. Abbruch.`);
        return null;
    }
    v2_1.logger.info(`[updateUserProfile Trigger] Verarbeite User ${userId}. Quelldaten (userData):`, JSON.stringify(userData, null, 2));
    if (userData.user_type === "firma") {
        const companyDataUpdate = {
            uid: userId,
            user_type: "firma",
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
            profileLastUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
            companyName: userData.companyName || null,
            postalCode: userData.companyPostalCodeForBackend || null,
            companyCity: userData.companyCityForBackend || null,
            selectedCategory: userData.selectedCategory || null,
            selectedSubcategory: userData.selectedSubcategory || null,
            stripeAccountId: userData.stripeAccountId || null, // HINZUGEFÜGT
            hourlyRate: Number(userData.hourlyRate) || null,
            lat: userData.lat ?? null,
            lng: userData.lng ?? null,
            radiusKm: Number(userData.radiusKm) || null,
            profilePictureURL: userData.profilePictureFirebaseUrl || null,
            industryMcc: userData.industryMcc || null,
            description: userData.description || "",
        };
        const companyDocBefore = await db.collection("companies").doc(userId).get();
        if (companyDocBefore.exists && companyDocBefore.data()?.createdAt) {
            companyDataUpdate.createdAt = companyDocBefore.data()?.createdAt;
        }
        else if (userData.createdAt) {
            companyDataUpdate.createdAt = userData.createdAt;
        }
        else {
            if (!companyDataUpdate.createdAt && !companyDocBefore.exists) {
                companyDataUpdate.createdAt = firestore_2.FieldValue.serverTimestamp();
            }
        }
        const finalCompanyDataUpdate = cleanAndNormalizeCompanyData(companyDataUpdate);
        v2_1.logger.info(`[updateUserProfile] Schreibe companyDataUpdate-Objekt für ${userId}:`, JSON.stringify(finalCompanyDataUpdate, null, 2));
        try {
            await db.collection("companies").doc(userId).set(finalCompanyDataUpdate, { merge: true });
            v2_1.logger.info(`[updateUserProfile] Company-Dokument für ${userId} aktualisiert.`);
        }
        catch (error) {
            v2_1.logger.error(`[updateUserProfile] Fehler Company-Dokument für ${userId}:`, error.message, error);
        }
    }
    else {
        v2_1.logger.info(`[updateUserProfile] User ${userId} Typ '${userData.user_type}', kein Update für companies Dokument.`);
    }
    return null;
});
exports.createStripeCustomAccountOnUserUpdate = (0, firestore_1.onDocumentUpdated)("users/{userId}", async (event) => {
    const userId = event.params.userId;
    v2_1.logger.info(`Firestore Trigger 'createStripeCustomAccountOnUserUpdate' (V2) für ${userId}.`);
    const db = (0, helpers_1.getDb)();
    // Die Logik für den Emulator-Modus wird von defineSecret gehandhabt,
    // daher ist keine manuelle isEmulated-Prüfung mehr nötig.
    const stripeKey = STRIPE_SECRET_KEY_TRIGGERS.value();
    const localStripe = (0, helpers_1.getStripeInstance)(stripeKey);
    const after = event.data?.after.data();
    if (!after) {
        v2_1.logger.warn(`Keine Daten nach Update für ${userId}.`);
        return null;
    }
    if (after.stripeAccountId && after.common?.createdByCallable === "true") {
        v2_1.logger.info(`${userId} hat bereits Stripe-Konto via Callable erstellt. Fallback-Trigger bricht ab.`);
        return null;
    }
    if (after.stripeAccountId && after.common?.createdByCallable !== "true") {
        v2_1.logger.info(`${userId} hat bereits eine Stripe-Konto ID (${after.stripeAccountId}), aber nicht via Callable. Fallback-Trigger bricht ab.`);
        return null;
    }
    // Helper to pick the first non-empty value from a list of potential sources.
    const pickFirst = (...args) => args.find(v => v) || undefined;
    const userEmail = pickFirst(after.email, after.step1?.email);
    const companyCountryFromData = pickFirst(after.companyCountryForBackend, after.step2?.country);
    const companyPostalCodeFromData = pickFirst(after.companyPostalCodeForBackend, after.step2?.postalCode);
    const companyCityFromData = pickFirst(after.companyCityForBackend, after.step2?.city);
    const companyAddressLine1 = pickFirst(after.companyAddressLine1ForBackend, `${after.step2?.street || ""} ${after.step2?.houseNumber || ""}`.trim());
    const companyNameFromData = pickFirst(after.companyName, after.step2?.companyName);
    const companyPhoneFromData = pickFirst(after.companyPhoneNumberForBackend, after.step1?.phoneNumber);
    const companyWebsiteFromData = pickFirst(after.companyWebsiteForBackend, after.step2?.website);
    const industryMccFromData = pickFirst(after.industryMcc);
    const ibanFromData = pickFirst(after.iban, after.step4?.iban);
    const accountHolderFromData = pickFirst(after.accountHolder, after.step4?.accountHolder);
    const taxIdFromData = pickFirst(after.taxNumberForBackend, after.step3?.taxNumber);
    const vatIdFromData = pickFirst(after.vatIdForBackend, after.step3?.vatId);
    const companyRegisterFromData = pickFirst(after.companyRegisterForBackend, after.step3?.companyRegister);
    const firstNameFromData = pickFirst(after.firstName, after.step1?.firstName);
    const lastNameFromData = pickFirst(after.lastName, after.step1?.lastName);
    const phoneFromData = pickFirst(after.phoneNumber, after.step1?.phoneNumber);
    const dobFromData = pickFirst(after.dateOfBirth, after.step1?.dateOfBirth);
    const personalStreetFromData = pickFirst(after.personalStreet, after.step1?.personalStreet);
    const personalHouseNumberFromData = pickFirst(after.personalHouseNumber, after.step1?.personalHouseNumber);
    const personalPostalCodeFromData = pickFirst(after.personalPostalCode, after.step1?.personalPostalCode);
    const personalCityFromData = pickFirst(after.personalCity, after.step1?.personalCity);
    const personalCountryFromData = pickFirst(after.personalCountry, after.step1?.personalCountry);
    const isManagingDirectorOwnerFromData = after.isManagingDirectorOwner ?? after.step1?.isManagingDirectorOwner ?? false;
    const identityFrontStripeId = pickFirst(after.identityFrontUrlStripeId, after.step3?.identityFrontUrl);
    const identityBackStripeId = pickFirst(after.identityBackUrlStripeId, after.step3?.identityBackUrl);
    const clientIp = after.common?.tosAcceptanceIp;
    const userAgent = after.common?.tosAcceptanceUserAgent || "UserAgentNotProvidedInFirestoreTrigger";
    const validationChecks = {
        isCompany: after.user_type === "firma",
        hasContactDetails: !!userEmail && !!firstNameFromData && !!lastNameFromData,
        hasCompanyDetails: !!companyNameFromData && !!companyAddressLine1 && !!companyCityFromData && !!companyPostalCodeFromData && !!companyCountryFromData,
        hasTaxInfo: !!(taxIdFromData || vatIdFromData || companyRegisterFromData),
        hasBankDetails: !!ibanFromData && !!accountHolderFromData,
        hasValidIp: !!clientIp && !["FALLBACK_IP_ADDRESS", "IP_NOT_DETERMINED", "NEEDS_REAL_USER_IP", "8.8.8.8", "127.0.0.1", "::1"].includes(clientIp),
    };
    const allChecksPassed = Object.values(validationChecks).every(Boolean);
    if (!allChecksPassed) {
        v2_1.logger.info(`${userId} erfüllt nicht alle Bedingungen für den Fallback Stripe Account Creation Trigger. Status:`, { ...validationChecks, clientIp: clientIp } // Log validation status and the IP for context
        );
        return null;
    }
    try {
        const accountParams = {
            type: "custom", country: companyCountryFromData, email: userEmail,
            business_type: "company",
            company: {
                name: companyNameFromData,
                tax_id: companyRegisterFromData || taxIdFromData || undefined,
                vat_id: vatIdFromData || undefined,
                phone: companyPhoneFromData || undefined,
                address: {
                    line1: companyAddressLine1, city: companyCityFromData,
                    postal_code: companyPostalCodeFromData, country: companyCountryFromData,
                },
            },
            business_profile: {
                url: companyWebsiteFromData || undefined,
                mcc: industryMccFromData || undefined,
            },
            external_account: {
                object: "bank_account", country: companyCountryFromData, currency: "eur",
                account_number: (ibanFromData).replace(/\s/g, ""),
                account_holder_name: (accountHolderFromData),
            },
            tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: clientIp, user_agent: userAgent },
            capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
            metadata: { internal_user_id: userId, created_by: "firestore_trigger_fallback" },
        };
        const account = await localStripe.accounts.create(accountParams);
        if (firstNameFromData && lastNameFromData) {
            const personPayload = {
                first_name: firstNameFromData,
                last_name: lastNameFromData,
                email: userEmail,
                phone: phoneFromData || undefined,
                relationship: {
                    representative: true,
                    owner: isManagingDirectorOwnerFromData,
                    director: isManagingDirectorOwnerFromData,
                },
            };
            if (dobFromData) {
                const [year, month, day] = dobFromData.split('-').map(Number);
                if (day && month && year)
                    personPayload.dob = { day, month, year };
            }
            if (personalStreetFromData && personalCityFromData && personalPostalCodeFromData && personalCountryFromData) {
                personPayload.address = {
                    line1: `${personalStreetFromData} ${personalHouseNumberFromData || ''}`.trim(),
                    city: personalCityFromData,
                    postal_code: personalPostalCodeFromData,
                    country: personalCountryFromData ? personalCountryFromData : undefined,
                };
            }
            if (identityFrontStripeId || identityBackStripeId) {
                personPayload.verification = { document: {} };
                if (identityFrontStripeId && personPayload.verification.document)
                    personPayload.verification.document.front = identityFrontStripeId;
                if (identityBackStripeId && personPayload.verification.document)
                    personPayload.verification.document.back = identityBackStripeId;
            }
            const person = await localStripe.accounts.createPerson(account.id, personPayload);
            await db.collection("users").doc(userId).update({ stripeRepresentativePersonId: person.id });
        }
        v2_1.logger.info(`Stripe Custom Account (Trigger Fallback) für ${userId} erstellt: ${account.id}`);
        await db.collection("users").doc(userId).update({
            stripeAccountId: account.id,
            stripeAccountDetailsSubmitted: account.details_submitted,
            stripeAccountCreationDate: firestore_2.FieldValue.serverTimestamp(),
            stripeAccountError: firestore_2.FieldValue.delete(),
        });
        return null;
    }
    catch (error) {
        v2_1.logger.error(`Fehler Erstellung Stripe Account (Trigger Fallback) für ${userId}:`, error.message, error);
        await db.collection("users").doc(userId).update({
            stripeAccountError: error instanceof Error ? error.message : String(error.toString()),
        }).catch((dbErr) => v2_1.logger.error(`DB-Fehler Speichern Stripe-Fehler (Trigger Fallback) für ${userId}:`, dbErr.message, dbErr));
        return null;
    }
});
//# sourceMappingURL=triggers_firestore.js.map