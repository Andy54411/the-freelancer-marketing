import { onRequest } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb, FieldValue, getUserDisplayName, getAuthInstance } from './helpers'; // FieldValue import is correct
import { UNKNOWN_PROVIDER_NAME, UNNAMED_COMPANY } from './constants';
import { geohashForLocation } from 'geofire-common';

export const migrateExistingUsersToCompanies = onRequest({ region: "europe-west1", cors: true, timeoutSeconds: 540, memory: "1GiB", cpu: 1 }, async (req, res) => {
  // --- NEU: Authentifizierung und Autorisierung ---
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    loggerV2.warn("[migrateExistingUsersToCompanies] Unauthenticated access attempt.");
    res.status(403).send('Unauthorized');
    return;
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedToken = await getAuthInstance().verifyIdToken(idToken);
    if (decodedToken.role !== 'master') {
      loggerV2.error(`[migrateExistingUsersToCompanies] Forbidden access attempt by user ${decodedToken.uid} with role ${decodedToken.role}.`);
      res.status(403).send('Forbidden: Insufficient permissions.');
      return;
    }
    loggerV2.info(`[migrateExistingUsersToCompanies] Authorized execution by master user ${decodedToken.uid}.`);
  } catch (error) {
    loggerV2.error("[migrateExistingUsersToCompanies] Token verification failed.", error);
    res.status(403).send('Unauthorized');
    return;
  }
  // --- ENDE: Authentifizierung und Autorisierung ---
  const db = getDb();
  try {
    // Query only for 'firma' users to make it more efficient
    const usersSnapshot = await db.collection("users").where("user_type", "==", "firma").get();
    if (usersSnapshot.empty) {
      res.status(200).send("No 'firma' users found to migrate.");
      return;
    }
    let migratedCount = 0;
    let batch = db.batch();
    let writeCountInBatch = 0;

    // Helper to find the first non-empty, non-null value from a list of potential sources.
    const pickFirst = <T>(...args: (T | null | undefined)[]) => args.find((v) => v) ?? null;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // --- Robust data sourcing logic (from triggers_firestore.ts) ---
      const lat = pickFirst(userData.lat);
      const lng = pickFirst(userData.lng);
      let geohash: string | null = null;
      if (typeof lat === 'number' && typeof lng === 'number') {
        geohash = geohashForLocation([lat, lng]);
      }

      const postalCode = pickFirst(userData.companyPostalCodeForBackend, userData.step2?.postalCode, userData.step2?.companyPostalCode);
      const companyName = pickFirst(userData.companyName, userData.step2?.companyName) || UNNAMED_COMPANY;
      const companyCity = pickFirst(userData.companyCityForBackend, userData.step2?.city);
      const hourlyRate = pickFirst(userData.hourlyRate, userData.step3?.hourlyRate);
      const profilePictureURL = pickFirst(userData.profilePictureFirebaseUrl, userData.step3?.profilePictureURL);
      const industryMcc = pickFirst(userData.industryMcc, userData.step2?.industryMcc);
      // --- End of robust data sourcing logic ---

      const companyData = {
        uid: userId,
        user_type: "firma",
        companyName: companyName,
        postalCode: postalCode, // For display purposes
        companyPostalCodeForBackend: postalCode, // For querying
        companyCity: companyCity,
        selectedCategory: userData.selectedCategory || null,
        selectedSubcategory: userData.selectedSubcategory || null,
        stripeAccountId: userData.stripeAccountId || null,
        hourlyRate: Number(hourlyRate) || null,
        lat: lat,
        lng: lng,
        radiusKm: Number(userData.radiusKm) || null,
        geohash: geohash,
        profilePictureURL: profilePictureURL,
        industryMcc: industryMcc,
        description: userData.description || "",
        createdAt: userData.createdAt || FieldValue.serverTimestamp(), // Preserve original creation date
        updatedAt: FieldValue.serverTimestamp(), // Always set a fresh update timestamp
        profileLastUpdatedAt: userData.profileLastUpdatedAt || FieldValue.serverTimestamp(),
      };

      const companyRef = db.collection("users").doc(userId);
      batch.set(companyRef, companyData, { merge: true });
      migratedCount++;
      writeCountInBatch++;

      if (writeCountInBatch >= 400) {
        await batch.commit();
        loggerV2.info(`Committed a batch of ${writeCountInBatch} migrations.`);
        batch = db.batch();
        writeCountInBatch = 0;
      }
    }
    if (writeCountInBatch > 0) {
      await batch.commit();
      loggerV2.info(`Committed the final batch of ${writeCountInBatch} migrations.`);
    }
    res.status(200).send(`Successfully migrated/updated ${migratedCount} company profiles.`);
  } catch (e) {
    loggerV2.error("Migration failed:", e);
    res.status(500).send("Migration failed.");
  }
});

export const searchCompanyProfiles = onRequest({ region: "europe-west1", cors: true }, async (req, res) => {
  const db = getDb();
  try { // <-- This try-catch block is already present, which is good. No changes needed here.
    const { id, postalCode, selectedSubcategory, minPrice, maxPrice, geohash } = req.query as { [key: string]: string | undefined };

    // --- Hinzugefügtes, detailliertes Logging ---
    loggerV2.info("[searchCompanyProfiles] Suche gestartet mit Parametern:", {
      id, postalCode, selectedSubcategory, minPrice, maxPrice, geohash,
    });
    // --- Ende Logging ---

    if (id && typeof id === "string") {
      const companyDoc = await db.collection("users").doc(id).get();
      if (!companyDoc.exists) {
        res.status(404).json({ message: "Anbieter nicht gefunden" });
        return;
      }
      const companyData = companyDoc.data()!;
      res.status(200).json({
        // WICHTIG: Hier werden die Daten für die Detailansicht eines Anbieters zurückgegeben.
        id: companyDoc.id,
        companyName: companyData.companyName || companyData.firmenname,
        profilePictureURL: companyData.profilePictureURL || companyData.profilePictureFirebaseUrl,
        hourlyRate: companyData.hourlyRate,
        description: companyData.description,
        stripeAccountId: companyData.stripeAccountId,
      });
      return;
    }

    // --- Hinzugefügtes Logging für den Such-Fall ---
    if (!postalCode) loggerV2.warn("[searchCompanyProfiles] Warnung: Suche ohne 'postalCode' durchgeführt.");
    if (!selectedSubcategory) loggerV2.warn("[searchCompanyProfiles] Warnung: Suche ohne 'selectedSubcategory' durchgeführt.");
    // --- Ende Logging ---

    if (!postalCode || !selectedSubcategory) {
      res.status(400).send("Fehlende Parameter: postalCode und selectedSubcategory sind erforderlich.");
      return;
    }

    // KORREKTUR: Die Abfrage wird effizienter und zuverlässiger gestaltet.
    // Wir fügen `where("user_type", "==", "firma")` hinzu, um sicherzustellen, dass wir nur aktive
    // Firmenkonten abrufen. Dies macht die zweite Abfrage der 'users'-Collection überflüssig,
    // was die Funktion beschleunigt und die Komplexität reduziert.
    let query: FirebaseFirestore.Query = db.collection("users");

    // Wende die obligatorischen Filter an.
    query = query
      .where("user_type", "==", "firma") // Stellt sicher, dass es sich um ein Firmenprofil handelt.
      .where("companyPostalCodeForBackend", "==", postalCode as string) // KORREKTUR: Das Feld 'postalCode' existiert nicht. Verwende das korrekte Feld 'companyPostalCodeForBackend'.
      .where("selectedSubcategory", "==", selectedSubcategory as string);

    // Wende die optionalen Preisfilter an.
    const numMinPrice = Number(minPrice);
    const numMaxPrice = Number(maxPrice);
    if (!isNaN(numMinPrice) && minPrice !== undefined) query = query.where("hourlyRate", ">=", numMinPrice);
    if (!isNaN(numMaxPrice) && maxPrice !== undefined) query = query.where("hourlyRate", "<=", numMaxPrice);

    const querySnapshot = await query.get();
    if (querySnapshot.empty) {
      // --- Hinzugefügtes Logging für den "Nichts gefunden"-Fall ---
      loggerV2.warn(`[searchCompanyProfiles] Keine Profile für die Abfrage gefunden.`, { postalCode, selectedSubcategory, minPrice, maxPrice });
      // --- Ende Logging ---
      res.status(200).json([]);
      return;
    }

    const profiles = querySnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          // WICHTIG: Dies ist die Struktur für die Ergebnisliste
          id: doc.id,
          companyName: getUserDisplayName(data, UNKNOWN_PROVIDER_NAME),
          profilePictureURL: data.profilePictureURL || data.profilePictureFirebaseUrl,
          hourlyRate: data.hourlyRate,
          description: data.description,
          stripeAccountId: data.stripeAccountId,
        };
      });

    // --- Hinzugefügtes Logging für erfolgreiche Suche ---
    loggerV2.info(`[searchCompanyProfiles] ${profiles.length} Profile gefunden und zurückgegeben.`);
    // --- Ende Logging ---

    res.status(200).json(profiles);

  } catch (e: any) {
    loggerV2.error("Error searching company profiles:", e);
    res.status(500).send("Error searching company profiles.");
  }
});

export const getDataForSubcategory = onRequest({ region: "europe-west1", cors: true }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const subcategory = req.query.subcategory as string;
  if (!subcategory) {
    res.status(400).send("Missing param: subcategory.");
    return;
  }
  const db = getDb();
  try {
    const companiesRef = db
      .collection("users")
      .where("selectedSubcategory", "==", subcategory)
      .where("user_type", "==", "firma");
    const snapshot = await companiesRef.get();
    if (snapshot.empty) {
      res.status(200).json({
        averagePrice: null,
        minPossiblePriceInSubcategory: null,
        maxPossiblePriceInSubcategory: null,
        distribution: [],
      });
      return;
    }
    const prices: number[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data && typeof data.hourlyRate === "number" && !isNaN(data.hourlyRate) && data.hourlyRate > 0) prices.push(data.hourlyRate);
    });
    if (prices.length === 0) {
      res.status(200).json({
        averagePrice: null,
        minPossiblePriceInSubcategory: null,
        maxPossiblePriceInSubcategory: null,
        distribution: [],
      });
      return;
    }
    const sum = prices.reduce((a, p) => a + p, 0);
    const averagePrice = parseFloat((sum / prices.length).toFixed(2));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const distributionData: { range: string; count: number }[] = [];
    if (prices.length > 0) {
      if (minPrice === maxPrice) {
        distributionData.push({ range: `${minPrice.toFixed(0)}`, count: prices.length });
      } else {
        const numBuckets = Math.min(5, prices.length);
        const rangeVal = maxPrice - minPrice;
        const bucketWidth = rangeVal > 0 ? rangeVal / numBuckets : 1;
        for (let i = 0; i < numBuckets; i++) {
          const start = minPrice + i * bucketWidth;
          const end = i === numBuckets - 1 ? maxPrice : minPrice + (i + 1) * bucketWidth;
          const count = prices.filter((p) => p >= start && (i === numBuckets - 1 ? p <= end : p < end)).length;
          if (count > 0) distributionData.push({ range: `${Math.floor(start)}-${Math.ceil(end)}`, count });
        }
      }
    }
    res.status(200).json({
      averagePrice,
      minPossiblePriceInSubcategory: minPrice,
      maxPossiblePriceInSubcategory: maxPrice,
      distribution: distributionData,
    });
  } catch (error) {
    loggerV2.error("Error processing subcategory data:", error);
    res.status(500).send("Error processing subcategory data.");
  }
});

export const syncCompanyToUserData = onRequest({ region: "europe-west1", cors: true, timeoutSeconds: 540, memory: "1GiB", cpu: 1 }, async (req, res) => {
  // --- Authentication and Authorization ---
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    loggerV2.warn("[syncCompanyToUserData] Unauthenticated access attempt.");
    res.status(403).send('Unauthorized');
    return;
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedToken = await getAuthInstance().verifyIdToken(idToken);
    if (decodedToken.role !== 'master') {
      loggerV2.error(`[syncCompanyToUserData] Forbidden access attempt by user ${decodedToken.uid} with role ${decodedToken.role}.`);
      res.status(403).send('Forbidden: Insufficient permissions.');
      return;
    }
    loggerV2.info(`[syncCompanyToUserData] Authorized execution by master user ${decodedToken.uid}.`);
  } catch (error) {
    loggerV2.error("[syncCompanyToUserData] Token verification failed.", error);
    res.status(403).send('Unauthorized');
    return;
  }
  // --- END: Authentication and Authorization ---

  const db = getDb();
  try {
    // Get specific companyId from query params if provided
    const companyId = req.query.companyId as string;
    
    let companiesSnapshot;
    if (companyId) {
      // Sync specific company
      const companyDoc = await db.collection("users").doc(companyId).get();
      if (!companyDoc.exists) {
        res.status(404).send(`Company with ID ${companyId} not found.`);
        return;
      }
      companiesSnapshot = { docs: [companyDoc], empty: false };
    } else {
      // Sync all companies
      companiesSnapshot = await db.collection("users").where("user_type", "==", "firma").get();
    }

    if (companiesSnapshot.empty) {
      res.status(200).send("No companies found to sync.");
      return;
    }

    let syncedCount = 0;
    let batch = db.batch();
    let writeCountInBatch = 0;

    for (const companyDoc of companiesSnapshot.docs) {
      const companyData = companyDoc.data();
      const companyUid = companyDoc.id;

      if (!companyData) {
        loggerV2.warn(`[syncCompanyToUserData] Company document ${companyUid} has no data. Skipping.`);
        continue;
      }

      // Check if corresponding user document exists
      const userDocRef = db.collection("users").doc(companyUid);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        loggerV2.warn(`[syncCompanyToUserData] User document ${companyUid} does not exist. Skipping.`);
        continue;
      }

      // Prepare user data update with company data
      const userDataUpdate: Record<string, unknown> = {
        // Basic company info
        companyName: companyData.companyName || null,
        description: companyData.description || null,
        hourlyRate: companyData.hourlyRate || null,
        selectedCategory: companyData.selectedCategory || null,
        selectedSubcategory: companyData.selectedSubcategory || null,
        
        // Location data
        lat: companyData.lat || null,
        lng: companyData.lng || null,
        radiusKm: companyData.radiusKm || null,
        companyPostalCodeForBackend: companyData.companyPostalCodeForBackend || companyData.postalCode || null,
        companyCityForBackend: companyData.companyCityForBackend || companyData.companyCity || null,
        companyCountryForBackend: companyData.companyCountryForBackend || null,
        
        // Contact and business info
        companyPhoneNumberForBackend: companyData.companyPhoneNumberForBackend || null,
        companyWebsiteForBackend: companyData.companyWebsiteForBackend || null,
        
        // Profile and media
        profilePictureFirebaseUrl: companyData.profilePictureURL || companyData.profilePictureFirebaseUrl || null,
        profilePictureURL: companyData.profilePictureURL || companyData.profilePictureFirebaseUrl || null,
        
        // Business details from step2
        'step2.companyName': companyData.companyName || null,
        'step2.description': companyData.description || null,
        'step2.city': companyData.companyCity || companyData.companyCityForBackend || null,
        'step2.country': companyData.companyCountryForBackend || null,
        'step2.industryMcc': companyData.industryMcc || null,
        
        // Technical details from step3  
        'step3.hourlyRate': companyData.hourlyRate ? String(companyData.hourlyRate) : null,
        'step3.profilePictureURL': companyData.profilePictureURL || companyData.profilePictureFirebaseUrl || null,
        
        // Stripe and verification data
        stripeAccountId: companyData.stripeAccountId || null,
        stripeChargesEnabled: companyData.stripeChargesEnabled || false,
        stripePayoutsEnabled: companyData.stripePayoutsEnabled || false,
        stripeDetailsSubmitted: companyData.stripeDetailsSubmitted || false,
        stripeVerificationStatus: companyData.stripeVerificationStatus || null,
        
        // Additional profile data
        specialties: companyData.specialties || null,
        portfolio: companyData.portfolio || null,
        skills: companyData.skills || null,
        languages: companyData.languages || null,
        education: companyData.education || null,
        certifications: companyData.certifications || null,
        
        // Metrics and performance
        responseTime: companyData.responseTime || companyData.responseTimeGuarantee || null,
        completionRate: companyData.completionRate || null,
        totalOrders: companyData.totalOrders || null,
        averageRating: companyData.averageRating || null,
        totalReviews: companyData.totalReviews || null,
        
        // Timestamps
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Remove null values to avoid overwriting existing data with nulls
      const cleanedUpdate: { [x: string]: any } = Object.fromEntries(
        Object.entries(userDataUpdate).filter(([_, value]) => value !== null)
      );

      batch.update(userDocRef, cleanedUpdate);
      syncedCount++;
      writeCountInBatch++;

      if (writeCountInBatch >= 400) {
        await batch.commit();
        loggerV2.info(`Committed a batch of ${writeCountInBatch} company-to-user syncs.`);
        batch = db.batch();
        writeCountInBatch = 0;
      }
    }

    if (writeCountInBatch > 0) {
      await batch.commit();
      loggerV2.info(`Committed the final batch of ${writeCountInBatch} company-to-user syncs.`);
    }

    const message = companyId 
      ? `Successfully synced company ${companyId} to user data.`
      : `Successfully synced ${syncedCount} companies to user data.`;
    res.status(200).send(message);
  } catch (e) {
    loggerV2.error("Company-to-user sync failed:", e);
    res.status(500).send("Company-to-user sync failed.");
  }
});

export const createJobPosting = onRequest({ region: "europe-west1", cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const db = getDb();
  try {
    const { customerType, selectedCategory, selectedSubcategory, description, kundeId, status } = req.body;
    if (!customerType || !selectedCategory || !selectedSubcategory || !description) {
      res.status(400).send("Fehlende Daten.");
      return;
    }
    const newJobData = {
      titel: `Auftrag für ${selectedSubcategory}`,
      beschreibung: description,
      kundeId: kundeId || null,
      status: status || "draft_anonymous",
      kategorie: selectedCategory,
      unterkategorie: selectedSubcategory,
      kundentyp: customerType,
      createdAt: FieldValue.serverTimestamp(), // KORREKTUR: Konsistentes Feld mit Server-Zeitstempel
      updatedAt: FieldValue.serverTimestamp(), // KORREKTUR: Konsistentes Feld mit Server-Zeitstempel
    };
    const docRef = await db.collection("auftraege").add(newJobData);
    res.status(201).json({ message: "Auftragsentwurf erstellt", jobId: docRef.id });
  } catch (error) {
    loggerV2.error("Error creating job posting:", error);
    res.status(500).send("Fehler.");
  }
});

// HTTP Version of getReviewsByProvider with explicit CORS handling
export const getReviewsByProviderHTTP = onRequest({ 
  region: "europe-west1", 
  cors: true 
}, async (req, res) => {
  // Set explicit CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { anbieterId } = req.body;
    
    if (!anbieterId) {
      res.status(400).json({ error: 'The anbieterId is required.' });
      return;
    }

    loggerV2.info("[getReviewsByProviderHTTP] Called for provider:", anbieterId);

    const db = getDb();
    const reviewsRef = db.collection('reviews');
    const snapshot = await reviewsRef
      .where('anbieterId', '==', anbieterId)
      .get();

    const reviews: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        kundeId: data.kundeId,
        sterne: data.sterne,
        kommentar: data.kommentar,
        kundeProfilePictureURL: data.kundeProfilePictureURL,
        erstellungsdatum: data.erstellungsdatum && typeof data.erstellungsdatum.toDate === 'function' 
          ? data.erstellungsdatum.toDate() 
          : data.erstellungsdatum,
        antwort: data.antwort ? {
          text: data.antwort.text,
          antwortDatum: data.antwort.antwortDatum && typeof data.antwort.antwortDatum.toDate === 'function'
            ? data.antwort.antwortDatum.toDate()
            : data.antwort.antwortDatum,
          antwortVon: data.antwort.antwortVon
        } : undefined,
      });
    });

    res.status(200).json(reviews);
  } catch (error: any) {
    loggerV2.error("[getReviewsByProviderHTTP] Error fetching reviews:", error);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});