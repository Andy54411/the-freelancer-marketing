import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { handleChatMessage, getSessionStatus } from './shared/chatbot-utils';
import { generateHandoverMessage } from './shared/learning-utils';

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
 * Enhanced Chatbot API - Ersetzt die alte handleSupportMessage
 */
export const enhancedChatbotAPI = functions.https.onRequest(async (req, res) => {
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
            action = 'chat',
            sessionId,
            userMessage,
            customerId,
            customerName,
            customerEmail,
            supportAgentId,
            supportAgentName
        } = req.body;

        if (!sessionId || !customerId) {
            res.status(400).json({ error: 'SessionId und CustomerId sind erforderlich' });
            return;
        }

        switch (action) {
            case 'chat':
                if (!userMessage) {
                    res.status(400).json({ error: 'UserMessage ist erforderlich für Chat-Aktion' });
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
                if (!supportAgentId || !supportAgentName) {
                    res.status(400).json({ error: 'SupportAgentId und SupportAgentName sind erforderlich' });
                    return;
                }

                await db.collection('support_sessions').doc(sessionId).update({
                    sessionType: 'human_takeover',
                    supportAgentId,
                    supportAgentName,
                    updatedAt: new Date().toISOString()
                });

                const handoverMessage = generateHandoverMessage(supportAgentName);

                res.json({
                    success: true,
                    handoverMessage,
                    sessionType: 'human_takeover',
                    timestamp: new Date().toISOString()
                });
                break;

            case 'get_status':
                const sessionStatus = await getSessionStatus(db, sessionId, console.error);

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
        console.error('Fehler in Enhanced Chatbot API:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});

/**
 * Support Dashboard API
 */
export const supportDashboardAPI = functions.https.onRequest(async (req, res) => {
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

        // Hole aktive Sessions (mit Fallback bei fehlendem Index)
        let activeSessions: any[] = [];
        try {
            const activeSessionsSnapshot = await db.collection('support_sessions')
                .where('sessionType', 'in', ['ai_with_escalation', 'human_takeover'])
                .orderBy('updatedAt', 'desc')
                .limit(50)
                .get();

            activeSessions = activeSessionsSnapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (indexError) {
            console.warn('Index für support_sessions nicht verfügbar, verwende einfache Abfrage');
            // Fallback: Hole alle Sessions ohne komplexe Abfrage
            const allSessionsSnapshot = await db.collection('support_sessions')
                .limit(20)
                .get();

            activeSessions = allSessionsSnapshot.docs
                .map((doc: any) => ({ id: doc.id, ...doc.data() }))
                .filter((session: any) =>
                    session.sessionType === 'ai_with_escalation' ||
                    session.sessionType === 'human_takeover'
                );
        }

        // Hole häufige Fragen (mit Fallback bei fehlendem Index)
        let frequentQuestions: any[] = [];
        try {
            const frequentQuestionsSnapshot = await db.collection('chat_analytics')
                .orderBy('frequency', 'desc')
                .limit(20)
                .get();

            frequentQuestions = frequentQuestionsSnapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (indexError) {
            console.warn('Index für chat_analytics nicht verfügbar, verwende einfache Abfrage');
            // Fallback: Hole alle Fragen ohne Sortierung
            const allQuestionsSnapshot = await db.collection('chat_analytics')
                .limit(20)
                .get();

            frequentQuestions = allQuestionsSnapshot.docs
                .map((doc: any) => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => (b.frequency || 0) - (a.frequency || 0));
        }

        res.json({
            success: true,
            escalations,
            activeSessions,
            frequentQuestions,
            summary: {
                totalEscalations: escalations.length,
                totalActiveSessions: activeSessions.length,
                totalFrequentQuestions: frequentQuestions.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Fehler im Support Dashboard API:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
