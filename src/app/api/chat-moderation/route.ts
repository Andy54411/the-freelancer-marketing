import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
  SafetySetting,
} from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

const MODEL_NAME = 'gemini-1.5-flash-latest';

// Standard Moderation Rules (können über AI-Config überschrieben werden)
const DEFAULT_MODERATION_RULES = [
  'Keine Weitergabe von persönlichen Kontaktdaten (E-Mail, Telefon, Adresse)',
  'Keine beleidigenden oder diskriminierenden Inhalte',
  'Keine Spam oder wiederholte unerwünschte Nachrichten',
  'Keine illegalen Angebote oder Aktivitäten',
  'Keine Umgehung der Plattform-Gebühren',
  'Respektvolle und professionelle Kommunikation',
  'Keine falschen oder irreführenden Informationen',
  'Keine sexuellen oder expliziten Inhalte',
];

export async function POST(request: NextRequest) {
  try {
    const { message, chatId, senderId, chatType } = await request.json();

    if (!message || !chatId) {
      return NextResponse.json(
        { error: 'Nachricht und Chat-ID sind erforderlich' },
        { status: 400 }
      );
    }

    // AI-Config aus Firestore laden
    const configDoc = await db.collection('chatbot_config').doc('knowledge_base').get();
    const config = configDoc.exists ? configDoc.data() : {};

    const moderationEnabled = config?.moderationEnabled ?? true;

    if (!moderationEnabled) {
      return NextResponse.json({
        isViolation: false,
        severity: 'none',
        reason: 'Moderation disabled',
        action: 'allow',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {

      return NextResponse.json(
        { error: 'Die Server-Konfiguration ist unvollständig.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig: GenerationConfig = {
      temperature: 0.1, // Niedrige Temperatur für konsistente Moderation
      topK: 1,
      topP: 1,
      maxOutputTokens: 500,
    };

    const safetySettings: SafetySetting[] = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
    ];

    // Verwende Custom Moderation Rules oder Default
    const moderationRules = config?.moderationRules?.length
      ? config.moderationRules
      : DEFAULT_MODERATION_RULES;

    const systemContext = `Du bist ein KI-Moderator für die Taskilo-Plattform.
    Deine Aufgabe ist es, Chat-Nachrichten auf Verstöße gegen die Plattform-Regeln zu prüfen.

    PLATTFORM-REGELN:
    ${moderationRules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

    KONTEXT:
    - Chat-Typ: ${chatType}
    - Chat-ID: ${chatId}
    - Sender: ${senderId}

    Analysiere die Nachricht und bewerte sie nach folgenden Kriterien:
    - Verstößt sie gegen eine der Regeln?
    - Wie schwerwiegend ist der Verstoß?
    - Welche Aktion sollte ergriffen werden?

    Antworte im JSON-Format mit:
    {
      "isViolation": boolean,
      "severity": "none" | "low" | "medium" | "high" | "critical",
      "violatedRules": [Regel-Nummern],
      "reason": "Kurze Erklärung",
      "confidence": 0-100,
      "action": "allow" | "flag" | "block" | "escalate",
      "suggestedResponse": "Falls block: Begründung für User"
    }`;

    const prompt = `Prüfe folgende Chat-Nachricht auf Regelverstöße:

NACHRICHT: "${message}"

Analysiere diese Nachricht sorgfältig und bewerte sie nach den Plattform-Regeln.`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemContext}\n\n${prompt}` }],
        },
      ],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    const text = response.text();

    // Versuche JSON zu parsen
    let moderationResult;
    try {
      moderationResult = JSON.parse(text);
    } catch (parseError) {

      // Fallback bei Parse-Fehler
      moderationResult = {
        isViolation: false,
        severity: 'none',
        reason: 'AI response parsing failed',
        action: 'allow',
        confidence: 0,
      };
    }

    // Zusätzliche Regel-basierte Prüfungen (Backup)
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(\+49|0)[0-9\s\-]{8,}/g;

    if (emailRegex.test(message) || phoneRegex.test(message)) {
      moderationResult = {
        isViolation: true,
        severity: 'high',
        violatedRules: [1],
        reason: 'Kontaktdaten (E-Mail oder Telefon) erkannt',
        confidence: 95,
        action: 'block',
        suggestedResponse:
          'Die Weitergabe von Kontaktdaten ist nicht gestattet. Bitte nutzen Sie die Plattform für die Kommunikation.',
      };
    }

    // Log für Admin-Dashboard (falls nötig)
    if (moderationResult.isViolation && moderationResult.severity !== 'low') {
      await logModerationEvent({
        chatId,
        senderId,
        message,
        moderationResult,
        timestamp: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      ...moderationResult,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';

    // Bei Fehlern: Erlauben, aber loggen
    return NextResponse.json({
      isViolation: false,
      severity: 'none',
      reason: 'Moderation error - message allowed',
      action: 'allow',
      error: true,
    });
  }
}

// Funktion zum Loggen von Moderation-Events
async function logModerationEvent(event: {
  chatId: string;
  senderId: string;
  message: string;
  moderationResult: any;
  timestamp: Date;
}) {
  try {
    await db.collection('moderationLogs').add({
      ...event,
      reviewed: false,
    });
  } catch (error) {

  }
}
