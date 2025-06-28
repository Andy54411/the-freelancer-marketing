import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import { getDb, FieldValue } from './helpers'; // FieldValue import is correct
import * as admin from 'firebase-admin';
import cors from 'cors';

const corsHandler = cors({ origin: true });

export const migrateExistingUsersToCompanies = onRequest({ region: "europe-west1", cors: true }, async (req, res) => {
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

export const searchCompanyProfiles = onRequest({ region: "europe-west1", cors: true }, async (req, res) => {
  const db = getDb();
  try { // <-- This try-catch block is already present, which is good. No changes needed here.
    const { id, postalCode, selectedSubcategory, minPrice, maxPrice } = req.query as { [key: string]: string | undefined };

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

    const companyDocs = querySnapshot.docs;
    const companyIds = companyDocs.map(doc => doc.id);

    if (companyIds.length === 0) {
      res.status(200).json([]);
      return;
    }

    // Batch-Abfrage der zugehörigen User-Dokumente, um die Existenz zu verifizieren
    const userDocRefs = companyIds.map(id => db.collection("users").doc(id));
    const userDocs = await db.getAll(...userDocRefs);
    // Filter for users that exist AND are of type 'firma'
    const validUserIds = new Set(
      userDocs
        .filter(doc => doc.exists && doc.data()?.user_type === 'firma')
        .map(doc => doc.id)
    );

    const profiles = companyDocs
      .filter(doc => validUserIds.has(doc.id)) // Nur Profile mit gültigem User-Dokument vom Typ 'firma'
      .map((doc) => {
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