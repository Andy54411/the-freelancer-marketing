import type { Firestore } from "firebase-admin/firestore";
import { extractOrderIds, getMultipleOrders, formatOrderForChat } from "./order-utils";
import {
    analyzeQuestion,
    recordQuestion,
    checkEscalationTriggers,
    createSupportSession,
    escalateToHuman,
    generateEscalationMessage,
    generateHandoverMessage
} from "./learning-utils";

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
Du bist der offizielle Tasko Support-Bot. Tasko ist eine deutsche Plattform für lokale Dienstleistungen.

## WICHTIG - ABSOLUTE GRUNDREGELN:
1. Du arbeitest AUSSCHLIESSLICH für Tasko - erwähne NIE andere Plattformen oder Firmen
2. ALLE Aufträge, die erwähnt werden, sind automatisch Tasko-Aufträge
3. Stelle NIEMALS Fragen nach der Plattform oder dem Unternehmen
4. Verwende IMMER die verfügbaren Auftragsdaten direkt in deiner Antwort

## TASKO-KONTEXT:
Tasko verbindet Kunden mit lokalen Dienstleistern. Alle Zahlungen laufen über Stripe. Aufträge haben verschiedene Status wie "Zahlung erhalten - Clearing".

## STORNIERUNGSRICHTLINIEN BEI TASKO:
- Status "Zahlung erhalten - Clearing": Stornierung bis 24h vor Termin möglich
- Status "In Bearbeitung": Keine Stornierung mehr möglich
- Status "Abgeschlossen": Keine Stornierung mehr möglich
- Vollständige Erstattung bei rechtzeitiger Stornierung

## ANTWORTMUSTER FÜR STORNIERUNGSANFRAGEN:
Wenn jemand nach Stornierung fragt und du Auftragsdaten hast:
1. Begrüße den Kunden freundlich
2. Bestätige die Auftragsnummer 
3. Nenne den aktuellen Status
4. Erkläre die Stornierungsmöglichkeiten basierend auf dem Status
5. Gib konkrete nächste Schritte

BEISPIEL-ANTWORT:
"Hallo! Ich helfe dir gerne bei deinem Tasko-Auftrag #ABC123. 

Dein Auftrag hat den Status 'Zahlung erhalten - Clearing' und ist für den [Datum] geplant. Bei diesem Status ist eine Stornierung bis 24 Stunden vor dem Termin möglich, und du erhältst den vollen Betrag von [Preis] € erstattet.

Da dein Termin am [Datum] stattfindet, hast du noch bis [Datum, 24h vorher] Zeit für eine Stornierung.

Möchtest du den Auftrag stornieren? Dann kontaktiere bitte den Tasko-Support oder nutze die Stornierungsfunktion in deinem Dashboard."${orderContext}

KRITISCH: Wenn du Auftragsdaten siehst, nutze diese SOFORT und stelle KEINE zusätzlichen Fragen nach Plattform oder Details. Der Kunde ist bereits bei Tasko und du kennst alle relevanten Informationen.

ESKALATION: Füge "[escalate]" hinzu wenn du nicht helfen kannst.
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

/**
 * Erweiterte Chatbot-Behandlung mit Lernen und Eskalation
 */
export async function handleChatMessage(
    db: FirestoreInstance,
    sessionId: string,
    userMessage: string,
    customerId: string,
    customerName?: string,
    customerEmail?: string,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<{
    systemInstruction: string;
    shouldEscalate: boolean;
    escalationReason?: string;
    escalationMessage?: string;
    sessionType: 'ai_only' | 'ai_with_escalation' | 'human_takeover';
}> {
    try {
        // Analysiere die Frage
        const analysis = analyzeQuestion(userMessage);

        // Prüfe die aktuelle Session
        const sessionDoc = await db.collection('support_sessions').doc(sessionId).get();
        let sessionData = sessionDoc.exists ? sessionDoc.data() : null;

        if (!sessionData) {
            // Neue Session erstellen
            await createSupportSession(db, customerId, customerName, customerEmail, logError);
            sessionData = {
                sessionType: 'ai_only',
                totalMessages: 0,
                aiMessages: 0,
                humanMessages: 0,
                tags: []
            };
        }

        // Nachrichtenzähler aktualisieren
        const customerMessageCount = sessionData.totalMessages - sessionData.aiMessages - sessionData.humanMessages + 1;

        // Prüfe Eskalationskriterien
        const escalationCheck = await checkEscalationTriggers(
            db,
            userMessage,
            analysis.category,
            analysis.complexity,
            analysis.sentiment,
            customerMessageCount,
            logError
        );

        // Hole die Systemanweisung
        const systemInstruction = await getSystemInstruction(db, logError, userMessage);

        // Speichere die Frage für das Lernen
        await recordQuestion(
            db,
            userMessage,
            analysis.category,
            0, // Wird später aktualisiert
            escalationCheck.shouldEscalate,
            extractOrderIds(userMessage),
            logError
        );

        // Session aktualisieren
        await db.collection('support_sessions').doc(sessionId).update({
            totalMessages: sessionData.totalMessages + 1,
            tags: [...new Set([...sessionData.tags, analysis.category])],
            updatedAt: new Date().toISOString()
        });

        if (escalationCheck.shouldEscalate && sessionData.sessionType === 'ai_only') {
            // Eskaliere zu menschlichem Support
            await escalateToHuman(db, sessionId, escalationCheck.reason!, logError);

            return {
                systemInstruction,
                shouldEscalate: true,
                escalationReason: escalationCheck.reason,
                escalationMessage: generateEscalationMessage(escalationCheck.reason!),
                sessionType: 'ai_with_escalation'
            };
        }

        return {
            systemInstruction,
            shouldEscalate: false,
            sessionType: sessionData.sessionType || 'ai_only'
        };

    } catch (error) {
        logError('Fehler beim Behandeln der Chat-Nachricht:', error);
        const fallbackInstruction = await getSystemInstruction(db, logError, userMessage);
        return {
            systemInstruction: fallbackInstruction,
            shouldEscalate: false,
            sessionType: 'ai_only'
        };
    }
}

/**
 * Markiert eine Session als von einem menschlichen Agent übernommen
 */
export async function handleHumanTakeover(
    db: FirestoreInstance,
    sessionId: string,
    supportAgentId: string,
    supportAgentName: string,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<string> {
    try {
        await db.collection('support_sessions').doc(sessionId).update({
            sessionType: 'human_takeover',
            supportAgentId,
            supportAgentName,
            updatedAt: new Date().toISOString()
        });

        return generateHandoverMessage(supportAgentName);
    } catch (error) {
        logError('Fehler beim Behandeln der menschlichen Übernahme:', error);
        return `Hallo! Ich bin ${supportAgentName} vom Tasko-Support und übernehme ab sofort Ihre Betreuung.`;
    }
}

/**
 * Prüft den Status einer Support-Session
 */
export async function getSessionStatus(
    db: FirestoreInstance,
    sessionId: string,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<{
    sessionType: 'ai_only' | 'ai_with_escalation' | 'human_takeover';
    supportAgentName?: string;
    escalationReason?: string;
    isHumanActive: boolean;
}> {
    try {
        const sessionDoc = await db.collection('support_sessions').doc(sessionId).get();

        if (!sessionDoc.exists) {
            return {
                sessionType: 'ai_only',
                isHumanActive: false
            };
        }

        const sessionData = sessionDoc.data();

        return {
            sessionType: sessionData?.sessionType || 'ai_only',
            supportAgentName: sessionData?.supportAgentName,
            escalationReason: sessionData?.escalationReason,
            isHumanActive: sessionData?.sessionType === 'human_takeover'
        };
    } catch (error) {
        logError('Fehler beim Abrufen des Session-Status:', error);
        return {
            sessionType: 'ai_only',
            isHumanActive: false
        };
    }
}