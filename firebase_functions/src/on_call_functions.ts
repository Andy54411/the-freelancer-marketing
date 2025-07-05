// firebase_functions/src/on_call_functions.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDb } from "./helpers"; // Relativer Pfad ist hier in Ordnung.
import { getBookingCharacteristics } from "@shared/booking-characteristics"; // Alias für geteilten Code verwenden.

// Typen für die Funktion
interface SearchPayload {
    subcategory: string;
    jobDateFrom: string; // ISO String
    jobDateTo?: string;  // ISO String, optional für mehrtägige Buchungen
    jobDurationHours?: number; // Für stundenweise Buchungen
    // Zukünftige Kriterien wie Standort (Geo-Query) würden hier hinzugefügt
}

interface ProviderData {
    id: string;
    // Fügen Sie hier weitere Anbieterdaten hinzu, die im Frontend angezeigt werden sollen
    [key: string]: any;
}

const MAX_DAILY_HOURS = 10; // Tägliches Arbeitslimit für stundenbasierte Dienste

/**
 * Prüft, ob ein Anbieter für eine neue Buchung verfügbar ist.
 */
async function isProviderAvailable(providerId: string, newBooking: SearchPayload): Promise<boolean> {
    const db = getDb();
    const auftraegeRef = db.collection("auftraege");

    // Hole alle potenziell kollidierenden Aufträge des Anbieters
    const existingOrdersSnapshot = await auftraegeRef
        .where("selectedAnbieterId", "==", providerId)
        .where("status", "in", ["AKTIV", "IN BEARBEITUNG", "zahlung_erhalten_clearing"])
        .get();

    if (existingOrdersSnapshot.empty) {
        return true; // Keine potenziell kollidierenden Aufträge vorhanden.
    }

    const newBookingStartDate = new Date(newBooking.jobDateFrom);
    const newBookingEndDate = newBooking.jobDateTo ? new Date(newBooking.jobDateTo) : newBookingStartDate;
    const newBookingIsPerDay = getBookingCharacteristics(newBooking.subcategory).isDurationPerDay;

    // Hilfsfunktion zur Prüfung der Datumsüberschneidung (inklusiv)
    const datesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date): boolean => {
        // Normalisiere Daten, um die Uhrzeit für tagesbasierte Vergleiche zu ignorieren
        const aStart = new Date(startA.getFullYear(), startA.getMonth(), startA.getDate());
        const aEnd = new Date(endA.getFullYear(), endA.getMonth(), endA.getDate());
        const bStart = new Date(startB.getFullYear(), startB.getMonth(), startB.getDate());
        const bEnd = new Date(endB.getFullYear(), endB.getMonth(), endB.getDate());
        return aStart <= bEnd && aEnd >= bStart;
    };

    for (const doc of existingOrdersSnapshot.docs) {
        const order = doc.data();
        if (!order.jobDateFrom) continue;

        const existingOrderStartDate = new Date(order.jobDateFrom);
        const existingOrderEndDate = order.jobDateTo ? new Date(order.jobDateTo) : existingOrderStartDate;

        if (!datesOverlap(newBookingStartDate, newBookingEndDate, existingOrderStartDate, existingOrderEndDate)) {
            continue; // Keine Datumsüberschneidung, prüfe nächsten Auftrag.
        }

        const existingOrderIsPerDay = getBookingCharacteristics(order.selectedSubcategory).isDurationPerDay;

        // --- KONFLIKTPRÜFUNG ---

        // Fall 1: Einer der beiden Aufträge (neu oder existent) ist eine Ganztagsbuchung.
        // Jede Datumsüberschneidung ist ein harter Konflikt.
        if (newBookingIsPerDay || existingOrderIsPerDay) {
            logger.info(`[Verfügbarkeit] Konflikt für Anbieter ${providerId}: Ganztagsbuchung überschneidet sich.`);
            return false; // Anbieter ist nicht verfügbar.
        }

        // Fall 2: Beide Aufträge sind stundenbasiert. Wir müssen die Stunden für die überlappenden Tage prüfen.
        // Dies ist eine vereinfachte Prüfung für den Starttag der neuen Buchung.
        if (!newBookingIsPerDay && !existingOrderIsPerDay) {
            const dayOfNewBooking = newBookingStartDate.toDateString();

            const hoursOnDay = existingOrdersSnapshot.docs
                .map(d => d.data())
                .filter(o =>
                    !getBookingCharacteristics(o.selectedSubcategory).isDurationPerDay &&
                    o.jobDateFrom && new Date(o.jobDateFrom).toDateString() === dayOfNewBooking
                )
                .reduce((sum, o) => sum + (o.jobTotalCalculatedHours || 0), 0);

            if (hoursOnDay + (newBooking.jobDurationHours || 0) > MAX_DAILY_HOURS) {
                logger.info(`[Verfügbarkeit] Konflikt für Anbieter ${providerId}: Stundenlimit von ${MAX_DAILY_HOURS}h am ${dayOfNewBooking} würde überschritten.`);
                return false;
            }
        }
    }

    return true; // Keine Konflikte gefunden.
}

export const searchAvailableProviders = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Die Funktion muss authentifiziert aufgerufen werden.");
    }

    const { subcategory, jobDateFrom } = request.data as SearchPayload;

    if (!subcategory || !jobDateFrom) {
        throw new HttpsError("invalid-argument", "Die Funktion muss mit 'subcategory' und 'jobDateFrom' aufgerufen werden.");
    }

    const db = getDb();
    const providersSnapshot = await db.collection("companies")
        .where("selectedSubcategory", "==", subcategory)
        .where("stripeChargesEnabled", "==", true) // Nur Anbieter mit aktivierten Zahlungen
        .where("stripePayoutsEnabled", "==", true) // und aktivierten Auszahlungen
        .get();

    const availabilityChecks = providersSnapshot.docs.map(doc =>
        isProviderAvailable(doc.id, request.data as SearchPayload).then(isAvailable =>
            isAvailable ? { id: doc.id, ...doc.data() } as ProviderData : null
        )
    );

    const results = await Promise.all(availabilityChecks);
    const availableProviders = results.filter((p): p is ProviderData => p !== null);

    logger.info(`Found ${availableProviders.length} available providers for subcategory "${subcategory}".`);
    return { providers: availableProviders };
});