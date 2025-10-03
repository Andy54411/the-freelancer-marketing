import {
  GoogleGenerativeAI,
  GenerationConfig,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { NextResponse } from 'next/server';

const MODEL_NAME = 'gemini-1.5-flash-latest';

export async function POST(request: Request) {
  try {
    const {
      companyName,
      industry,
      selectedSubcategory,
      city,
      country,
      website,
      currentDescription,
    } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Die Server-Konfiguration ist unvollständig. Der API-Schlüssel fehlt.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // System-Anweisung für die Firmenbeschreibung
    const systemInstruction = `Du bist ein professioneller Texter, der ansprechende und überzeugende Firmenbeschreibungen für öffentliche Profile erstellt.

Deine Aufgabe ist es, eine professionelle, kundenorientierte Firmenbeschreibung zu erstellen, die:
- Professionell und vertrauenswürdig klingt
- Die Expertise und Erfahrung des Unternehmens hervorhebt
- Kundennutzen und Vorteile betont
- Zwischen 150-300 Wörtern lang ist
- Authentisch und nicht übertrieben wirkt
- Informativ und sachlich bleibt

Vermeide UNBEDINGT:
- Übertriebene Superlative
- Klischeehafte Formulierungen
- Zu technische Details
- Rechtschreibfehler
- Direkte Aufforderungen wie "Rufen Sie an", "Schreiben Sie mir", "Kontaktieren Sie mich"
- Persönliche Ansprachen wie "ich bin gespannt auf Ihre Anfrage"
- Call-to-Action Formulierungen
- Direkte Kontaktaufforderungen

Schreibe in professionellem Deutsch und verwende die "Sie"-Form für Kunden. Fokussiere dich auf die Leistungen und Kompetenzen des Unternehmens, nicht auf Kontaktaufforderungen.`;

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemInstruction,
    });

    const generationConfig: GenerationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 500,
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

    // Erstelle den Prompt
    let prompt = `Erstelle eine professionelle Firmenbeschreibung für das folgende Unternehmen:

Firmenname: ${companyName}
Branche: ${industry}
Spezialisierung: ${selectedSubcategory}
Standort: ${city}, ${country}`;

    if (website) {
      prompt += `\nWebsite: ${website}`;
    }

    if (currentDescription) {
      prompt += `\n\nAktuelle Beschreibung (als Referenz): ${currentDescription}`;
    }

    prompt += `\n\nErstelle eine ansprechende, professionelle Firmenbeschreibung, die die Kompetenzen und Leistungen des Unternehmens hervorhebt. Fokussiere dich auf Expertise, Erfahrung und Kundennutzen - OHNE direkte Kontaktaufforderungen.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    const generatedText = response.text();

    return NextResponse.json({ description: generatedText });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'Error';

    // Spezifischere Fehlerbehandlung
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'API-Schlüssel ist ungültig oder nicht konfiguriert' },
        { status: 500 }
      );
    }

    if (errorMessage.includes('quota')) {
      return NextResponse.json(
        { error: 'API-Limit erreicht. Versuchen Sie es später erneut.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Fehler bei der Generierung der Beschreibung. Bitte versuchen Sie es erneut.' },
      { status: 500 }
    );
  }
}
