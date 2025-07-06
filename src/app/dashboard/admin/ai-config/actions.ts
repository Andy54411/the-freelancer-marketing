'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/firebase/server';

export type FormState = {
    message: string;
    isError: boolean;
}

export async function updateConfig(
    prevState: FormState,
    formData: FormData,
): Promise<FormState> {
    try {
        const persona = formData.get('persona') as string;
        const context = formData.get('context') as string;
        const faqsString = formData.get('faqs') as string;
        const rulesString = formData.get('rules') as string;
        const coreProcessesString = formData.get('coreProcesses') as string; // NEU

        let faqs;
        try {
            faqs = JSON.parse(faqsString);
            if (!Array.isArray(faqs)) throw new Error("FAQs müssen ein gültiges JSON-Array sein.");
        } catch (e) {
            return { message: 'Fehler: Die FAQs sind kein gültiges JSON-Format.', isError: true };
        }

        const rules = rulesString.split('\n').map(rule => rule.trim()).filter(Boolean);
        const coreProcesses = coreProcessesString.split('\n').map(process => process.trim()).filter(Boolean); // NEU

        await db.collection('chatbot_config').doc('knowledge_base').set({ persona, context, faqs, rules, coreProcesses }, { merge: true });

        revalidatePath('/dashboard/admin/ai-config');
        return { message: "Konfiguration erfolgreich gespeichert!", isError: false };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
        return { message: `Fehler beim Speichern: ${errorMessage}`, isError: true };
    }
}