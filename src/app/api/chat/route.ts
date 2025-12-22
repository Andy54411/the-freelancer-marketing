import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
  SafetySetting,
} from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { db } from '@/firebase/server'; // Korrekt: Server-Instanz für API-Routen verwenden
import { getSystemInstruction } from '@/shared/chatbot-utils';

// Aktuelles stabiles Modell
const MODEL_NAME = 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const { history, message } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Log the error on the server for debugging

      // Return a specific error message to the client
      return NextResponse.json(
        { error: 'Die Server-Konfiguration ist unvollständig. Der API-Schlüssel fehlt.' },
        { status: 500 }
      );
    }

    // Sammle Chat-Historie für Auftragserkennung
    const chatHistory = history.map((msg: { parts: Array<{ text: string }> }) => msg.parts[0].text);

    // KORREKTUR: Verwende die geteilte Funktion und übergebe die aktuelle Nachricht und Historie
    if (!db) {
      return NextResponse.json({ error: 'Database nicht verfügbar' }, { status: 500 });
    }
    const systemInstruction = await getSystemInstruction(db, console.error, message, chatHistory);

    const genAI = new GoogleGenerativeAI(apiKey);
    // Verwende das dedizierte systemInstruction-Feld für besseres Kontextmanagement
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemInstruction,
    });

    const generationConfig: GenerationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings: SafetySetting[] = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: history, // Die Historie vom Client direkt übergeben
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    // Prüfe auf Eskalations-Trigger
    if (text.includes('[escalate]')) {
      // Hole userId aus dem Request oder verwende eine Session
      const userId = request.headers.get('x-user-id') || 'anonymous';

      try {
        // Erstelle Support-Chat für Eskalation
        const supportChatId = `support_chat_${userId}`;

        // Erstelle oder aktualisiere Support-Chat
        if (!db) {
          throw new Error('Database nicht verfügbar');
        }
        await db
          .collection('supportChats')
          .doc(supportChatId)
          .set(
            {
              userId: userId,
              status: 'human', // Direkt auf human setzen für Eskalation
              createdAt: new Date(),
              lastUpdated: new Date(),
              escalatedFrom: 'gemini-bot',
              lastMessage: {
                text: message, // Die ursprüngliche Benutzer-Nachricht
                timestamp: new Date(),
                senderId: userId,
                isReadBySupport: false,
              },
              // Chat-Historie für Kontext mitgeben
              chatHistory: history.map((msg: { parts: Array<{ text: string }>; role: string }) => ({
                text: msg.parts[0].text,
                role: msg.role,
                timestamp: new Date(),
              })),
            },
            { merge: true }
          );

        // Füge die Eskalations-Nachricht als erste Support-Message hinzu
        if (!db) {
          throw new Error('Database nicht verfügbar');
        }
        await db
          .collection('supportChats')
          .doc(supportChatId)
          .collection('messages')
          .add({
            text: `Chat wurde vom Gemini-Bot eskaliert. Benutzer fragte: "${message}"`,
            senderId: 'system',
            timestamp: new Date(),
            isReadBySupport: false,
            escalationContext: true,
          });

        // Bereinige die Antwort von [escalate] Tags
        const cleanedText = text.replace(/\[escalate\]/g, '').trim();

        return NextResponse.json({
          text: cleanedText,
          escalated: true,
          supportChatId: supportChatId,
          message: 'Ihre Anfrage wurde an unser Support-Team weitergeleitet.',
        });
      } catch (escalationError) {
        // Fallback: Normale Antwort ohne Eskalation
        const cleanedText = text.replace(/\[escalate\]/g, '').trim();
        return NextResponse.json({ text: cleanedText });
      }
    }

    return NextResponse.json({ text });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    
    console.error('[Chat API Error]:', errorMessage);

    // Prüfe auf Rate Limit / Quota Fehler
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
      return NextResponse.json(
        { 
          error: 'Der Support-Chat ist derzeit überlastet. Bitte versuchen Sie es in einer Minute erneut.',
          retryable: true,
          debug: errorMessage
        },
        { status: 429 }
      );
    }

    // Return a more generic error for other cases to avoid leaking implementation details
    return NextResponse.json(
      { error: 'Ein interner Serverfehler ist aufgetreten.', debug: errorMessage },
      { status: 500 }
    );
  }
}
