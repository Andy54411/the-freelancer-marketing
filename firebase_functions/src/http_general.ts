// /Users/andystaudinger/Tilvo/functions/src/http_general.ts

// Wichtige Imports
import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { db } from './helpers'; // Stellen Sie sicher, dass 'db' von hier importiert wird
import * as admin from 'firebase-admin'; // Wichtig für Firestore Timestamp Konvertierung (für erstellungsdatum)
import cors from 'cors';

// CORS Middleware einmalig initialisieren
// 'origin: true' erlaubt Anfragen von jeder Origin (gut für lokale Entwicklung)
const corsHandler = cors({ origin: true });

// --- migrateExistingUsersToCompanies ---
export const migrateExistingUsersToCompanies = onRequest({ cors: true }, async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) {
      res.status(200).send("No users found to migrate.");
      return;
    }
    let migratedCount = 0;
    let batch = db.batch();
    let count = 0;
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      if (!userData || userData.user_type !== "firma") continue;
      const companyData = { ...userData, uid: doc.id, updatedAt: new Date() };
      const companyRef = db.collection("companies").doc(doc.id);
      batch.set(companyRef, companyData, { merge: true });
      migratedCount++;
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
    res.status(200).send(`Successfully migrated ${migratedCount} users to companies.`);
  } catch (e) {
    loggerV2.error("Migration failed:", e);
    res.status(500).send("Migration failed.");
  }
});

// --- searchCompanyProfiles ---
export const searchCompanyProfiles = onRequest({ cors: true }, async (req, res) => {
  try {
    const { id, postalCode, selectedSubcategory, minPrice, maxPrice } = req.query;
    if (id && typeof id === "string") {
      const companyDoc = await db.collection("companies").doc(id).get();
      if (!companyDoc.exists) {
        res.status(404).json({ message: "Anbieter nicht gefunden" });
        return;
      }
      res.status(200).json({ id: companyDoc.id, ...companyDoc.data() });
      return;
    }
    if (!postalCode || !selectedSubcategory) {
      res.status(400).send("Fehlende Parameter: (postalCode und selectedSubcategory) oder id.");
      return;
    }
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection("companies")
      .where("postalCode", "==", postalCode as string)
      .where("user_type", "==", "firma")
      .where("selectedSubcategory", "==", selectedSubcategory as string);
    const numMinPrice = Number(minPrice);
    const numMaxPrice = Number(maxPrice);
    if (!isNaN(numMinPrice) && minPrice !== undefined) query = query.where("hourlyRate", ">=", numMinPrice);
    if (!isNaN(numMaxPrice) && maxPrice !== undefined) query = query.where("hourlyRate", "<=", numMaxPrice);
    const querySnapshot = await query.get();
    if (querySnapshot.empty) {
      res.status(200).json([]);
      return;
    }
    const profiles = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(profiles);
  } catch (e) {
    loggerV2.error("Error searching company profiles:", e);
    res.status(500).send("Error searching company profiles.");
  }
});

// --- getDataForSubcategory ---
export const getDataForSubcategory = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const subcategory = req.query.subcategory as string;
  if (!subcategory) {
    res.status(400).send("Missing param: subcategory.");
    return;
  }
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

// --- createJobPosting ---
export const createJobPosting = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
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
      erstellungsdatum: new Date(),
      letztesUpdate: new Date(),
    };
    const docRef = await db.collection("auftraege").add(newJobData);
    res.status(201).json({ message: "Auftragsentwurf erstellt", jobId: docRef.id });
  } catch (error) {
    loggerV2.error("Error creating job posting:", error);
    res.status(500).send("Fehler.");
  }
});

// --- submitReview (mit manuellem CORS-Handling) ---
// Interfaces für die Callable Function (Input und Output, wie vom Frontend erwartet)
interface SubmitReviewData {
  anbieterId: string;
  kundeId: string;
  auftragId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  kategorie: string;
  unterkategorie: string;
}

// Antwort-Interface für httpsCallable
interface SubmitReviewResult {
  message: string;
  reviewId: string;
}

export const submitReview = onRequest({ cors: true }, async (req, res) => {
  // Führe CORS Middleware aus, um Preflight zu handhaben
  await new Promise<void>((resolve) => {
    corsHandler(req as any, res as any, () => resolve());
  });

  if (res.headersSent) { // Wenn Preflight bereits geantwortet hat, abbrechen
    loggerV2.info("[submitReview] Preflight-Anfrage wurde von CORS-Middleware beendet.");
    return;
  }

  // Überprüfe die HTTP-Methode. httpsCallable sendet POST.
  if (req.method !== "POST") {
    loggerV2.error("[submitReview] Unerlaubte HTTP-Methode.", { method: req.method });
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    // Die Payload von httpsCallable kommt im req.body.data-Feld.
    // Ein Fallback zu req.body ist für den Fall, dass es kein 'data'-Feld gibt
    // (z.B. bei einem direkten fetch-Aufruf ohne 'data'-Wrapper).
    const { anbieterId, kundeId, auftragId, sterne, kommentar, kundeProfilePictureURL, kategorie, unterkategorie } = (req.body as { data?: SubmitReviewData }).data || req.body;

    if (!anbieterId || !kundeId || !auftragId || typeof sterne !== "number" || sterne < 1 || sterne > 5 || !kategorie || !unterkategorie) {
      loggerV2.error("[submitReview] Fehlende oder ungültige Daten.", { payload: req.body });
      res.status(400).json({ // Antwort wie von Callable-Fehler erwartet
        data: null,
        error: { message: "Missing or invalid data.", code: "invalid-argument" }
      });
      return;
    }

    const newReviewData = {
      anbieterId,
      kundeId,
      auftragId,
      sterne,
      kommentar: kommentar || "",
      kundeProfilePictureURL: kundeProfilePictureURL || null,
      kategorie,
      unterkategorie,
      erstellungsdatum: new Date(),
    };
    const docRef = await db.collection("reviews").add(newReviewData);
    loggerV2.info("[submitReview] Bewertung erfolgreich gespeichert.", { reviewId: docRef.id, anbieterId });

    // Erfolgreiche Antwort für Callable-Funktionen (im 'data'-Feld)
    res.status(201).json({ data: { message: "Review submitted", reviewId: docRef.id } as SubmitReviewResult });

  } catch (error: unknown) {
    loggerV2.error("[submitReview] Fehler beim Speichern der Bewertung:", error);

    let errorMessage = 'Ein unbekannter Fehler ist beim Speichern der Bewertung aufgetreten.';
    let errorCode = 'internal';

    if (error instanceof HttpsError) {
      errorMessage = error.message;
      errorCode = error.code;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
      errorMessage = (error as any).message;
    }

    res.status(500).json({ // Fehler-Antwort für Callable-Funktionen
      data: null,
      error: {
        message: errorMessage,
        code: errorCode,
        details: (error instanceof HttpsError && error.details) ? error.details : undefined,
      },
    });
  }
});

// --- getReviewsByProvider (mit manuellem CORS-Handling) ---
// Typ für die erwarteten Daten der Anfrage (Frontend-Payload für httpsCallable)
interface GetReviewsByProviderData {
  anbieterId: string;
}

// Typ für die zurückgegebenen Bewertungen
interface ReviewData {
  id: string;
  kundeId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  erstellungsdatum?: { _seconds: number, _nanoseconds: number } | Date;
}

export const getReviewsByProvider = onRequest({ cors: true }, async (req, res) => {
  // 1. NEUER DEBUG-LOG: Wird dieser HTTP-Request überhaupt erreicht?
  loggerV2.info("[getReviewsByProvider] HTTP-Anfrage empfangen (Start).");

  // Führe die CORS-Middleware aus, um Header zu setzen und Preflight zu handhaben
  await new Promise<void>((resolve) => {
    corsHandler(req as any, res as any, () => resolve());
  });

  // Wenn die CORS-Middleware den Request bereits beendet hat (z.B. bei OPTIONS-Preflight),
  // müssen wir hier abbrechen, damit der Rest des Codes nicht ausgeführt wird.
  if (res.headersSent) {
    loggerV2.info("[getReviewsByProvider] Preflight-Anfrage wurde von CORS-Middleware beendet.");
    return;
  }

  // 2. NEUER DEBUG-LOG: Wird dieser Punkt nach CORS-Handling erreicht?
  loggerV2.info("[getReviewsByProvider] Anfrage nach CORS-Handling verarbeitet.");

  // Überprüfen, ob es eine POST-Anfrage ist (wie von httpsCallable gesendet)
  if (req.method !== 'POST') {
    loggerV2.error("[getReviewsByProvider] Unerlaubte HTTP-Methode.", { method: req.method });
    res.status(405).send('Method Not Allowed. Only POST is accepted for this endpoint.');
    return;
  }

  // Daten aus dem Body der POST-Anfrage extrahieren (wie von httpsCallable gesendet)
  const callableData = req.body.data as GetReviewsByProviderData; // httpsCallable packt Daten in ein 'data'-Feld

  if (!callableData || !callableData.anbieterId) {
    loggerV2.error("[getReviewsByProvider] Fehlende Anbieter-ID in der Payload.", { payload: req.body });
    res.status(400).json({
      data: null, // Antwortformat für Callable-Fehler
      error: {
        message: 'Die Anbieter-ID ist erforderlich.',
        code: 'invalid-argument',
        details: null,
      },
    });
    return;
  }

  try {
    // 3. NEUER DEBUG-LOG: Wird der Try-Block erreicht?
    loggerV2.info(`[getReviewsByProvider] Lade Bewertungen für Anbieter-ID: ${callableData.anbieterId}`);

    const reviewsRef = db.collection('reviews');
    const snapshot = await reviewsRef.where('anbieterId', '==', callableData.anbieterId).orderBy('erstellungsdatum', 'desc').get();

    const reviews: ReviewData[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        kundeId: data.kundeId,
        sterne: data.sterne,
        kommentar: data.kommentar,
        kundeProfilePictureURL: data.kundeProfilePictureURL,
        erstellungsdatum: data.erstellungsdatum instanceof admin.firestore.Timestamp ? data.erstellungsdatum.toDate() : data.erstellungsdatum,
      });
    });

    // 4. NEUER DEBUG-LOG: Wurden Bewertungen gefunden und die Logik erfolgreich durchlaufen?
    loggerV2.info(`[getReviewsByProvider] ${reviews.length} Bewertungen für ${callableData.anbieterId} gefunden.`);

    res.status(200).json({ data: reviews });

  } catch (error: unknown) {
    // 5. NEUER DEBUG-LOG: Ist ein Fehler im Try-Block aufgetreten?
    loggerV2.error("[getReviewsByProvider] FEHLER im Try-Block beim Abrufen der Bewertungen:", error);

    // Fehler-Payload für Callable-Funktionen
    let errorMessage = 'Ein unbekannter Fehler ist beim Abrufen der Bewertungen aufgetreten.';
    let errorCode = 'internal';

    if (error instanceof HttpsError) {
      errorMessage = error.message;
      errorCode = error.code;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
      errorMessage = (error as any).message;
    }

    res.status(500).json({
      data: null,
      error: {
        message: errorMessage,
        code: errorCode,
        details: (error instanceof HttpsError && error.details) ? error.details : undefined,
      },
    });
  }
});