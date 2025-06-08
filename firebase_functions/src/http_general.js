"use strict";
// Angenommener Dateiname: src/http_general.ts (oder ähnlich)
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsByProvider = exports.submitReview = exports.createJobPosting = exports.getDataForSubcategory = exports.searchCompanyProfiles = exports.migrateExistingUsersToCompanies = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const helpers_1 = require("./helpers");
exports.migrateExistingUsersToCompanies = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const usersSnapshot = await helpers_1.db.collection("users").get();
        if (usersSnapshot.empty) {
            res.status(200).send("No users found to migrate.");
            return;
        }
        let migratedCount = 0;
        let batch = helpers_1.db.batch();
        let count = 0;
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            if (!userData || userData.user_type !== "firma")
                continue;
            const companyData = { ...userData, uid: doc.id, updatedAt: new Date() };
            const companyRef = helpers_1.db.collection("companies").doc(doc.id);
            batch.set(companyRef, companyData, { merge: true });
            migratedCount++;
            count++;
            if (count >= 400) {
                await batch.commit();
                batch = helpers_1.db.batch();
                count = 0;
            }
        }
        if (count > 0)
            await batch.commit();
        res.status(200).send(`Successfully migrated ${migratedCount} users to companies.`);
    }
    catch (e) {
        v2_1.logger.error("Migration failed:", e); // Logging hinzugefügt
        res.status(500).send("Migration failed.");
    }
});
exports.searchCompanyProfiles = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const { id, postalCode, selectedSubcategory, minPrice, maxPrice } = req.query;
        if (id && typeof id === "string") {
            const companyDoc = await helpers_1.db.collection("companies").doc(id).get();
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
        let query = helpers_1.db
            .collection("companies")
            .where("postalCode", "==", postalCode)
            .where("user_type", "==", "firma")
            .where("selectedSubcategory", "==", selectedSubcategory);
        const numMinPrice = Number(minPrice);
        const numMaxPrice = Number(maxPrice);
        if (!isNaN(numMinPrice) && minPrice !== undefined)
            query = query.where("hourlyRate", ">=", numMinPrice);
        if (!isNaN(numMaxPrice) && maxPrice !== undefined)
            query = query.where("hourlyRate", "<=", numMaxPrice);
        const querySnapshot = await query.get();
        if (querySnapshot.empty) {
            res.status(200).json([]);
            return;
        }
        const profiles = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(profiles);
    }
    catch (e) {
        v2_1.logger.error("Error searching company profiles:", e); // Logging hinzugefügt
        res.status(500).send("Error searching company profiles.");
    }
});
exports.getDataForSubcategory = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    const subcategory = req.query.subcategory;
    if (!subcategory) {
        res.status(400).send("Missing param: subcategory.");
        return;
    }
    try {
        const companiesRef = helpers_1.db
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
        const prices = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && typeof data.hourlyRate === "number" && !isNaN(data.hourlyRate) && data.hourlyRate > 0)
                prices.push(data.hourlyRate);
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
        const distributionData = [];
        if (prices.length > 0) {
            if (minPrice === maxPrice) {
                distributionData.push({ range: `${minPrice.toFixed(0)}`, count: prices.length });
            }
            else {
                const numBuckets = Math.min(5, prices.length);
                const rangeVal = maxPrice - minPrice;
                const bucketWidth = rangeVal > 0 ? rangeVal / numBuckets : 1;
                for (let i = 0; i < numBuckets; i++) {
                    const start = minPrice + i * bucketWidth;
                    const end = i === numBuckets - 1 ? maxPrice : minPrice + (i + 1) * bucketWidth;
                    const count = prices.filter((p) => p >= start && (i === numBuckets - 1 ? p <= end : p < end)).length;
                    if (count > 0)
                        distributionData.push({ range: `${Math.floor(start)}-${Math.ceil(end)}`, count });
                }
            }
        }
        res.status(200).json({
            averagePrice,
            minPossiblePriceInSubcategory: minPrice,
            maxPossiblePriceInSubcategory: maxPrice,
            distribution: distributionData,
        });
    }
    catch (error) {
        v2_1.logger.error("Error processing subcategory data:", error); // Logging hinzugefügt
        res.status(500).send("Error processing subcategory data.");
    }
});
exports.createJobPosting = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
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
        const docRef = await helpers_1.db.collection("auftraege").add(newJobData);
        res.status(201).json({ message: "Auftragsentwurf erstellt", jobId: docRef.id });
    }
    catch (error) {
        v2_1.logger.error("Error creating job posting:", error); // Logging hinzugefügt
        res.status(500).send("Fehler.");
    }
});
exports.submitReview = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    try {
        const { anbieterId, kundeId, auftragId, sterne, kommentar, kundeProfilePictureURL, kategorie, unterkategorie } = req.body;
        if (!anbieterId || !kundeId || !auftragId || typeof sterne !== "number" || sterne < 1 || sterne > 5 || !kategorie || !unterkategorie) {
            res.status(400).send("Missing data.");
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
        const docRef = await helpers_1.db.collection("reviews").add(newReviewData);
        res.status(201).json({ message: "Review submitted", reviewId: docRef.id });
    }
    catch (error) {
        v2_1.logger.error("Error submitting review:", error); // Logging hinzugefügt
        res.status(500).send("Error submitting review.");
    }
});
exports.getReviewsByProvider = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    try {
        const { anbieterId } = req.query;
        if (!anbieterId || typeof anbieterId !== "string") {
            res.status(400).send("Missing anbieterId.");
            return;
        }
        const snapshot = await helpers_1.db
            .collection("reviews")
            .where("anbieterId", "==", anbieterId)
            .orderBy("erstellungsdatum", "desc")
            .get();
        const reviews = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).json(reviews);
    }
    catch (error) {
        v2_1.logger.error("Error fetching reviews:", error); // Logging hinzugefügt
        res.status(500).send("Error fetching reviews.");
    }
});
