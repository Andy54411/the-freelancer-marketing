import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, SafetySetting } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { db } from '@/firebase/server'; // Korrekt: Server-Instanz für API-Routen verwenden

const MODEL_NAME = "gemini-1.5-flash-latest";

// Einfacher In-Memory-Cache, um Firestore-Abfragen zu reduzieren
let cachedSystemInstruction: string | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 Minuten

async function getSystemInstruction(): Promise<string> {
    const now = Date.now();
    if (cachedSystemInstruction && (now - lastFetchTime < CACHE_DURATION_MS)) {
        return cachedSystemInstruction;
    }

    try {
        const docRef = db.collection('chatbot_config').doc('knowledge_base');
        const configDoc = await docRef.get();
        if (!configDoc.exists) {
            throw new Error("Chatbot 'knowledge_base' Dokument nicht in Firestore gefunden.");
        }
        const configData = configDoc.data();

        // Dynamisches Erstellen der Anweisung aus den Firestore-Daten
        const persona = configData?.persona || "Du bist ein hilfsbereiter Assistent.";
        const context = configData?.context || "Tasko ist eine Plattform.";
        const faqs = configData?.faqs || [];
        const rules = configData?.rules || [];

        const faqString = faqs.map((faq: { q: string, a: string }, index: number) =>
            `${index + 1}.  **Frage: ${faq.q}**\n    *   **Antwort:** ${faq.a}`
        ).join('\n\n');

        const rulesString = rules.map((rule: string) => `- ${rule}`).join('\n');

        const instruction = `
${persona}

## Kontext über Tasko:
${context}

## Deine Wissensdatenbank (Antworte NUR basierend auf diesen Informationen):
**Häufig gestellte Fragen (FAQ):**
${faqString}

## Verhaltensregeln:
${rulesString}
        `.trim();

        cachedSystemInstruction = instruction;
        lastFetchTime = now;
        return cachedSystemInstruction;
    } catch (error) {
        console.error("Fehler beim Laden der Chatbot-Konfiguration aus Firestore:", error);
        // Fallback auf eine Standard-Anweisung, falls Firestore fehlschlägt
        return "Du bist ein hilfsbereiter Assistent für Tasko. Antworte freundlich und auf Deutsch.";
    }
}

export async function POST(request: Request) {
    try {
        const { history, message } = await request.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Log the error on the server for debugging
            console.error("Fehler: GEMINI_API_KEY ist in den Umgebungsvariablen nicht gesetzt.");
            // Return a specific error message to the client
            return NextResponse.json({ error: "Die Server-Konfiguration ist unvollständig. Der API-Schlüssel fehlt." }, { status: 500 });
        }

        const systemInstruction = await getSystemInstruction();

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
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        const chat = model.startChat({
            generationConfig,
            safetySettings,
            history: history, // Die Historie vom Client direkt übergeben
        });

        const result = await chat.sendMessage(message);
        const response = result.response;
        const text = response.text();

        return NextResponse.json({ text });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.";
        console.error("Fehler in der Gemini API-Route:", errorMessage);
        // Return a more generic error for other cases to avoid leaking implementation details
        return NextResponse.json({ error: "Ein interner Serverfehler ist aufgetreten." }, { status: 500 });
    }
}