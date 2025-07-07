'use server';

import { db } from '@/firebase/server';
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

export async function deactivateCompany(companyId: string) {
    try {
        await verifyAdmin();
        return await updateAccountStatus(companyId, 'deactivated');
    } catch (error: any) {
        return { error: error.message };
    }
}