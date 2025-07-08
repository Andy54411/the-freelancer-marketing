// src/lib/constants.ts

// Die Basis-URL für Firebase Functions, die von der Umgebungsvariable kommt
// oder auf die Produktions-URL zurückfällt.
export const FIREBASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL || "https://europe-west1-tilvo-f142f.cloudfunctions.net";

export const PAGE_ERROR = "[PAGE_ERROR]";
export const PAGE_LOG = "[PAGE_LOG]";
export const PAGE_WARN = "[PAGE_WARN]";

// Alle API-URLs, die Ihre Firebase Functions ansprechen, MÜSSEN diese Basis-URL verwenden.
export const SEARCH_API_URL = `${FIREBASE_FUNCTIONS_BASE_URL}/searchCompanyProfiles`;
export const DATA_FOR_SUBCATEGORY_API_URL = `${FIREBASE_FUNCTIONS_BASE_URL}/getDataForSubcategory`;
export const REVIEWS_API_URL_BASE = `${FIREBASE_FUNCTIONS_BASE_URL}/getReviewsByProvider`;
export const CREATE_JOB_API_URL = `${FIREBASE_FUNCTIONS_BASE_URL}/createJobPosting`;

// NEU: Hinzufügen der UPLOAD_STRIPE_FILE_API_URL in die Konstanten
export const UPLOAD_STRIPE_FILE_API_URL = `${FIREBASE_FUNCTIONS_BASE_URL}/uploadStripeFile`;

export const GLOBAL_FALLBACK_MIN_PRICE = 10;
export const GLOBAL_FALLBACK_MAX_PRICE = 150;
export const PRICE_STEP = 5;

export const generalTimeOptionsForSidebar = (() => {
    const times = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }
    return times;
})();

export const TRUST_AND_SUPPORT_FEE_EUR = 4.95;