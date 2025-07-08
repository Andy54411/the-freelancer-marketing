import { onRequest } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb, FieldValue, getUserDisplayName, getAuthInstance } from './helpers'; // FieldValue import is correct
import { UNKNOWN_PROVIDER_NAME, UNNAMED_COMPANY } from './constants';
import { geohashForLocation } from 'geofire-common';

// Definiere die erlaubten Ursprünge für CORS
const allowedOrigins = [
    "https://tasko-rho.vercel.app", // Vercel Frontend
    "http://localhost:3000",      // Lokale Entwicklung (Next.js)
    "http://localhost:4000",      // Lokale Entwicklung (Firebase Emulator UI)
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4000",
];

export const migrateExistingUsersToCompanies = onRequest({ region: "europe-west1", cors: allowedOrigins, timeoutSeconds: 540, memory: "1GiB", cpu: 1 }, async (req, res) => {
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

      const companyRef = db.collection("companies").doc(userId);
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

export const searchCompanyProfiles = onRequest({ region: "europe-west1", cors: allowedOrigins }, async (req, res) => {
  const db = getDb();
  try { // <-- This try-catch block is already present, which is good. No changes needed here.
    const { id, postalCode, selectedSubcategory, minPrice, maxPrice, geohash } = req.query as { [key: string]: string | undefined };

    // --- Hinzugefügtes, detailliertes Logging ---
    loggerV2.info("[searchCompanyProfiles] Suche gestartet mit Parametern:", {
      id, postalCode, selectedSubcategory, minPrice, maxPrice, geohash,
    });
    // --- Ende Logging ---

    if (id && typeof id === "string") {
      const companyDoc = await db.collection("companies").doc(id).get();
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
    // Wir können nicht nach mehreren Feldern filtern, wenn wir keinen zusammengesetzten Index haben.
    // Um den 500-Fehler zu vermeiden, filtern wir zuerst nach der Unterkategorie
    // und wenden die restlichen Filter im Code an.
    let query: FirebaseFirestore.Query = db.collection("companies");

    // Wende den wichtigsten Filter an, der die Ergebnismenge am wahrscheinlichsten einschränkt.
    query = query
      .where("selectedSubcategory", "==", selectedSubcategory as string)
      .where("user_type", "==", "firma"); // Stellt sicher, dass es sich um ein Firmenprofil handelt.

    const querySnapshot = await query.get();

    if (querySnapshot.empty) {
      loggerV2.warn(`[searchCompanyProfiles] Keine Profile für die Unterkategorie gefunden.`, { selectedSubcategory });
      res.status(200).json([]);
      return;
    }

    // Wende die restlichen Filter serverseitig an.
    const numMinPrice = Number(minPrice);
    const numMaxPrice = Number(maxPrice);

    const profiles = querySnapshot.docs
      .map(doc => ({ id: doc.id, data: doc.data() }))
      .filter(({ data }) => {
        // PLZ-Filter
        if (data.companyPostalCodeForBackend !== postalCode) {
          return false;
        }
        // Preisfilter
        if (!isNaN(numMinPrice) && minPrice !== undefined && data.hourlyRate < numMinPrice) {
          return false;
        }
        if (!isNaN(numMaxPrice) && maxPrice !== undefined && data.hourlyRate > numMaxPrice) {
          return false;
        }
        return true;
      })
      .map(({ id, data }) => {
        return {
          // WICHTIG: Dies ist die Struktur für die Ergebnisliste
          id: id,
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

export const getDataForSubcategory = onRequest({ region: "europe-west1", cors: allowedOrigins }, async (req, res) => {
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
      .collection("companies")
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

export const createJobPosting = onRequest({ region: "europe-west1", cors: allowedOrigins }, async (req, res) => {
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