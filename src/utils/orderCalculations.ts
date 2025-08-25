// /Users/andystaudinger/Tasko/src/utils/orderCalculations.ts

/**
 * Zentrale Berechnungslogik für Aufträge
 * Berücksichtigt sowohl Einzeltag- als auch Mehrtag-Szenarien
 */

export interface OrderCalculationResult {
    totalHours: number;
    totalDays: number;
    hoursPerDay: number;
    hourlyRate: number; // in EUR
    hourlyRateInCents: number; // in Cent
    totalPrice: number; // in EUR
    totalPriceInCents: number; // in Cent
}

/**
 * Berechnet die korrekte Anzahl von Tagen zwischen zwei Daten (inklusive)
 */
export function calculateDaysBetween(dateFrom: string, dateTo: string): number {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    // Berechne die Differenz in Millisekunden
    const timeDiff = endDate.getTime() - startDate.getTime();

    // Konvertiere zu Tagen und addiere 1 (inklusive beider Tage)
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    return Math.max(1, daysDiff); // Mindestens 1 Tag
}

/**
 * Hauptberechnungsfunktion für Aufträge
 */
export function calculateOrderDetails(orderData: {
    jobDateFrom?: string;
    jobDateTo?: string;
    jobDurationString?: string | number;
    jobTotalCalculatedHours?: number;
    jobCalculatedPriceInCents?: number;
    originalJobPriceInCents?: number;
}): OrderCalculationResult {
    const priceInCents =
        orderData.jobCalculatedPriceInCents || orderData.originalJobPriceInCents || 0;
    const priceInEur = priceInCents / 100;

    let totalHours: number;
    let totalDays: number;
    let hoursPerDay: number;

    // Szenario 1: Mehrtägiger Auftrag (jobDateFrom !== jobDateTo)
    if (
        orderData.jobDateFrom &&
        orderData.jobDateTo &&
        orderData.jobDateFrom !== orderData.jobDateTo
    ) {
        totalDays = calculateDaysBetween(orderData.jobDateFrom, orderData.jobDateTo);
        hoursPerDay = parseFloat(String(orderData.jobDurationString || 8));
        totalHours = totalDays * hoursPerDay;

    }
    // Szenario 2: Eintägiger Auftrag oder flexible Stunden
    else {
        totalDays = 1;

        // Verwende explizit angegebene Gesamtstunden, falls vorhanden
        if (orderData.jobTotalCalculatedHours && orderData.jobTotalCalculatedHours > 0) {
            totalHours = orderData.jobTotalCalculatedHours;
        } else {
            totalHours = parseFloat(String(orderData.jobDurationString || 8));
        }

        hoursPerDay = totalHours;

    }

    // Stundensatz berechnen
    const hourlyRate = totalHours > 0 ? priceInEur / totalHours : 0;
    const hourlyRateInCents = Math.round(hourlyRate * 100);

    return {
        totalHours,
        totalDays,
        hoursPerDay,
        hourlyRate,
        hourlyRateInCents,
        totalPrice: priceInEur,
        totalPriceInCents: priceInCents,
    };
}

/**
 * Formatiert Stunden für die Anzeige
 */
export function formatHours(hours: number): string {
    if (hours === 1) return '1 Stunde';
    return `${hours} Stunden`;
}

/**
 * Formatiert Tage für die Anzeige
 */
export function formatDays(days: number): string {
    if (days === 1) return '1 Tag';
    return `${days} Tage`;
}

/**
 * Formatiert eine vollständige Dauerbeschreibung
 */
export function formatDuration(result: OrderCalculationResult): string {
    if (result.totalDays === 1) {
        return formatHours(result.totalHours);
    } else {
        return `${formatDays(result.totalDays)} (${formatHours(result.totalHours)} gesamt)`;
    }
}
