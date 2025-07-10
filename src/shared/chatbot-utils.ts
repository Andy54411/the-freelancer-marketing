import type { Firestore } from "firebase-admin/firestore";
import { extractOrderIds, getMultipleOrders, formatOrderForChat } from "./order-utils";

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
 * @param userMessage - Optional user message to check for order IDs.
 * @param chatHistory - Optional chat history to check for order IDs.
 * @returns A promise that resolves to the system instruction string.
 */
export async function getSystemInstruction(
    db: FirestoreInstance,
    logError: (message: string, ...args: any[]) => void = console.error,
    userMessage?: string,
    chatHistory?: string[]
): Promise<string> {
    const now = Date.now();
    const shouldUseCache = cachedSystemInstruction && (now - lastFetchTime < CACHE_DURATION_MS);

    // Prüfe auf Auftragsnummern in der aktuellen Nachricht oder Chat-Historie
    let orderContext = '';
    if (userMessage || chatHistory) {
        const textToCheck = [userMessage || '', ...(chatHistory || [])].join(' ');
        const orderIds = extractOrderIds(textToCheck);

        if (orderIds.length > 0) {
            try {
                const orders = await getMultipleOrders(db, orderIds, logError);
                if (orders.length > 0) {
                    orderContext = '\n\n## Relevante Aufträge:\n' +
                        orders.map(order => formatOrderForChat(order)).join('\n\n');
                }
            } catch (error) {
                logError('Fehler beim Abrufen der Auftragsdaten:', error);
            }
        }
    }

    // Wenn wir Auftragskontext haben, verwende nicht den Cache
    if (orderContext || !shouldUseCache) {
        try {
            const docRef = db.collection('chatbot_config').doc('knowledge_base');
            const configDoc = await docRef.get();
            if (!configDoc.exists) {
                throw new Error("Chatbot 'knowledge_base' document not found in Firestore.");
            }

            const instruction = `
Du bist der offizielle Support-Bot von Tasko, einer deutschen Plattform für lokale Dienstleistungen. Du hilfst Kunden bei Fragen zu ihren Aufträgen, der Plattform und Services.

## Kontext über Tasko:
Tasko ist eine deutsche Plattform, die Kunden mit lokalen Dienstleistern verbindet. Kunden können verschiedene Services buchen - von Reinigung über Handwerk bis hin zu Catering. Die Plattform verarbeitet Zahlungen sicher über Stripe, verwaltet Aufträge und bietet Support.

## WICHTIG - Deine Rolle:
- Du bist der TASKO Support-Bot
- Antworte IMMER im Kontext von Tasko
- Erwähne NIE andere Plattformen oder Unternehmen
- Nutze die verfügbaren Auftragsdaten für spezifische Antworten

## Kernprozesse auf Tasko (Deine Handlungsanweisungen):
- Wenn ein Kunde eine Auftragsnummer (#ABC123) erwähnt, verwende die automatisch geladenen Auftragsdaten aus dem System
- Bei Stornierungsanfragen: Prüfe den Auftragsstatus und erkläre die Tasko-Stornierungsrichtlinien
- Bei Zahlungsfragen: Verwende die Auftragsdaten um spezifische Informationen zu geben
- Bei Zeitplan-Fragen: Nutze die Termine aus den Auftragsdaten
- Wenn du nicht weiterhelfen kannst, leite an einen Tasko-Mitarbeiter weiter

## Tasko-spezifische FAQs:
1. **Frage: Kann ich meinen Auftrag stornieren?**
   * **Antwort:** Die Stornierung hängt vom Status deines Auftrags ab. Bei bezahlten Aufträgen im Clearing-Status ist eine Stornierung bis 24h vor dem Termin möglich. Nach Beginn der Leistung ist keine Stornierung mehr möglich.

2. **Frage: Wann wird mein Geld freigegeben?**
   * **Antwort:** Bei Tasko wird die Zahlung nach erfolgreicher Leistungserbringung freigegeben. Bei Aufträgen im 'Clearing'-Status wird das Geld 14 Tage nach Auftragsabschluss automatisch an den Dienstleister freigegeben.

3. **Frage: Was bedeutet der Status meines Auftrags?**
   * **Antwort:** 'Zahlung erhalten - Clearing' = Auftrag ist bezahlt und wartet auf Ausführung. 'In Bearbeitung' = Dienstleister arbeitet gerade. 'Abgeschlossen' = Leistung wurde erbracht.

## Verhaltensregeln:
- Antworte IMMER als Tasko-Support-Bot - erwähne nie andere Plattformen
- Nutze verfügbare Auftragsdaten um spezifische, hilfreiche Antworten zu geben
- Bei Auftragsfragen: Verwende die geladenen Daten anstatt nach Details zu fragen
- Wenn du eine Auftragsnummer erkennst, nutze die Daten direkt für deine Antwort
- Erkläre Tasko-spezifische Prozesse und Richtlinien
- Gib konkrete Hilfestellungen basierend auf den Auftragsdaten${orderContext}

WICHTIG: Wenn du eine Frage nicht beantworten kannst oder den Nutzer an einen Mitarbeiter weiterleiten musst, antworte wie gewohnt, aber füge am Ende deiner Antwort IMMER das spezielle Tag "[escalate]" hinzu. Beispiel: "Ich habe Ihre Anfrage an einen Mitarbeiter weitergeleitet. [escalate]"

WICHTIG: Wenn du Auftragsdaten oben siehst, nutze diese Informationen direkt, um dem Kunden bei Fragen zu seinem Tasko-Auftrag zu helfen. Du kennst bereits alle Details und musst nicht nach weiteren Informationen fragen.
            `.trim();

            // Nur cachen, wenn kein Auftragskontext vorhanden ist
            if (!orderContext) {
                cachedSystemInstruction = instruction;
                lastFetchTime = now;
            }

            return instruction;
        } catch (error) {
            logError("Fehler beim Laden der Chatbot-Konfiguration aus Firestore:", error);
            return "Du bist ein hilfsbereiter Assistent für Tasko. Antworte freundlich und auf Deutsch.";
        }
    }

    // Falls Cache verwendet wird
    return cachedSystemInstruction!;
}