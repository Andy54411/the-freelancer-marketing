import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
  SafetySetting,
} from '@google/generative-ai';
import { NextResponse } from 'next/server';

const MODEL_NAME = 'gemini-1.5-flash-latest';

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Fehler: GEMINI_API_KEY ist in den Umgebungsvariablen nicht gesetzt.');
      return NextResponse.json(
        { error: 'Die Server-Konfiguration ist unvollständig. Der API-Schlüssel fehlt.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig: GenerationConfig = {
      temperature: 0.7,
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

    let prompt = '';
    let systemContext = '';

    switch (action) {
      case 'generateProjectIdeas':
        systemContext = `Du bist ein KI-Projektmanagement-Assistent für die Tasko-Plattform, einer Service-Marketplace-App. 
        Tasko verbindet Kunden mit Dienstleistern in Bereichen wie Handwerk, IT, Haushalt, Transport, etc.
        
        Deine Aufgabe ist es, innovative und praktische Projektideen für Benutzer zu generieren, basierend auf den verfügbaren Services auf der Plattform.`;

        prompt = `Generiere 5 innovative Projektideen für einen Benutzer der Tasko-Plattform. 
        Die Ideen sollten:
        - Praktisch und umsetzbar sein
        - Verschiedene Service-Kategorien einbeziehen (Handwerk, IT, Haushalt, Transport, etc.)
        - Einen klaren Nutzen bieten
        - Für Privatpersonen oder kleine Unternehmen geeignet sein
        
        Format: JSON Array mit Objekten, die folgende Felder enthalten:
        - title: Kurzer, prägnanter Titel
        - description: Detaillierte Beschreibung (2-3 Sätze)
        - category: Hauptkategorie des Projekts
        - estimatedBudget: Geschätztes Budget in Euro
        - timeline: Geschätzte Dauer
        - services: Array der benötigten Services
        - priority: 'low', 'medium' oder 'high'
        
        Beispiel-Kategorien: Handwerk, IT & Digital, Haushalt & Reinigung, Transport & Umzug, Garten & Landschaft, etc.`;
        break;

      case 'analyzeProject':
        systemContext = `Du bist ein KI-Projektmanagement-Experte für die Tasko-Plattform. 
        Analysiere das gegebene Projekt und gib hilfreiche Verbesserungsvorschläge.`;

        prompt = `Analysiere folgendes Projekt und gib Verbesserungsvorschläge:
        
        Projekt: ${JSON.stringify(data.project)}
        
        Bitte analysiere:
        1. Projektstruktur und Ziele
        2. Zeitplanung und Budgetschätzung
        3. Risiken und Herausforderungen
        4. Optimierungsmöglichkeiten
        5. Empfohlene nächste Schritte
        
        Format: JSON Objekt mit folgenden Feldern:
        - analysis: Allgemeine Analyse des Projekts
        - suggestions: Array von Verbesserungsvorschlägen
        - risks: Array identifizierter Risiken
        - nextSteps: Array empfohlener nächster Schritte
        - optimizations: Array von Optimierungsmöglichkeiten`;
        break;

      case 'generateTasks':
        systemContext = `Du bist ein KI-Assistent für Projektmanagement auf der Tasko-Plattform.
        Erstelle detaillierte Aufgabenlisten für Projekte.`;

        prompt = `Erstelle eine detaillierte Aufgabenliste für folgendes Projekt:
        
        Titel: ${data.title}
        Beschreibung: ${data.description}
        Kategorie: ${data.category}
        Budget: ${data.budget ? `€${data.budget}` : 'Nicht angegeben'}
        
        Erstelle 5-10 konkrete, umsetzbare Aufgaben.
        
        Format: JSON Array mit Objekten:
        - title: Kurzer Aufgabentitel
        - description: Detaillierte Beschreibung
        - estimatedHours: Geschätzte Stunden
        - priority: 'low', 'medium' oder 'high'
        - dependencies: Array von Abhängigkeiten zu anderen Aufgaben
        - requiredServices: Benötigte Services von Tasko
        - status: 'todo' (initial)`;
        break;

      case 'projectConsultation':
        systemContext = `Du bist ein erfahrener Projektmanagement-Berater für die Tasko-Plattform.
        Gib professionelle Beratung zu Projektfragen.`;

        prompt = `Beantworte folgende Projektfrage professionell und hilfreich:
        
        Frage: ${data.question}
        
        ${data.projectContext ? `Projektkontext: ${data.projectContext}` : ''}
        
        Gib eine strukturierte, hilfreiche Antwort mit:
        1. Direkter Antwort auf die Frage
        2. Praktischen Empfehlungen
        3. Möglichen nächsten Schritten
        4. Relevanten Tasko-Services, die helfen könnten
        
        Antworte auf Deutsch und sei konkret und umsetzungsorientiert.`;
        break;

      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
    }

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

    // Versuche JSON zu parsen, falls es sich um strukturierte Daten handelt
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch {
      parsedResponse = { text: text };
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse,
      action: action,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    console.error('Fehler in der Projekt-KI API-Route:', errorMessage);
    return NextResponse.json(
      { error: 'Ein interner Serverfehler ist aufgetreten.' },
      { status: 500 }
    );
  }
}
