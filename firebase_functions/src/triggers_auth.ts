// /Users/andystaudinger/Tasko/firebase_functions/src/triggers_auth.ts

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger as loggerV2 } from "firebase-functions/v2";
import { getAuthInstance } from "./helpers";

/**
 * Synchronisiert die Benutzerrolle aus dem Firestore-Dokument ('user_type')
 * mit den Custom Claims im Firebase Auth Token ('role').
 *
 * Dieser Trigger wird bei jeder Erstellung oder Aktualisierung eines Dokuments
 * in der 'users'-Collection ausgeführt.
 */
export const syncUserRoleWithCustomClaims = onDocumentWritten("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const afterData = event.data?.after.data();
    const beforeData = event.data?.before.data();

    // Extrahiere den user_type aus den neuen Daten. Fallback auf 'kunde', wenn nicht vorhanden.
    const newUserType = afterData?.user_type || 'kunde';
    // Extrahiere den alten user_type, um unnötige Schreibvorgänge zu vermeiden.
    const oldUserType = beforeData?.user_type;

    // Wenn sich der user_type nicht geändert hat, brechen wir ab, um Kosten zu sparen.
    if (newUserType === oldUserType) {
        loggerV2.info(`[syncUserRole] Rolle für ${userId} ist unverändert ('${newUserType}'). Kein Update der Claims erforderlich.`);
        return null;
    }

    try {
        // Setze den 'role'-Claim im Auth-Token des Benutzers.
        // Dies überschreibt alle vorhandenen Custom Claims, also fügen Sie hier bei Bedarf weitere hinzu.
        await getAuthInstance().setCustomUserClaims(userId, { role: newUserType });

        loggerV2.info(`[syncUserRole] Custom Claim 'role' für Nutzer ${userId} erfolgreich auf '${newUserType}' gesetzt.`);
        return null;

    } catch (error) {
        loggerV2.error(
            `[syncUserRole] Fehler beim Setzen der Custom Claims für Nutzer ${userId}:`,
            error
        );
        return null;
    }
});