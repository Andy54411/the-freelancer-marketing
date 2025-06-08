// src/lib/constants.ts (oder dein spezifischer Pfad wie 
// src/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/constants.ts)

export const PAGE_ERROR = "[PAGE_ERROR]";
export const PAGE_LOG = "[PAGE_LOG]";
export const PAGE_WARN = "[PAGE_WARN]";

export const SEARCH_API_URL = "https://us-central1-tilvo-f142f.cloudfunctions.net/searchCompanyProfiles";
export const DATA_FOR_SUBCATEGORY_API_URL = "https://us-central1-tilvo-f142f.cloudfunctions.net/getDataForSubcategory";
export const REVIEWS_API_URL_BASE = "https://us-central1-tilvo-f142f.cloudfunctions.net/getReviewsByProvider";

export const GLOBAL_FALLBACK_MIN_PRICE = 10;
export const GLOBAL_FALLBACK_MAX_PRICE = 150;
export const PRICE_STEP = 5; // Wird in SidebarFilters verwendet

export const generalTimeOptionsForSidebar = (() => {
    const times = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }
    return times;
})();

export const CREATE_JOB_API_URL = "https://us-central1-tilvo-f142f.cloudfunctions.net/createJobPosting";

// NEUE KONSTANTE für die Gebühr
export const TRUST_AND_SUPPORT_FEE_EUR = 4.95;