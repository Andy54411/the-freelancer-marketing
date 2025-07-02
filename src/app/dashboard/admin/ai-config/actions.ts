'use server';

import { db } from "@/firebase/server";
import { revalidatePath } from "next/cache";

export type FormState = {
    message: string;
    isError: boolean;
}

// Der erste Parameter 'prevState' wird von useFormState benötigt
export async function updateConfig(prevState: FormState, formData: FormData): Promise<FormState> {
    const rawFormData = {
        persona: formData.get('persona') as string,
        context: formData.get('context') as string,
        faqsRaw: formData.get('faqs') as string,
        rulesRaw: formData.get('rules') as string,
    };

    let faqs = [];
    try {
        // Parse den JSON-String der FAQs sicher
        faqs = JSON.parse(rawFormData.faqsRaw || '[]');
    } catch (error) {
        console.error("Fehler beim Parsen der FAQ-JSON:", error);
        return { message: "Das FAQ-JSON ist ungültig. Bitte überprüfe die Syntax.", isError: true };
    }

    const rules = rawFormData.rulesRaw.split('\n').filter(rule => rule.trim() !== '');

    try {
        const docRef = db.collection('chatbot_config').doc('knowledge_base');
        await docRef.set({
            persona: rawFormData.persona,
            context: rawFormData.context,
            faqs: faqs,
            rules: rules,
        }, { merge: true }); // merge: true stellt sicher, dass andere Felder im Dokument nicht überschrieben werden

        // Leere den Cache für die API-Route und die Admin-Seite, damit die Änderungen sofort sichtbar sind
        revalidatePath('/api/chat');
        revalidatePath('/dashboard/admin/ai-config');

        return { message: "Konfiguration erfolgreich gespeichert!", isError: false };

    } catch (error) {
        console.error("Fehler beim Speichern der Konfiguration in Firestore:", error);
        return { message: "Konfiguration konnte nicht in Firestore gespeichert werden.", isError: true };
    }
}