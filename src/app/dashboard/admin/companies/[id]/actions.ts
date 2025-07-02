'use server';

import { db } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

async function updateAccountStatus(companyId: string, status: 'active' | 'locked') {
    if (!companyId) {
        return { error: 'Firmen-ID ist erforderlich.' };
    }

    try {
        await db.collection('users').doc(companyId).update({ status });

        // Sorgen dafür, dass die Seiten mit den neuen Daten neu geladen werden
        revalidatePath(`/dashboard/admin/companies/${companyId}`);
        revalidatePath('/dashboard/admin/companies');

        return { success: true };
    } catch (error) {
        console.error(`Fehler beim Ändern des Account-Status zu ${status}:`, error);
        return { error: `Der Account-Status konnte nicht geändert werden.` };
    }
}

export async function lockAccount(companyId: string) {
    return updateAccountStatus(companyId, 'locked');
}

export async function unlockAccount(companyId: string) {
    return updateAccountStatus(companyId, 'active');
}