import type { Firestore } from "firebase-admin/firestore";

// This generic type should be compatible with both the Firebase Admin SDK's Firestore
// and the client-side SDK's Firestore for the operations used in this function.
type FirestoreInstance = Pick<Firestore, 'collection'>;

let cachedSystemInstruction: string | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches and constructs the system instruction for the chatbot from Firestore, with caching.
 * This function is designed to be reusable across different environments (client/server, functions/API routes).
 * @param db - The Firestore instance (from either 'firebase-admin/firestore' or 'firebase/firestore').
 * @param logError - A function to log errors, defaults to console.error.
 * @returns A promise that resolves to the system instruction string.
 */
export async function getSystemInstruction(
    db: FirestoreInstance,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<string> {
    const now = Date.now();
    if (cachedSystemInstruction && (now - lastFetchTime < CACHE_DURATION_MS)) {
        return cachedSystemInstruction;
    }

    try {
        const docRef = db.collection('chatbot_config').doc('knowledge_base');
        const configDoc = await docRef.get();
        if (!configDoc.exists) {
            throw new Error("Chatbot 'knowledge_base' document not found in Firestore.");
        }
        const configData = configDoc.data();

        const persona = configData?.persona || "Du bist ein hilfsbereiter Assistent.";
        const context = configData?.context || "Tasko ist eine Plattform.";
        const faqs = configData?.faqs || [];
        const rules = configData?.rules || [];
        const coreProcesses = configData?.coreProcesses || [];

        const faqString = faqs.map((faq: { q: string, a: string }, index: number) =>
            `${index + 1}. **Frage: ${faq.q}**\n    * **Antwort:** ${faq.a}`
        ).join('\n\n');

        const rulesString = rules.map((rule: string) => `- ${rule}`).join('\n');

        const coreProcessesString = coreProcesses.map((process: string) => `- ${process}`).join('\n');

        const instruction = `
${persona}

## Kontext über Tasko:
${context}

## Kernprozesse auf Tasko (Deine Handlungsanweisungen):
${coreProcessesString}

## Deine Wissensdatenbank (Antworte NUR basierend auf diesen Informationen):
**Häufig gestellte Fragen (FAQ):**
${faqString}

## Verhaltensregeln:
${rulesString}

WICHTIG: Wenn du eine Frage nicht beantworten kannst oder den Nutzer an einen Mitarbeiter weiterleiten musst, antworte wie gewohnt, aber füge am Ende deiner Antwort IMMER das spezielle Tag "[escalate]" hinzu. Beispiel: "Ich habe Ihre Anfrage an einen Mitarbeiter weitergeleitet. [escalate]"
        `.trim();

        cachedSystemInstruction = instruction;
        lastFetchTime = now;
        return cachedSystemInstruction;
    } catch (error) {
        logError("Fehler beim Laden der Chatbot-Konfiguration aus Firestore:", error);
        return "Du bist ein hilfsbereiter Assistent für Tasko. Antworte freundlich und auf Deutsch.";
    }
}