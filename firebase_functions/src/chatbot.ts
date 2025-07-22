import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore"; // NEU: Direkter Import von FieldValue
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getSystemInstruction } from "./shared/chatbot-utils";
import { analyzeQuestion, checkEscalationTriggers, generateEscalationMessage, recordQuestion } from "./shared/learning-utils";

// Initialisiere die Admin-App, falls noch nicht geschehen
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// --- KORREKTUR: Lazy Initialization für den Gemini Client ---
// Dies stellt sicher, dass process.env.GEMINI_API_KEY gelesen wird,
// NACHDEM dotenv in index.ts die .env.local-Datei geladen hat.
let genAI: GoogleGenerativeAI | null = null;

function getGenAIClient(): GoogleGenerativeAI {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            logger.error("FATAL: GEMINI_API_KEY ist nicht in der Umgebung konfiguriert. Der Chatbot kann nicht funktionieren.");
            // In einer echten Anwendung würde man hier vielleicht anders reagieren, aber für den Bot ist das ein fataler Fehler.
            throw new Error("GEMINI_API_KEY is not configured in the environment.");
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

// Diese Funktion wird bei jeder neuen Nachricht in einem Support-Chat ausgelöst
export const handleSupportMessage = onDocumentCreated("supportChats/{chatId}/messages/{messageId}", async (event) => {
    const { chatId, messageId } = event.params;
    const messageData = event.data?.data();

    if (!messageData) {
        logger.log(`Keine Daten für Nachricht ${messageId} gefunden.`);
        return null;
    }

    // Ignoriere Nachrichten, die vom Bot selbst oder von Support-Mitarbeitern gesendet wurden
    if (messageData.senderType === "bot" || messageData.senderType === "support") {
        logger.log(`Nachricht ${messageId} von Bot/Support ignoriert.`);
        return null;
    }

    const chatRef = db.collection("supportChats").doc(chatId);
    const chatDoc = await chatRef.get();
    const chatData = chatDoc.data();

    // Verarbeite nur, wenn der Chat im 'bot'-Modus ist
    if (!chatData || chatData.status !== "bot") {
        logger.log(`Chat ${chatId} ist nicht im Bot-Modus. Verarbeitung wird übersprungen.`);
        return null;
    }

    try {
        // Sammle Chat-Historie für Kontext
        const messagesQuery = await chatRef.collection("messages")
            .orderBy("timestamp", "asc")
            .get();

        const history = messagesQuery.docs.map(doc => {
            const data = doc.data();
            return data.text;
        });

        // Analysiere die Nachricht für Lernen und Eskalation
        const userMessage = messageData.text;
        const analysis = analyzeQuestion(userMessage);

        // Prüfe Eskalationskriterien
        const customerMessageCount = messagesQuery.docs.filter(doc =>
            doc.data().senderType === 'kunde'
        ).length;

        const escalationCheck = await checkEscalationTriggers(
            db,
            userMessage,
            analysis.category,
            analysis.complexity,
            analysis.sentiment,
            customerMessageCount,
            logger.error
        );

        // Wenn Eskalation nötig ist, sende Eskalationsnachricht
        if (escalationCheck.shouldEscalate) {
            const escalationMessage = generateEscalationMessage(escalationCheck.reason!);

            // Speichere Eskalationsnachricht
            await chatRef.collection("messages").add({
                text: escalationMessage,
                timestamp: FieldValue.serverTimestamp(),
                senderType: "bot",
                senderName: "Taskilo KI-Support",
                messageType: "escalation_notice",
                escalationReason: escalationCheck.reason
            });

            // Markiere Chat als eskaliert
            await chatRef.update({
                status: "escalated",
                escalationReason: escalationCheck.reason,
                escalationTime: FieldValue.serverTimestamp()
            });

            // Benachrichtige Support-Team
            await db.collection('support_notifications').add({
                type: 'escalation_requested',
                chatId: chatId,
                reason: escalationCheck.reason,
                priority: 'high',
                status: 'pending',
                customerMessage: userMessage,
                createdAt: FieldValue.serverTimestamp()
            });

            logger.log(`Chat ${chatId} eskaliert: ${escalationCheck.reason}`);
            return null;
        }

        // Lade die dynamische Systemanweisung und übergebe die aktuelle Nachricht und Historie
        const systemInstruction = await getSystemInstruction(
            db,
            logger.error,
            messageData.text,
            history
        );

        const model = getGenAIClient().getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ]
        });

        const geminiHistory = messagesQuery.docs.map(doc => {
            const data = doc.data();
            // Konvertiere Firestore-Nachrichten in das von Gemini erwartete Format
            return {
                role: data.senderType === 'kunde' ? 'user' : 'model',
                parts: [{ text: data.text }]
            };
        });

        // Die letzte Nachricht ist die aktuelle Benutzernachricht, die nicht in der Historie sein sollte.
        geminiHistory.pop();

        const chatSession = model.startChat({ history: geminiHistory });
        const result = await chatSession.sendMessage(messageData.text);
        const botResponseText = result.response.text();

        // NEU: Robuste Eskalationsprüfung mit speziellem Tag
        const shouldEscalate = botResponseText.includes("[escalate]");
        // Bereinige die Antwort, damit der Benutzer das Tag nicht sieht.
        const cleanResponseText = botResponseText.replace("[escalate]", "").trim();

        // Zuerst die Antwort des Bots senden, damit der Benutzer sie sofort sieht.
        await chatRef.collection("messages").add({
            text: cleanResponseText,
            senderId: "chatbot",
            senderType: "bot",
            timestamp: FieldValue.serverTimestamp(), // KORREKTUR: Direkte Verwendung von FieldValue
            chatUsers: chatData.users || [chatData.userId].filter(Boolean), // KORREKTUR: Fallback, um 'undefined' zu vermeiden.
        });

        const updatePayload: { [key: string]: any } = {
            lastMessage: {
                text: cleanResponseText,
                timestamp: FieldValue.serverTimestamp(), // KORREKTUR: Ein Promise kann hier nicht aufgelöst werden. serverTimestamp() ist die korrekte Methode.
                senderId: "chatbot",
                isReadBySupport: false,
            },
            lastUpdated: FieldValue.serverTimestamp(), // KORREKTUR: Direkte Verwendung von FieldValue
        };

        // Wenn eine Weiterleitung erkannt wurde, den Status ändern und eine Benachrichtigung erstellen.
        if (shouldEscalate) {
            updatePayload.status = "human";
            logger.log(`Chat ${chatId} wird aufgrund der Bot-Antwort an einen menschlichen Support übergeben.`);

            await db.collection("notifications").add({
                type: "SUPPORT_REQUEST",
                message: `Ein neuer Support-Fall von ${chatData.userName || 'einem Nutzer'} wartet.`,
                chatId: chatId,
                userId: chatData.userId,
                read: false,
                createdAt: FieldValue.serverTimestamp(),
                link: `/dashboard/admin/support?chatId=${chatId}`,
            });
        }

        await chatRef.update(updatePayload);

        // Speichere Analytics für die Frage (nach erfolgreicher Antwort)
        try {
            const resolutionTime = Date.now() - (messageData.timestamp?.toMillis() || Date.now());

            await recordQuestion(
                db,
                userMessage,
                analysis.category,
                resolutionTime / 1000, // In Sekunden
                shouldEscalate,
                [], // Order IDs werden bereits in getSystemInstruction extrahiert
                logger.error
            );
        } catch (analyticsError) {
            logger.error("Fehler beim Speichern der Analytics:", analyticsError);
        }

        return logger.log(`Bot-Antwort für Chat ${chatId} gesendet.`);
    } catch (error) {
        logger.error(`Fehler bei der Verarbeitung der Bot-Nachricht für Chat ${chatId}:`, error);
        await chatRef.update({ status: "human" });

        // NEU: Erstelle auch im Fehlerfall eine Benachrichtigung, da der Chat an einen Menschen übergeben wird.
        await db.collection("notifications").add({
            type: "SUPPORT_REQUEST_ESCALATION",
            message: `Ein Chat mit ${chatData?.userName || 'einem Nutzer'} wurde wegen eines Fehlers an den Support übergeben.`,
            chatId: chatId,
            userId: chatData?.userId,
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            link: `/dashboard/admin/support?chatId=${chatId}`,
        });

        return null;
    }
});
