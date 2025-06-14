"use strict";
// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_firestore.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripeCustomAccountOnUserUpdate = exports.updateUserProfile = exports.createUserProfile = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const helpers_1 = require("./helpers");
const firestore_2 = require("firebase-admin/firestore");
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
            companyName: userData.companyName || "Unbenanntes Unternehmen",
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
        Object.keys(companyData).forEach((key) => {
            if (companyData[key] === undefined || companyData[key] === "") {
                companyData[key] = null;
            }
        });
        if (companyData.hourlyRate !== null && isNaN(companyData.hourlyRate))
            companyData.hourlyRate = null;
        if (companyData.radiusKm !== null && isNaN(companyData.radiusKm))
            companyData.radiusKm = null;
        if (companyData.lat !== null && isNaN(Number(companyData.lat)))
            companyData.lat = null;
        if (companyData.lng !== null && isNaN(Number(companyData.lng)))
            companyData.lng = null;
        v2_1.logger.info(`[createUserProfile] Schreibe companyData-Objekt für ${userId}:`, JSON.stringify(companyData, null, 2));
        try {
            await db.collection("companies").doc(userId).set(companyData, { merge: true });
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
        Object.keys(companyDataUpdate).forEach((key) => {
            if (companyDataUpdate[key] === undefined || companyDataUpdate[key] === "") {
                companyDataUpdate[key] = null;
            }
        });
        if (companyDataUpdate.hourlyRate !== null && isNaN(companyDataUpdate.hourlyRate))
            companyDataUpdate.hourlyRate = null;
        if (companyDataUpdate.radiusKm !== null && isNaN(companyDataUpdate.radiusKm))
            companyDataUpdate.radiusKm = null;
        if (companyDataUpdate.lat !== null && isNaN(Number(companyDataUpdate.lat)))
            companyDataUpdate.lat = null;
        if (companyDataUpdate.lng !== null && isNaN(Number(companyDataUpdate.lng)))
            companyDataUpdate.lng = null;
        v2_1.logger.info(`[updateUserProfile] Schreibe companyDataUpdate-Objekt für ${userId}:`, JSON.stringify(companyDataUpdate, null, 2));
        try {
            await db.collection("companies").doc(userId).set(companyDataUpdate, { merge: true });
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
    const localStripe = (0, helpers_1.getStripeInstance)();
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
    const userEmail = after.email || after.step1?.email;
    const companyCountryFromData = after.companyCountryForBackend || after.step2?.country;
    const companyPostalCodeFromData = after.companyPostalCodeForBackend || after.step2?.postalCode;
    const companyCityFromData = after.companyCityForBackend || after.step2?.city;
    const companyAddressLine1 = after.companyAddressLine1ForBackend || `${after.step2?.street || ""} ${after.step2?.houseNumber || ""}`.trim();
    const companyNameFromData = after.companyName || after.step2?.companyName;
    const companyPhoneFromData = after.companyPhoneNumberForBackend || after.step1?.phoneNumber;
    const companyWebsiteFromData = after.companyWebsiteForBackend || after.step2?.website;
    const industryMccFromData = after.industryMcc;
    const ibanFromData = after.iban || after.step4?.iban;
    const accountHolderFromData = after.accountHolder || after.step4?.accountHolder;
    const taxIdFromData = after.taxNumberForBackend || after.step3?.taxNumber;
    const vatIdFromData = after.vatIdForBackend || after.step3?.vatId;
    const companyRegisterFromData = after.companyRegisterForBackend || after.step3?.companyRegister;
    const firstNameFromData = after.firstName || after.step1?.firstName;
    const lastNameFromData = after.lastName || after.step1?.lastName;
    const phoneFromData = after.phoneNumber || after.step1?.phoneNumber;
    const dobFromData = after.dateOfBirth || after.step1?.dateOfBirth;
    const personalStreetFromData = after.personalStreet || after.step1?.personalStreet;
    const personalHouseNumberFromData = after.personalHouseNumber || after.step1?.personalHouseNumber;
    const personalPostalCodeFromData = after.personalPostalCode || after.step1?.personalPostalCode;
    const personalCityFromData = after.personalCity || after.step1?.personalCity;
    const personalCountryFromData = after.personalCountry || after.step1?.personalCountry;
    const isManagingDirectorOwnerFromData = after.isManagingDirectorOwner ?? after.step1?.isManagingDirectorOwner ?? false;
    const identityFrontStripeId = after.identityFrontUrlStripeId || after.step3?.identityFrontUrl;
    const identityBackStripeId = after.identityBackUrlStripeId || after.step3?.identityBackUrl;
    const clientIp = after.common?.tosAcceptanceIp;
    const userAgent = after.common?.tosAcceptanceUserAgent || "UserAgentNotProvidedInFirestoreTrigger";
    const requiredFields = after.user_type === "firma" &&
        userEmail &&
        firstNameFromData && lastNameFromData &&
        companyNameFromData && companyAddressLine1 &&
        companyCityFromData && companyPostalCodeFromData && companyCountryFromData &&
        (taxIdFromData || vatIdFromData || companyRegisterFromData) &&
        ibanFromData && accountHolderFromData &&
        clientIp &&
        !["FALLBACK_IP_ADDRESS", "IP_NOT_DETERMINED", "NEEDS_REAL_USER_IP", "8.8.8.8", "127.0.0.1", "::1"].includes(clientIp);
    if (!requiredFields) {
        v2_1.logger.info(`${userId} ist nicht Firma oder es fehlen wichtige Daten/gültige IP für den Fallback Stripe Account Creation Trigger. Details: userEmail=${!!userEmail}, firstName=${!!firstNameFromData}, lastName=${!!lastNameFromData}, companyName=${!!companyNameFromData}, companyAddressLine1=${!!companyAddressLine1}, companyCity=${!!companyCityFromData}, companyPostalCode=${!!companyPostalCodeFromData}, companyCountry=${!!companyCountryFromData}, tax/vat/register=${!!(taxIdFromData || vatIdFromData || companyRegisterFromData)}, iban=${!!ibanFromData}, accountHolder=${!!accountHolderFromData}, clientIp=${clientIp}`);
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