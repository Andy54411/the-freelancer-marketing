import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { handleChatMessage, handleHumanTakeover, getSessionStatus } from './shared/chatbot-utils';

// Initialisiere die Admin-App, falls noch nicht geschehen
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

/**
 * Erweiterte Chatbot-Funktion mit Lernen und Eskalation
 */
export const enhancedChatbot = functions.https.onRequest(async (req, res) => {
    // CORS headers setzen
    Object.keys(corsHeaders).forEach(key => {
        res.set(key, corsHeaders[key as keyof typeof corsHeaders]);
    });

    if (req.method === 'OPTIONS') {
        res.status(200).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const {
            sessionId,
            userMessage,
            customerId,
            customerName,
            customerEmail,
            action = 'chat' // 'chat', 'human_takeover', 'get_status'
        } = req.body;

        if (!sessionId || !customerId) {
            res.status(400).json({ error: 'SessionId und CustomerId sind erforderlich' });
            return;
        }

        switch (action) {
            case 'chat':
                if (!userMessage) {
                    res.status(400).json({ error: 'UserMessage ist erforderlich' });
                    return;
                }

                const chatResult = await handleChatMessage(
                    db,
                    sessionId,
                    userMessage,
                    customerId,
                    customerName,
                    customerEmail,
                    console.error
                );

                res.json({
                    success: true,
                    systemInstruction: chatResult.systemInstruction,
                    shouldEscalate: chatResult.shouldEscalate,
                    escalationReason: chatResult.escalationReason,
                    escalationMessage: chatResult.escalationMessage,
                    sessionType: chatResult.sessionType,
                    timestamp: new Date().toISOString()
                });
                break;

            case 'human_takeover':
                const { supportAgentId, supportAgentName } = req.body;

                if (!supportAgentId || !supportAgentName) {
                    res.status(400).json({ error: 'SupportAgentId und SupportAgentName sind erforderlich' });
                    return;
                }

                const handoverMessage = await handleHumanTakeover(
                    db,
                    sessionId,
                    supportAgentId,
                    supportAgentName,
                    console.error
                );

                res.json({
                    success: true,
                    handoverMessage,
                    sessionType: 'human_takeover',
                    timestamp: new Date().toISOString()
                });
                break;

            case 'get_status':
                const sessionStatus = await getSessionStatus(
                    db,
                    sessionId,
                    console.error
                );

                res.json({
                    success: true,
                    ...sessionStatus,
                    timestamp: new Date().toISOString()
                });
                break;

            default:
                res.status(400).json({ error: 'Ungültige Aktion' });
        }

    } catch (error) {
        console.error('Fehler in Enhanced Chatbot:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});

/**
 * Funktion für Support-Mitarbeiter Dashboard
 */
export const supportDashboard = functions.https.onRequest(async (req, res) => {
    Object.keys(corsHeaders).forEach(key => {
        res.set(key, corsHeaders[key as keyof typeof corsHeaders]);
    });

    if (req.method === 'OPTIONS') {
        res.status(200).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Hole wartende Eskalationen
        const escalationsSnapshot = await db.collection('support_notifications')
            .where('type', '==', 'escalation_requested')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const escalations = escalationsSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Hole aktive Sessions
        const activeSessionsSnapshot = await db.collection('support_sessions')
            .where('sessionType', 'in', ['ai_with_escalation', 'human_takeover'])
            .where('resolutionStatus', '==', 'pending')
            .orderBy('updatedAt', 'desc')
            .limit(50)
            .get();

        const activeSessions = activeSessionsSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Hole häufige Fragen
        const frequentQuestionsSnapshot = await db.collection('chat_analytics')
            .orderBy('frequency', 'desc')
            .limit(20)
            .get();

        const frequentQuestions = frequentQuestionsSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            escalations,
            activeSessions,
            frequentQuestions,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Fehler im Support Dashboard:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});

/**
 * Funktion zum Konfigurieren von Eskalationskriterien
 */
export const configureEscalation = functions.https.onRequest(async (req, res) => {
    Object.keys(corsHeaders).forEach(key => {
        res.set(key, corsHeaders[key as keyof typeof corsHeaders]);
    });

    if (req.method === 'OPTIONS') {
        res.status(200).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const {
            triggerType,
            condition,
            threshold,
            isActive = true
        } = req.body;

        if (!triggerType || !condition || threshold === undefined) {
            res.status(400).json({ error: 'TriggerType, Condition und Threshold sind erforderlich' });
            return;
        }

        const escalationTrigger = {
            triggerType,
            condition,
            threshold,
            isActive,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('escalation_triggers').add(escalationTrigger);

        res.json({
            success: true,
            id: docRef.id,
            ...escalationTrigger,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Fehler beim Konfigurieren der Eskalation:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
