// /Users/andystaudinger/Tasko/firebase_functions/src/maintenance_auth.ts
// Einmalige Maintenance-Funktion um Custom Claims für alle existierenden User zu setzen

import { onCall } from "firebase-functions/v2/https";
import { logger as loggerV2 } from "firebase-functions/v2";
import { getAuthInstance, getDb } from "./helpers";

/**
 * Einmalige Funktion zum Setzen der Custom Claims für alle existierenden Benutzer.
 * Diese Function soll manuell aufgerufen werden, um die Auth-Synchronisation zu reparieren.
 * 
 * WICHTIG: Diese Function sollte nur von Admins aufgerufen werden können.
 */
export const updateAllUserCustomClaims = onCall({
    maxInstances: 1,
    timeoutSeconds: 540, // 9 Minuten
    memory: "1GiB"
}, async (request) => {
    // Security Check: Nur Master-User können diese Function aufrufen
    if (!request.auth?.token?.role || request.auth.token.role !== 'master') {
        throw new Error('Unauthorized: Only master users can call this function');
    }

    const db = getDb();
    const auth = getAuthInstance();
    let processedUsers = 0;
    let updatedUsers = 0;
    let errors = 0;

    try {
        loggerV2.info('[updateAllUserCustomClaims] Starting bulk custom claims update...');

        // 1. Lade alle User aus der users Collection
        const usersSnapshot = await db.collection('users').get();
        loggerV2.info(`[updateAllUserCustomClaims] Found ${usersSnapshot.size} users in users collection`);

        for (const userDoc of usersSnapshot.docs) {
            try {
                const userData = userDoc.data();
                const uid = userDoc.id;
                const userType = userData.user_type || 'kunde';

                // Setze Custom Claims
                await auth.setCustomUserClaims(uid, { role: userType });
                
                processedUsers++;
                updatedUsers++;
                loggerV2.info(`[updateAllUserCustomClaims] Updated claims for user ${uid}: ${userType}`);

            } catch (error) {
                errors++;
                loggerV2.error(`[updateAllUserCustomClaims] Error updating user ${userDoc.id}:`, error);
            }
        }

        // 2. Lade alle User aus der companies Collection
        const companiesSnapshot = await db.collection('companies').get();
        loggerV2.info(`[updateAllUserCustomClaims] Found ${companiesSnapshot.size} companies in companies collection`);

        for (const companyDoc of companiesSnapshot.docs) {
            try {
                const companyData = companyDoc.data();
                const uid = companyDoc.id;
                const userType = companyData.user_type || 'firma';

                // Setze Custom Claims
                await auth.setCustomUserClaims(uid, { role: userType });
                
                processedUsers++;
                updatedUsers++;
                loggerV2.info(`[updateAllUserCustomClaims] Updated claims for company ${uid}: ${userType}`);

            } catch (error) {
                errors++;
                loggerV2.error(`[updateAllUserCustomClaims] Error updating company ${companyDoc.id}:`, error);
            }
        }

        const result = {
            success: true,
            processedUsers,
            updatedUsers,
            errors,
            message: `Successfully updated custom claims for ${updatedUsers} users. ${errors} errors occurred.`
        };

        loggerV2.info('[updateAllUserCustomClaims] Bulk update completed:', result);
        return result;

    } catch (error) {
        loggerV2.error('[updateAllUserCustomClaims] Critical error during bulk update:', error);
        throw new Error(`Bulk update failed: ${error}`);
    }
});
