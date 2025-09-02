import { onRequest } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb, FieldValue, getUserDisplayName, getAuthInstance } from './helpers'; // FieldValue import is correct
import { UNKNOWN_PROVIDER_NAME } from './constants';

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
    // Query companies collection directly - no legacy needed
    const companiesSnapshot = await db.collection("companies").get();
    
    if (companiesSnapshot.empty) {
      res.status(200).send("No companies found to migrate.");
      return;
    }
    
    let migratedCount = 0;
    let batch = db.batch();
    let writeCountInBatch = 0;

    // Process companies from companies collection
    for (const companyDoc of companiesSnapshot.docs) {
      const companyData = companyDoc.data();
      const companyId = companyDoc.id;

      // Company data is already in correct format in companies collection
      // Just ensure updatedAt timestamp is current
      const updatedCompanyData = {
        ...companyData,
        updatedAt: FieldValue.serverTimestamp(),
      };

      const companyRef = db.collection("companies").doc(companyId);
      batch.set(companyRef, updatedCompanyData, { merge: true });
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

    // FIXED: Query companies collection without user_type filter (not needed in companies collection)
    // Companies collection only contains companies, so no user_type filter needed
    let query: FirebaseFirestore.Query = db.collection("companies");

    // Wende die obligatorischen Filter an.
    query = query
      .where("companyPostalCodeForBackend", "==", postalCode as string) // KORREKTUR: Das Feld 'postalCode' existiert nicht. Verwende das korrekte Feld 'companyPostalCodeForBackend'.
      .where("selectedSubcategory", "==", selectedSubcategory as string);

    // Wende die optionalen Preisfilter an.
    const numMinPrice = Number(minPrice);
    const numMaxPrice = Number(maxPrice);
    if (!isNaN(numMinPrice) && minPrice !== undefined) query = query.where("hourlyRate", ">=", numMinPrice);
    if (!isNaN(numMaxPrice) && maxPrice !== undefined) query = query.where("hourlyRate", "<=", numMaxPrice);

    const querySnapshot = await query.get();
    
    // DEBUG: Log query results
    loggerV2.info("[searchCompanyProfiles] DEBUG: Query-Ergebnisse:", {
      documentsFound: querySnapshot.size,
      isEmpty: querySnapshot.empty
    });
    
    if (querySnapshot.empty) {
      // DEBUG: Let's check what data actually exists in companies collection
      const allCompaniesQuery = await db.collection("companies").limit(5).get();
      const sampleData = allCompaniesQuery.docs.map(doc => ({
        id: doc.id,
        companyPostalCodeForBackend: doc.data().companyPostalCodeForBackend,
        selectedSubcategory: doc.data().selectedSubcategory,
        hourlyRate: doc.data().hourlyRate
      }));
      
      loggerV2.warn(`[searchCompanyProfiles] DEBUG: Keine Profile gefunden. Sample-Daten aus companies collection:`, sampleData);
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
      .collection("companies")
      .where("selectedSubcategory", "==", subcategory);
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
  // ❌ KOMPLETT DEAKTIVIERT - KEINE FIRMENDATEN IN USERS COLLECTION!
  loggerV2.info("[syncCompanyToUserData] DEACTIVATED - Company-to-User sync is forbidden. Companies data stays in companies collection only.");
  
  res.status(200).send({
    success: true,
    message: "Sync function deactivated - maintaining strict collection separation"
  });
});

// ❌ ALTE SYNC-FUNCTION ENTFERNT - KEINE FIRMENDATEN IN USERS COLLECTION!

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