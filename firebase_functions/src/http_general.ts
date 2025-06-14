import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb } from './helpers';
import * as admin from 'firebase-admin';
import cors from 'cors';

const corsHandler = cors({ origin: true });

export const migrateExistingUsersToCompanies = onRequest({ cors: true }, async (req, res) => {
  const db = getDb();
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

export const searchCompanyProfiles = onRequest(async (req, res) => {
  await new Promise<void>((resolve) => {
    corsHandler(req, res, () => resolve());
  });

  if (res.headersSent) {
    return;
  }

  const db = getDb();
  try {
    const { id, postalCode, selectedSubcategory, minPrice, maxPrice } = req.query;

    if (id && typeof id === "string") {
      const companyDoc = await db.collection("companies").doc(id).get();
      if (!companyDoc.exists) {
        res.status(404).json({ message: "Anbieter nicht gefunden" });
        return;
      }
      const companyData = companyDoc.data()!;
      res.status(200).json({
        id: companyDoc.id,
        companyName: companyData.companyName || companyData.firmenname,
        profilePictureURL: companyData.profilePictureURL || companyData.profilePictureFirebaseUrl,
        hourlyRate: companyData.hourlyRate,
        description: companyData.description,
        stripeAccountId: companyData.stripeAccountId,
      });
      return;
    }

    if (!postalCode || !selectedSubcategory) {
      res.status(400).send("Fehlende Parameter: postalCode und selectedSubcategory sind erforderlich.");
      return;
    }

    let query: FirebaseFirestore.Query = db.collection("companies")
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

    const profiles = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        companyName: data.companyName || data.firmenname || 'Unbekannter Anbieter',
        profilePictureURL: data.profilePictureURL || data.profilePictureFirebaseUrl,
        hourlyRate: data.hourlyRate,
        description: data.description,
        stripeAccountId: data.stripeAccountId,
      };
    });

    res.status(200).json(profiles);

  } catch (e: any) {
    loggerV2.error("Error searching company profiles:", e);
    res.status(500).send("Error searching company profiles.");
  }
});

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

export const createJobPosting = onRequest({ cors: true }, async (req, res) => {
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

interface SubmitReviewResult {
  message: string;
  reviewId: string;
}

export const submitReview = onRequest({ cors: true }, async (req, res) => {
  await new Promise<void>((resolve) => {
    corsHandler(req as any, res as any, () => resolve());
  });

  if (res.headersSent) {
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const db = getDb();
  try {
    const { anbieterId, kundeId, auftragId, sterne, kommentar, kundeProfilePictureURL, kategorie, unterkategorie } = (req.body as { data?: SubmitReviewData }).data || req.body;

    if (!anbieterId || !kundeId || !auftragId || typeof sterne !== "number" || sterne < 1 || sterne > 5 || !kategorie || !unterkategorie) {
      res.status(400).json({
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

    res.status(201).json({ data: { message: "Review submitted", reviewId: docRef.id } as SubmitReviewResult });

  } catch (error: unknown) {
    loggerV2.error("[submitReview] Fehler beim Speichern der Bewertung:", error);

    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
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

interface GetReviewsByProviderData {
  anbieterId: string;
}

interface ReviewData {
  id: string;
  kundeId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  erstellungsdatum?: { _seconds: number, _nanoseconds: number } | Date;
}

export const getReviewsByProvider = onRequest({ cors: true }, async (req, res) => {
  await new Promise<void>((resolve) => {
    corsHandler(req as any, res as any, () => resolve());
  });

  if (res.headersSent) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed. Only POST is accepted for this endpoint.');
    return;
  }

  const callableData = req.body.data as GetReviewsByProviderData;

  if (!callableData || !callableData.anbieterId) {
    res.status(400).json({
      data: null,
      error: {
        message: 'Die Anbieter-ID ist erforderlich.',
        code: 'invalid-argument',
        details: null,
      },
    });
    return;
  }

  const db = getDb();
  try {
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

    res.status(200).json({ data: reviews });

  } catch (error: unknown) {
    loggerV2.error("[getReviewsByProvider] FEHLER im Try-Block beim Abrufen der Bewertungen:", error);

    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
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