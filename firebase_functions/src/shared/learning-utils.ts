import type { Firestore } from "firebase-admin/firestore";

export interface ChatAnalytics {
    id: string;
    question: string;
    questionCategory: string;
    frequency: number;
    lastAsked: string;
    avgResolutionTime: number;
    escalationRate: number;
    commonAnswers: string[];
    relatedOrderStatuses: string[];
    createdAt: string;
    updatedAt: string;
}

export interface EscalationTrigger {
    id: string;
    triggerType: 'keywords' | 'sentiment' | 'complexity' | 'repetition';
    condition: string;
    threshold: number;
    isActive: boolean;
    createdAt: string;
}

export interface SupportSession {
    id: string;
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    sessionType: 'ai_only' | 'ai_with_escalation' | 'human_takeover';
    startTime: string;
    endTime?: string;
    totalMessages: number;
    aiMessages: number;
    humanMessages: number;
    escalationReason?: string;
    escalationTime?: string;
    supportAgentId?: string;
    supportAgentName?: string;
    resolutionStatus: 'pending' | 'resolved' | 'escalated' | 'closed';
    satisfactionRating?: number;
    relatedOrderIds: string[];
    chatHistory: ChatMessage[];
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    sender: 'customer' | 'ai' | 'human_agent';
    senderName?: string;
    message: string;
    timestamp: string;
    isEscalationTrigger?: boolean;
    confidence?: number;
    relatedOrderIds?: string[];
    messageType: 'text' | 'system' | 'escalation_notice' | 'handover_notice';
}

type FirestoreInstance = Pick<Firestore, 'collection'>;

/**
 * Analysiert eine Frage und kategorisiert sie
 */
export function analyzeQuestion(question: string): {
    category: string;
    keywords: string[];
    complexity: number;
    sentiment: 'positive' | 'neutral' | 'negative';
} {
    const lowerQuestion = question.toLowerCase();

    // Kategorisierung
    let category = 'general';
    if (lowerQuestion.includes('stornieren') || lowerQuestion.includes('cancel')) {
        category = 'cancellation';
    } else if (lowerQuestion.includes('rechnung') || lowerQuestion.includes('bezahlung')) {
        category = 'billing';
    } else if (lowerQuestion.includes('termin') || lowerQuestion.includes('datum')) {
        category = 'scheduling';
    } else if (lowerQuestion.includes('anbieter') || lowerQuestion.includes('provider')) {
        category = 'provider';
    } else if (lowerQuestion.includes('problem') || lowerQuestion.includes('fehler')) {
        category = 'technical';
    }

    // Schlüsselwörter extrahieren
    const keywords = lowerQuestion.match(/\b\w{4,}\b/g) || [];

    // Komplexität bewerten (1-10)
    let complexity = 1;
    if (lowerQuestion.includes('?')) complexity += 1;
    if (lowerQuestion.split(' ').length > 15) complexity += 2;
    if (lowerQuestion.includes('aber') || lowerQuestion.includes('jedoch')) complexity += 1;
    if (lowerQuestion.includes('warum') || lowerQuestion.includes('wieso')) complexity += 2;

    // Sentiment analysieren
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    const negativeWords = ['problem', 'fehler', 'ärgern', 'schlecht', 'unzufrieden'];
    const positiveWords = ['danke', 'gut', 'super', 'toll', 'perfekt'];

    if (negativeWords.some(word => lowerQuestion.includes(word))) {
        sentiment = 'negative';
    } else if (positiveWords.some(word => lowerQuestion.includes(word))) {
        sentiment = 'positive';
    }

    return { category, keywords, complexity, sentiment };
}

/**
 * Speichert eine neue Frage oder aktualisiert die Häufigkeit
 */
export async function recordQuestion(
    db: FirestoreInstance,
    question: string,
    category: string,
    resolutionTime: number,
    wasEscalated: boolean,
    relatedOrderIds: string[] = [],
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<void> {
    try {
        const questionsRef = db.collection('chat_analytics');
        const normalizedQuestion = question.toLowerCase().trim();

        // Suche nach ähnlichen Fragen
        const existingQuestions = await questionsRef
            .where('questionCategory', '==', category)
            .get();

        let existingDoc: ChatAnalytics | null = null;
        let existingDocId: string | null = null;

        // Suche nach ähnlichen Fragen
        for (const doc of existingQuestions.docs) {
            const data = doc.data() as ChatAnalytics;
            if (data.question.toLowerCase().includes(normalizedQuestion.substring(0, 20))) {
                existingDoc = data;
                existingDocId = doc.id;
                break;
            }
        }

        if (existingDoc && existingDocId) {
            // Aktualisiere bestehende Frage
            const newFrequency = existingDoc.frequency + 1;
            const newAvgResolutionTime = (existingDoc.avgResolutionTime * existingDoc.frequency + resolutionTime) / newFrequency;
            const newEscalationRate = wasEscalated ?
                (existingDoc.escalationRate * existingDoc.frequency + 1) / newFrequency :
                existingDoc.escalationRate * existingDoc.frequency / newFrequency;

            await questionsRef.doc(existingDocId).update({
                frequency: newFrequency,
                lastAsked: new Date().toISOString(),
                avgResolutionTime: newAvgResolutionTime,
                escalationRate: newEscalationRate,
                relatedOrderStatuses: [...new Set([...existingDoc.relatedOrderStatuses, ...relatedOrderIds])],
                updatedAt: new Date().toISOString()
            });
        } else {
            // Neue Frage erstellen
            await questionsRef.add({
                question: normalizedQuestion,
                questionCategory: category,
                frequency: 1,
                lastAsked: new Date().toISOString(),
                avgResolutionTime: resolutionTime,
                escalationRate: wasEscalated ? 1 : 0,
                commonAnswers: [],
                relatedOrderStatuses: relatedOrderIds,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
    } catch (error) {
        logError('Fehler beim Speichern der Frage:', error);
    }
}

/**
 * Prüft, ob eine Eskalation nötig ist
 */
export async function checkEscalationTriggers(
    db: FirestoreInstance,
    question: string,
    category: string,
    complexity: number,
    sentiment: 'positive' | 'neutral' | 'negative',
    customerMessageCount: number,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<{ shouldEscalate: boolean; reason?: string }> {
    try {
        const triggersRef = db.collection('escalation_triggers');
        const activeTriggers = await triggersRef.where('isActive', '==', true).get();

        for (const triggerDoc of activeTriggers.docs) {
            const trigger = triggerDoc.data() as EscalationTrigger;

            switch (trigger.triggerType) {
                case 'keywords':
                    if (question.toLowerCase().includes(trigger.condition.toLowerCase())) {
                        return { shouldEscalate: true, reason: `Schlüsselwort erkannt: ${trigger.condition}` };
                    }
                    break;

                case 'sentiment':
                    if (sentiment === 'negative' && trigger.threshold <= 1) {
                        return { shouldEscalate: true, reason: 'Negative Stimmung erkannt' };
                    }
                    break;

                case 'complexity':
                    if (complexity >= trigger.threshold) {
                        return { shouldEscalate: true, reason: `Hohe Komplexität: ${complexity}` };
                    }
                    break;

                case 'repetition':
                    if (customerMessageCount >= trigger.threshold) {
                        return { shouldEscalate: true, reason: `Viele Nachrichten: ${customerMessageCount}` };
                    }
                    break;
            }
        }

        return { shouldEscalate: false };
    } catch (error) {
        logError('Fehler beim Prüfen der Eskalation:', error);
        return { shouldEscalate: false };
    }
}

/**
 * Erstellt eine neue Support-Session
 */
export async function createSupportSession(
    db: FirestoreInstance,
    customerId: string,
    customerName?: string,
    customerEmail?: string,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<string> {
    try {
        const sessionRef = await db.collection('support_sessions').add({
            customerId,
            customerName,
            customerEmail,
            sessionType: 'ai_only',
            startTime: new Date().toISOString(),
            totalMessages: 0,
            aiMessages: 0,
            humanMessages: 0,
            resolutionStatus: 'pending',
            relatedOrderIds: [],
            chatHistory: [],
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return sessionRef.id;
    } catch (error) {
        logError('Fehler beim Erstellen der Support-Session:', error);
        throw error;
    }
}

/**
 * Eskaliert eine Session zu einem menschlichen Support-Mitarbeiter
 */
export async function escalateToHuman(
    db: FirestoreInstance,
    sessionId: string,
    reason: string,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<void> {
    try {
        await db.collection('support_sessions').doc(sessionId).update({
            sessionType: 'ai_with_escalation',
            escalationReason: reason,
            escalationTime: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Benachrichtigung an Support-Team senden
        await db.collection('support_notifications').add({
            type: 'escalation_requested',
            sessionId,
            reason,
            priority: 'high',
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        logError('Fehler beim Eskalieren:', error);
        throw error;
    }
}

/**
 * Markiert eine Session als von einem menschlichen Agent übernommen
 */
export async function markHumanTakeover(
    db: FirestoreInstance,
    sessionId: string,
    supportAgentId: string,
    supportAgentName: string,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<void> {
    try {
        await db.collection('support_sessions').doc(sessionId).update({
            sessionType: 'human_takeover',
            supportAgentId,
            supportAgentName,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        logError('Fehler beim Markieren der menschlichen Übernahme:', error);
        throw error;
    }
}

/**
 * Holt die häufigsten Fragen für Verbesserungen
 */
export async function getFrequentQuestions(
    db: FirestoreInstance,
    limit: number = 20,
    logError: (message: string, ...args: any[]) => void = console.error
): Promise<ChatAnalytics[]> {
    try {
        const questionsRef = db.collection('chat_analytics');
        const frequentQuestions = await questionsRef
            .orderBy('frequency', 'desc')
            .limit(limit)
            .get();

        return frequentQuestions.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatAnalytics));
    } catch (error) {
        logError('Fehler beim Abrufen häufiger Fragen:', error);
        return [];
    }
}

/**
 * Generiert eine Eskalationsnachricht für den Kunden
 */
export function generateEscalationMessage(reason: string): string {
    return `
🔄 **Ihr Anliegen wird an unseren Support weitergeleitet**

Ich habe erkannt, dass Ihre Anfrage eine spezielle Betreuung benötigt (${reason}). 

Ein Tasko-Support-Mitarbeiter wird sich in Kürze bei Ihnen melden und Ihnen persönlich weiterhelfen.

⏱️ **Erwartete Antwortzeit:** 5-15 Minuten (Mo-Fr, 9-18 Uhr)

Vielen Dank für Ihr Verständnis!
`.trim();
}

/**
 * Generiert eine Übergabenachricht wenn ein Support-Mitarbeiter übernimmt
 */
export function generateHandoverMessage(supportAgentName: string): string {
    return `
👋 **${supportAgentName} ist jetzt für Sie da**

Hallo! Ich bin ${supportAgentName} vom Tasko-Support-Team und übernehme ab sofort Ihre Betreuung.

Ich habe bereits alle bisherigen Nachrichten gelesen und kann Ihnen direkt weiterhelfen.

Wie kann ich Ihnen behilflich sein?

---
*Sie chatten jetzt mit einem echten Menschen - alle Nachrichten werden von mir persönlich beantwortet.*
`.trim();
}
