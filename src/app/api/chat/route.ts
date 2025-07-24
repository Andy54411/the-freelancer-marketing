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

const MODEL_NAME = 'gemini-1.5-flash-latest';

export async function POST(request: Request) {
  try {
    const { history, message } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Log the error on the server for debugging
      console.error('Fehler: GEMINI_API_KEY ist in den Umgebungsvariablen nicht gesetzt.');
      // Return a specific error message to the client
      return NextResponse.json(
        { error: 'Die Server-Konfiguration ist unvollständig. Der API-Schlüssel fehlt.' },
        { status: 500 }
      );
    }

    // Sammle Chat-Historie für Auftragserkennung
    const chatHistory = history.map((msg: any) => msg.parts[0].text);

    // KORREKTUR: Verwende die geteilte Funktion und übergebe die aktuelle Nachricht und Historie
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
              chatHistory: history.map((msg: any) => ({
                text: msg.parts[0].text,
                role: msg.role,
                timestamp: new Date(),
              })),
            },
            { merge: true }
          );

        // Füge die Eskalations-Nachricht als erste Support-Message hinzu
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
        console.error('Fehler bei der Eskalation:', escalationError);
        // Fallback: Normale Antwort ohne Eskalation
        const cleanedText = text.replace(/\[escalate\]/g, '').trim();
        return NextResponse.json({ text: cleanedText });
      }
    }

    return NextResponse.json({ text });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    console.error('Fehler in der Gemini API-Route:', errorMessage);
    // Return a more generic error for other cases to avoid leaking implementation details
    return NextResponse.json(
      { error: 'Ein interner Serverfehler ist aufgetreten.' },
      { status: 500 }
    );
  }
}
