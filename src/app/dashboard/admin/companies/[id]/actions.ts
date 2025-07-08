'use server';

import { db, auth } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/server-auth';

/**
 * Updates the status of a company account in both 'users' and 'companies' collections for consistency.
 * @param companyId The ID of the company.
 * @param status The new status to set ('active', 'locked', or 'deactivated').
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
    try {
        await verifyAdmin();

        if (!companyId) {
            return { error: 'Firmen-ID ist erforderlich.' };
        }

        const userRef = db.collection('users').doc(companyId);
        const companyRef = db.collection('companies').doc(companyId);
        const privateInfoRef = userRef.collection('private_info').doc('details');

        // Atomarer Batch-Vorgang für alle Firestore-Löschungen
        const batch = db.batch();
        batch.delete(privateInfoRef); // Zuerst Unter-Sammlungen
        batch.delete(userRef);
        batch.delete(companyRef);

        // Zuerst die Datenbank-Operationen ausführen
        await batch.commit();

        // Nach erfolgreicher DB-Löschung den Auth-Benutzer löschen
        await auth.deleteUser(companyId);

        revalidatePath('/dashboard/admin/companies');
        return { success: true, message: 'Firma und zugehöriger Benutzer wurden endgültig gelöscht.' };
    } catch (error: any) {
        console.error(`[actions.ts] Fehler beim Löschen der Firma ${companyId}:`, error);

        // Detailliertere Fehlermeldung für den Client
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