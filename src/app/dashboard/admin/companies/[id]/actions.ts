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

        // Delete subcollections first
        const collections = await db.collection('users').doc(companyId).listCollections();
        for (const collection of collections) {
            const docs = await collection.get();
            const batch = db.batch();
            docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        const userRef = db.collection('users').doc(companyId);
        const companyRef = db.collection('companies').doc(companyId);

        const batch = db.batch();
        batch.delete(userRef);
        batch.delete(companyRef);
        await batch.commit();

        // This should be the last step
        await auth.deleteUser(companyId);

        revalidatePath('/dashboard/admin/companies');

        return { success: true, message: `Firma erfolgreich gelöscht.` };
    } catch (error: any) {
        console.error(`Fehler beim Löschen der Firma ${companyId}:`, error);
        if (error.code === 'auth/user-not-found') {
            return { error: 'Der Authentifizierungs-Benutzer wurde nicht gefunden. Möglicherweise wurde er bereits gelöscht.' };
        }
        return { error: `Die Firma konnte nicht gelöscht werden.` };
    }
}