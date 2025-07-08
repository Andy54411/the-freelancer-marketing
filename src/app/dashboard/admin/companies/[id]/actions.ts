'use server';

import { db, auth } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/server-auth';

/**
 * Updates the status of a company account in both 'users' and 'companies' collections for consistency.
 * @param companyId The ID of the company.
 * @param status The new status to set ('active', 'locked' | 'deactivated').
 */
async function updateAccountStatus(companyId: string, status: 'active' | 'locked' | 'deactivated') {
    if (!companyId) {
        return { error: 'Firmen-ID ist erforderlich.' };
    }

    try {
        const userRef = db.collection('users').doc(companyId);
        const companyRef = db.collection('companies').doc(companyId);

        // Use a batch to update both documents atomically.
        const batch = db.batch();
        const updatePayload = { status, updatedAt: FieldValue.serverTimestamp() };

        batch.update(userRef, updatePayload);
        // Using set with merge is safer as it won't fail if the company document doesn't exist yet.
        batch.set(companyRef, updatePayload, { merge: true });

        await batch.commit();

        // Revalidate paths to reflect the changes in the UI.
        revalidatePath(`/dashboard/admin/companies/${companyId}`);
        revalidatePath('/dashboard/admin/companies');

        return { success: true, message: `Account-Status erfolgreich auf '${status}' geändert.` };
    } catch (error: any) {
        console.error(`Fehler beim Ändern des Account-Status zu '${status}':`, error);
        return { error: `Der Account-Status konnte nicht geändert werden.` };
    }
}

export async function lockAccount(companyId: string) {
    try {
        await verifyAdmin();
        return await updateAccountStatus(companyId, 'locked');
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function unlockAccount(companyId: string) {
    try {
        await verifyAdmin();
        return await updateAccountStatus(companyId, 'active');
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function deactivateCompany(companyId: string, shouldDeactivate: boolean) {
    try {
        await verifyAdmin();
        const newStatus = shouldDeactivate ? 'deactivated' : 'active';
        return await updateAccountStatus(companyId, newStatus);
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function deleteCompany(companyId: string) {
    console.log(`[Action] Starte Löschvorgang für Firma: ${companyId}`);
    try {
        await verifyAdmin();

        if (!companyId) {
            console.error('[Action] Abbruch: Keine Firmen-ID angegeben.');
            return { error: 'Firmen-ID ist erforderlich.' };
        }

        const userRef = db.collection('users').doc(companyId);
        const companyRef = db.collection('companies').doc(companyId);

        console.log('[Action] Starte Firestore-Transaktion...');
        await db.runTransaction(async (transaction) => {
            // Schritt 1: Alle Unter-Sammlungen von 'users' löschen
            console.log(`[Action] Lade Unter-Sammlungen für User: ${companyId}`);
            const userSubcollections = await userRef.listCollections();
            for (const subcollection of userSubcollections) {
                console.log(`[Action] Lösche Dokumente in User-Unter-Sammlung: ${subcollection.id}`);
                const allDocs = await subcollection.get();
                allDocs.forEach(doc => transaction.delete(doc.ref));
            }

            // Schritt 2: Alle Unter-Sammlungen von 'companies' löschen
            console.log(`[Action] Lade Unter-Sammlungen für Company: ${companyId}`);
            const companySubcollections = await companyRef.listCollections();
            for (const subcollection of companySubcollections) {
                console.log(`[Action] Lösche Dokumente in Company-Unter-Sammlung: ${subcollection.id}`);
                const allDocs = await subcollection.get();
                allDocs.forEach(doc => transaction.delete(doc.ref));
            }

            // Schritt 3: Die Hauptdokumente löschen
            console.log(`[Action] Lösche Hauptdokumente für User und Company: ${companyId}`);
            transaction.delete(userRef);
            transaction.delete(companyRef);
        });
        console.log('[Action] Firestore-Transaktion erfolgreich abgeschlossen.');

        // Schritt 4: Nach erfolgreicher DB-Löschung den Auth-Benutzer löschen
        console.log(`[Action] Lösche Auth-Benutzer: ${companyId}`);
        try {
            await auth.deleteUser(companyId);
            console.log(`[Action] Auth-Benutzer ${companyId} erfolgreich gelöscht.`);
        } catch (authError: any) {
            if (authError.code !== 'auth/user-not-found') {
                console.error(`[Action] Fehler beim Löschen des Auth-Benutzers ${companyId}:`, authError);
                throw authError;
            }
            console.log(`[Action] Auth-Benutzer ${companyId} wurde nicht gefunden, was in diesem Fall in Ordnung ist.`);
        }

        revalidatePath('/dashboard/admin/companies');
        console.log(`[Action] Pfad /dashboard/admin/companies revalidiert. Löschvorgang für ${companyId} abgeschlossen.`);
        return { success: true, message: 'Firma und alle zugehörigen Daten wurden endgültig gelöscht.' };

    } catch (error: any) {
        console.error(`[actions.ts] Fehler beim Löschen der Firma ${companyId}:`, error);

        let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Der Authentifizierungs-Benutzer wurde nicht gefunden, die Datenbankeinträge wurden aber möglicherweise bereits gelöscht.';
        } else if (error.code === 5) { // Firestore NOT_FOUND
            errorMessage = 'Das zu löschende Dokument wurde in der Datenbank nicht gefunden.';
        } else {
            errorMessage = error.message || 'Der Löschvorgang konnte nicht abgeschlossen werden.';
        }

        return { error: errorMessage };
    }
}