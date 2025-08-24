import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
  SafetySetting,
} from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { categories } from '@/lib/categoriesData';

const MODEL_NAME = 'gemini-1.5-flash-latest';

// Umfassende Kategorie-Datenbank für detaillierte KI-Fragen
const CATEGORY_QUESTION_DATABASE = {
  Handwerk: {
    commonQuestions: [
      'Welche Art von handwerklicher Arbeit benötigen Sie?',
      'Wie groß ist der Arbeitsbereich/das Objekt?',
      'Sind Materialien bereits vorhanden oder müssen sie besorgt werden?',
      'Ist der Arbeitsplatz gut zugänglich?',
      'Benötigen Sie eine Abnahme oder Gewährleistung?',
    ],
    subcategories: {
      Elektriker: [
        'Ist der Strom bereits abgeschaltet?',
        'Benötigen Sie eine Elektroinstallation oder Reparatur?',
        'Müssen Sicherheitsprüfungen durchgeführt werden?',
      ],
      Klempner: [
        'Handelt es sich um einen Notfall (Wasserschaden)?',
        'Welche Art von Rohrsystem ist betroffen?',
        'Ist das Wasser bereits abgestellt?',
      ],
      'Maler & Lackierer': [
        'Wie viele Räume/Quadratmeter sollen gestrichen werden?',
        'Welche Farben/Materialien sind gewünscht?',
        'Müssen Möbel weggeräumt werden?',
      ],
    },
  },
  Haushalt: {
    commonQuestions: [
      'Wie oft soll der Service durchgeführt werden?',
      'Wie groß ist der zu bearbeitende Bereich?',
      'Sind spezielle Reinigungsmittel erforderlich?',
      'Gibt es besondere Vorsichtsmaßnahmen zu beachten?',
      'Sind Sie während der Arbeit anwesend?',
    ],
    subcategories: {
      Reinigungskraft: [
        'Wie viele Zimmer hat Ihr Zuhause?',
        'Soll auch geputzt oder nur aufgeräumt werden?',
        'Haben Sie Haustiere?',
      ],
      Fensterputzer: [
        'Wie viele Fenster/Etagen?',
        'Benötigen Sie auch Rahmen- und Fensterbankreinigung?',
        'Ist eine Leiter/Ausrüstung vorhanden?',
      ],
    },
  },
  'IT & Digital': {
    commonQuestions: [
      'Um welche Art von IT-Problem/Projekt handelt es sich?',
      'Welche Systeme/Software sind betroffen?',
      'Ist es ein Notfall oder kann es geplant werden?',
      'Benötigen Sie laufenden Support oder eine einmalige Lösung?',
      'Haben Sie ein technisches Team oder sind Sie Einzelnutzer?',
    ],
    subcategories: {
      Webentwicklung: [
        'Welche Art von Website benötigen Sie?',
        'Haben Sie bereits ein Design/Corporate Identity?',
        'Benötigen Sie auch Hosting und Domain?',
      ],
      'IT-Support': [
        'Welches Betriebssystem verwenden Sie?',
        'Ist es ein Hardware- oder Software-Problem?',
        'Wie dringend ist die Reparatur?',
      ],
    },
  },
  Transport: {
    commonQuestions: [
      'Was soll transportiert werden?',
      'Wie ist die Entfernung/Route?',
      'Benötigen Sie Hilfe beim Be- und Entladen?',
      'Gibt es zeitliche Beschränkungen?',
      'Ist eine Versicherung erforderlich?',
    ],
    subcategories: {
      Umzugshelfer: [
        'Wie viele Zimmer ziehen Sie um?',
        'In welche Etage geht es?',
        'Haben Sie bereits einen LKW organisiert?',
      ],
      Kurierdienst: [
        'Wie groß/schwer ist das Paket?',
        'Wie dringend ist die Zustellung?',
        'Benötigen Sie eine Empfangsbestätigung?',
      ],
    },
  },
  'Wellness & Gesundheit': {
    commonQuestions: [
      'Welche Art von Wellness-Service benötigen Sie?',
      'Haben Sie gesundheitliche Einschränkungen?',
      'Bevorzugen Sie einen Service zu Hause oder in einer Praxis?',
      'Wie oft möchten Sie den Service in Anspruch nehmen?',
      'Benötigen Sie eine Terminvereinbarung?',
    ],
    subcategories: {
      Massage: [
        'Welche Art von Massage bevorzugen Sie?',
        'Haben Sie Verspannungen oder Schmerzen?',
        'Benötigen Sie therapeutische oder entspannende Massage?',
      ],
      Physiotherapie: [
        'Haben Sie eine ärztliche Verordnung?',
        'Welche Beschwerden sollen behandelt werden?',
        'Benötigen Sie Hausbesuche?',
      ],
    },
  },
  'Hotel & Gastronomie': {
    commonQuestions: [
      'Für wie viele Personen soll der Service sein?',
      'Welche Art von Event/Anlass ist es?',
      'Haben Sie spezielle Ernährungsvorlieben/-beschränkungen?',
      'Wo soll der Service stattfinden?',
      'Benötigen Sie auch Geschirr und Besteck?',
    ],
    subcategories: {
      Mietkoch: [
        'Welche Küche bevorzugen Sie?',
        'Soll eingekauft oder mitgebracht werden?',
        'Wie viele Gänge wünschen Sie?',
      ],
      Catering: [
        'Welche Art von Catering (Buffet, Menü, Fingerfood)?',
        'Ist es ein privates oder geschäftliches Event?',
        'Benötigen Sie Service-Personal?',
      ],
    },
  },
  'Marketing & Vertrieb': {
    commonQuestions: [
      'Welche Marketing-Ziele verfolgen Sie?',
      'Wie ist Ihre Zielgruppe definiert?',
      'Welches Budget steht zur Verfügung?',
      'Benötigen Sie eine einmalige Kampagne oder laufende Betreuung?',
      'Haben Sie bereits Marketing-Materialien?',
    ],
    subcategories: {
      OnlineMarketing: [
        'Welche Online-Kanäle sollen genutzt werden?',
        'Haben Sie bereits eine Website/Social Media Präsenz?',
        'Welche Conversion-Ziele haben Sie?',
      ],
      'Social Media Marketing': [
        'Auf welchen Plattformen sind Sie aktiv?',
        'Wie oft sollen Inhalte veröffentlicht werden?',
        'Benötigen Sie auch Content-Erstellung?',
      ],
    },
  },
  'Finanzen & Recht': {
    commonQuestions: [
      'Um welche Art von Finanz-/Rechtsdienstleistung geht es?',
      'Handelt es sich um eine private oder geschäftliche Angelegenheit?',
      'Wie dringend ist die Bearbeitung?',
      'Benötigen Sie laufende Betreuung oder einmalige Beratung?',
      'Haben Sie bereits relevante Unterlagen vorbereitet?',
    ],
    subcategories: {
      Buchhaltung: [
        'Welche Art von Unternehmen führen Sie?',
        'Benötigen Sie monatliche oder jährliche Buchhaltung?',
        'Welche Software verwenden Sie?',
      ],
      Steuerberatung: [
        'Geht es um private oder gewerbliche Steuern?',
        'Benötigen Sie Hilfe bei der Steuererklärung oder laufende Beratung?',
        'Haben Sie bereits einen Steuerberater?',
      ],
    },
  },
  'Bildung & Unterstützung': {
    commonQuestions: [
      'Welches Alter/Niveau hat der Lernende?',
      'In welchem Fach wird Unterstützung benötigt?',
      'Wie oft soll der Unterricht stattfinden?',
      'Bevorzugen Sie Einzel- oder Gruppenunterricht?',
      'Soll online oder vor Ort unterrichtet werden?',
    ],
    subcategories: {
      Nachhilfe: [
        'Welche Klassenstufe?',
        'In welchem Fach?',
        'Sind es Verständnisprobleme oder Prüfungsvorbereitung?',
      ],
      Sprachunterricht: [
        'Welche Sprache soll gelernt werden?',
        'Welches Sprachniveau haben Sie bereits?',
        'Benötigen Sie Business- oder Konversationsunterricht?',
      ],
    },
  },
};

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
      case 'generateSmartQuestions':
        // Neue Action: Generiere automatisch intelligente Fragen basierend auf der ersten Eingabe
        systemContext = `Du bist ein erfahrener KI-Projektmanagement-Assistent für die Taskilo-Plattform. 
        Analysiere die Eingabe des Benutzers und generiere präzise Fragen, um ein vollständiges Projektbriefing zu erstellen.
        
        Du kennst alle verfügbaren Service-Kategorien: ${Object.keys(categories).join(', ')}.`;

        prompt = `Der Benutzer hat folgende Projektidee beschrieben: "${data.userInput || 'Kein Input'}"
        
        Analysiere diese Beschreibung und:
        1. Bestimme die wahrscheinlichste Hauptkategorie
        2. Identifiziere fehlende wichtige Informationen
        3. Generiere 5-7 gezielte Fragen für ein vollständiges Projektbriefing
        
        Die Fragen müssen abdecken:
        - Zeitrahmen (Wann soll es durchgeführt werden?)
        - Ort/Location (Wo findet es statt?)
        - Budget (Welche Kostenvorstellung?)
        - Spezifische Anforderungen der erkannten Kategorie
        - Qualitätserwartungen
        - Besondere Umstände
        
        WICHTIG: Antworte ausschließlich mit einem validen JSON Objekt:
        {
          "detectedCategory": "Erkannte Hauptkategorie",
          "detectedSubcategory": "Erkannte Subkategorie (falls möglich)",
          "confidence": 0.8,
          "questions": [
            {
              "id": "timing",
              "question": "Wann soll Ihr Projekt durchgeführt werden?",
              "type": "date_range",
              "required": true,
              "placeholder": "z.B. nächste Woche, bis Ende des Monats",
              "category": "timing"
            },
            {
              "id": "location", 
              "question": "Wo soll der Service durchgeführt werden?",
              "type": "location",
              "required": true,
              "placeholder": "z.B. bei mir zu Hause, in der Firma",
              "category": "location"
            },
            {
              "id": "budget",
              "question": "Welches Budget haben Sie für dieses Projekt eingeplant?",
              "type": "budget_range", 
              "required": false,
              "placeholder": "z.B. 500-1000 Euro, verhandelbar",
              "category": "budget"
            }
          ],
          "projectSummary": "Kurze Zusammenfassung des erkannten Projekts",
          "recommendedNext": "Empfehlung für nächste Schritte"
        }
        
        Stelle intelligente, kategorie-spezifische Fragen!`;
        break;

      case 'askDetailedQuestions':
        // Neue Action für detaillierte kategorie-spezifische Fragen
        const category = data.category;
        const subcategory = data.subcategory;
        const userInput = data.userInput || '';

        systemContext = `Du bist ein erfahrener KI-Projektmanagement-Assistent für die Taskilo-Plattform. 
        Du hilfst Kunden dabei, durch gezielte Fragen ihre Projektanforderungen zu präzisieren.
        
        Du kennst alle Service-Kategorien und Subkategorien der Plattform und stellst passende, intelligente Fragen.`;

        // Hole kategorie-spezifische Fragen aus der Datenbank
        const categoryQuestions =
          CATEGORY_QUESTION_DATABASE[category as keyof typeof CATEGORY_QUESTION_DATABASE];
        const subcategoryQuestions =
          categoryQuestions?.subcategories?.[subcategory as string] || [];
        const commonQuestions = categoryQuestions?.commonQuestions || [];

        prompt = `Der Benutzer möchte ein Projekt in der Kategorie "${category}"${subcategory ? ` und Subkategorie "${subcategory}"` : ''} erstellen.
        
        Bisherige Beschreibung: "${userInput}"
        
        Relevante Fragen für diese Kategorie:
        Allgemeine Fragen: ${commonQuestions.join(', ')}
        ${subcategoryQuestions.length > 0 ? `Spezifische Fragen: ${subcategoryQuestions.join(', ')}` : ''}
        
        Stelle 4-6 gezielte Fragen, um das Projekt zu präzisieren. Die Fragen sollen abdecken:
        1. Zeitrahmen und Dringlichkeit (Wann?)
        2. Ort und Zugänglichkeit (Wo?)
        3. Budget und Kostenvorstellungen (Wie viel?)
        4. Spezifische Anforderungen der gewählten Kategorie
        5. Gewünschte Qualität und Standards
        6. Besondere Umstände oder Herausforderungen
        
        WICHTIG: Antworte ausschließlich mit einem validen JSON Objekt:
        {
          "questions": [
            {
              "id": "timing",
              "question": "Wann soll das Projekt durchgeführt werden?",
              "type": "date_range",
              "required": true,
              "category": "timing"
            },
            {
              "id": "location",
              "question": "Wo soll der Service durchgeführt werden?",
              "type": "location",
              "required": true,
              "category": "location"
            },
            {
              "id": "budget",
              "question": "Welches Budget haben Sie für dieses Projekt eingeplant?",
              "type": "budget_range",
              "required": false,
              "category": "budget"
            }
          ],
          "estimatedFields": {
            "category": "${category}",
            "subcategory": "${subcategory}",
            "complexity": "medium",
            "timeEstimate": "Zu bestimmen basierend auf Antworten"
          }
        }
        
        Passe die Fragen an die spezifische Kategorie an!`;
        break;

      case 'generateProjectIdeas':
        systemContext = `Du bist ein KI-Projektmanagement-Assistent für die Taskilo-Plattform, einer Service-Marketplace-App. 
        Taskilo verbindet Kunden mit Dienstleistern in Bereichen wie Handwerk, IT, Haushalt, Transport, etc.
        
        WICHTIGE KATEGORIEN: Du MUSST eine der folgenden exakten Kategorien verwenden:
        - Handwerk
        - IT & Digital  
        - Haushalt & Reinigung
        - Transport & Umzug
        - Wellness & Gesundheit
        - Hotel & Gastronomie
        - Marketing & Vertrieb
        - Finanzen & Recht
        - Beauty & Wellness
        - Entertainment
        - Garten & Landschaftsbau
        - Auto & Motorrad
        - Immobilien
        - Bildung & Coaching
        
        Deine Aufgabe ist es, basierend auf der Beschreibung des Benutzers personalisierte und praktische Projektideen zu generieren, die auf der Plattform umsetzbar sind.`;

        prompt = `Der Benutzer hat folgendes Vorhaben beschrieben: "${data.userInput || 'Allgemeine Projektideen'}"

        Generiere 3-5 konkrete, auf diese Beschreibung zugeschnittene Projektideen für die Taskilo-Plattform. 
        Die Ideen sollten:
        - Direkt auf die Benutzerbeschreibung eingehen
        - Praktisch und umsetzbar sein
        - Verschiedene Service-Kategorien einbeziehen, die relevant sind
        - Einen klaren Nutzen bieten
        - Für die beschriebene Situation passend sein
        
        WICHTIG: Du MUSST eine der EXAKTEN Kategorien und Subkategorien verwenden:
        
        **Handwerk:** Tischler, Klempner, Maler & Lackierer, Elektriker, HeizungSanitär, Fliesenleger, Dachdecker, Maurer, Trockenbauer, Schreiner, Zimmerer, Bodenleger, Glaser, Schlosser, Metallbauer, FensterTürenbau, Heizung, Autoreparatur, Montageservice, Umzugshelfer
        
        **Haushalt:** Reinigungskraft, Haushaltshilfe, Fensterputzer, Teppichreinigung, Bodenreinigung, Hausreinigung
        
        **Transport:** Fahrer, Kurierdienst, Transportdienstleistungen, Lagerlogistik, Logistik, MöbelTransportieren
        
        **IT & Digital:** Webentwicklung, App-Entwicklung, IT-Support, Systemadministration, Cybersecurity, Softwareentwicklung, Datenanalyse, Cloud Services, Netzwerktechnik
        
        **Garten:** Gartenpflege, Landschaftsgärtner, Rasenpflege, Heckenschnitt, Baumpflege, Gartenplanung, Bewässerungsanlagen
        
        **Wellness:** Massage, Physiotherapie, Ernährungsberatung, Kosmetik, Friseur, FitnessTraining, Seniorenbetreuung
        
        **Hotel & Gastronomie:** Mietkoch, Mietkellner, Catering
        
        **Marketing & Vertrieb:** OnlineMarketing, Social Media Marketing, ContentMarketing, Marketingberater, Marktforschung
        
        **Finanzen & Recht:** Buchhaltung, Steuerberatung, Rechtsberatung, Finanzberatung, Versicherungsberatung, Rechnungswesen, Unternehmensberatung, Verwaltung
        
        **Bildung & Unterstützung:** Nachhilfe, Nachhilfelehrer, Sprachunterricht, Musikunterricht, Übersetzer, Kinderbetreuung
        
        **Tiere & Pflanzen:** Tierbetreuung, Hundetrainer, TierarztAssistenz, Tierpflege
        
        **Kreativ & Kunst:** Fotograf, Videograf, Grafiker, Musiker, Texter, Dekoration
        
        **Event & Veranstaltung:** Eventplanung, Sicherheitsdienst, DJService, Musiker
        
        **Büro & Administration:** Telefonservice, Inventur, Recherche
        
        WICHTIG: Antworte ausschließlich mit einem validen JSON Array (keine anderen Texte oder Erklärungen):
        [
          {
            "title": "Kurzer, prägnanter Titel der zum Vorhaben passt",
            "description": "Detaillierte Beschreibung (2-3 Sätze) wie das Projekt umgesetzt werden kann",
            "category": "EXAKT eine der oben genannten Hauptkategorien",
            "subcategory": "EXAKT eine passende Subkategorie aus der gewählten Hauptkategorie",
            "estimatedBudget": 1500,
            "timeline": "Geschätzte Dauer (z.B. 1-2 Wochen, 3-5 Tage)",
            "services": ["Service 1", "Service 2", "Service 3"],
            "priority": "medium",
            "recommendedProviders": ["Typ des benötigten Dienstleisters", "Weitere Spezialisierung"]
          }
        ]
        
        Sei spezifisch und praktisch in deinen Vorschlägen!`;
        break;

      case 'createDetailedProject':
        // Neue Action zum Erstellen einer detaillierten Projektbeschreibung basierend auf Fragen-Antworten
        systemContext = `Du bist ein Experte für Projektspezifikationen auf der Taskilo-Plattform. 
        Du erstellst basierend auf gesammelten Antworten eine präzise, professionelle Projektausschreibung.
        
        WICHTIGE KATEGORIEN: Du MUSST eine der folgenden exakten Kategorien verwenden:
        - Handwerk
        - Haushalt  
        - Transport
        - IT & Digital
        - Garten
        - Wellness
        - Hotel & Gastronomie
        - Marketing & Vertrieb
        - Finanzen & Recht
        - Bildung & Unterstützung
        - Tiere & Pflanzen
        - Kreativ & Kunst
        - Event & Veranstaltung
        - Büro & Administration`;

        const answers = data.answers || {};
        const originalDescription = data.originalDescription || '';

        prompt = `Erstelle basierend auf den folgenden Informationen eine detaillierte Projektbeschreibung:
        
        Ursprüngliche Beschreibung: "${originalDescription}"
        Kategorie: "${data.category}"
        Subkategorie: "${data.subcategory || 'Nicht spezifiziert'}"
        
        Antworten auf Detailfragen:
        ${Object.entries(answers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')}
        
        Erstelle eine professionelle Projektausschreibung die:
        1. Einen klaren, prägnanten Titel hat
        2. Eine detaillierte Beschreibung mit allen wichtigen Aspekten
        3. Spezifische Anforderungen und Erwartungen definiert
        4. Zeitrahmen und Budget berücksichtigt
        5. Für Dienstleister verständlich und umsetzbar ist
        
        WICHTIG: Du MUSST eine der EXAKTEN Kategorien verwenden:
        Handwerk, Haushalt, Transport, IT & Digital, Garten, Wellness, Hotel & Gastronomie, Marketing & Vertrieb, Finanzen & Recht, Bildung & Unterstützung, Tiere & Pflanzen, Kreativ & Kunst, Event & Veranstaltung, Büro & Administration
        
        WICHTIG: Antworte ausschließlich mit einem validen JSON Objekt:
        {
          "title": "Präziser Projekttitel",
          "description": "Detaillierte, professionelle Projektbeschreibung (3-5 Sätze)",
          "category": "EXAKT eine der oben genannten Kategorien - KEINE ANDEREN!",
          "subcategory": "${data.subcategory || ''}",
          "requirements": [
            "Spezifische Anforderung 1",
            "Spezifische Anforderung 2",
            "Spezifische Anforderung 3"
          ],
          "estimatedBudget": 0,
          "timeline": "Basierend auf Antworten geschätzter Zeitrahmen",
          "location": "Arbeitsort basierend auf Antworten",
          "priority": "low|medium|high",
          "specialRequirements": "Besondere Umstände oder Anforderungen",
          "services": ["Hauptservice", "Zusatzservice 1", "Zusatzservice 2"],
          "deliverables": [
            "Erwartetes Ergebnis 1",
            "Erwartetes Ergebnis 2"
          ]
        }`;
        break;

      case 'analyzeProject':
        systemContext = `Du bist ein KI-Projektmanagement-Experte für die Taskilo-Plattform. 
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
        systemContext = `Du bist ein KI-Assistent für Projektmanagement auf der Taskilo-Plattform.
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
        - requiredServices: Benötigte Services von Taskilo
        - status: 'todo' (initial)`;
        break;

      case 'projectConsultation':
        systemContext = `Du bist ein erfahrener Projektmanagement-Berater für die Taskilo-Plattform.
        Gib professionelle Beratung zu Projektfragen.`;

        prompt = `Beantworte folgende Projektfrage professionell und hilfreich:
        
        Frage: ${data.question}
        
        ${data.projectContext ? `Projektkontext: ${data.projectContext}` : ''}
        
        Gib eine strukturierte, hilfreiche Antwort mit:
        1. Direkter Antwort auf die Frage
        2. Praktischen Empfehlungen
        3. Möglichen nächsten Schritten
        4. Relevanten Taskilo-Services, die helfen könnten
        
        Antworte auf Deutsch und sei konkret und umsetzungsorientiert.`;
        break;

      case 'findProviders':
        // Echte Dienstleister aus Firebase users collection laden
        try {
          const { title, category, services } = data;

          console.log('🔍 Suche Dienstleister für:', { title, category, services });

          // Query Firebase users collection für Firmen/Dienstleister
          const usersRef = db.collection('users');
          let query = usersRef
            .where('user_type', '==', 'firma')
            .where('onboardingCompleted', '==', true)
            .where('profileStatus', 'in', ['active', 'pending_review']);

          // Filter nach Kategorie falls verfügbar
          if (category) {
            const categoryMapping: { [key: string]: string[] } = {
              Handwerk: [
                'Handwerk',
                'Bauwesen',
                'Renovierung',
                'Reparatur',
                'Elektriker',
                'Klempner',
                'Maler',
              ],
              Haushalt: ['Haushalt', 'Reinigung', 'Haushaltsservice', 'Putzen', 'Fensterputzer'],
              'IT & Digital': ['IT', 'Digital', 'Software', 'Computer', 'Web', 'Webentwicklung'],
              Transport: ['Transport', 'Umzug', 'Logistik', 'Spedition', 'Kurierdienst'],
              'Wellness & Gesundheit': [
                'Wellness',
                'Gesundheit',
                'Massage',
                'Fitness',
                'Physiotherapie',
              ],
              'Hotel & Gastronomie': [
                'Hotel & Gastronomie',
                'Gastronomie',
                'Catering',
                'Hotel',
                'Restaurant',
                'Event',
                'Mietkoch',
              ],
              'Marketing & Vertrieb': ['Marketing', 'Werbung', 'Vertrieb', 'PR'],
            };

            const searchCategories = categoryMapping[category] || [category];
            query = query.where('industry', 'in', searchCategories);
          }

          const usersSnapshot = await query.limit(20).get();

          // Prüfe ob Ergebnisse gefunden wurden, sonst verwende Fallback
          let finalSnapshot = usersSnapshot;

          if (usersSnapshot.empty) {
            console.log(
              '❌ Keine Dienstleister in der Datenbank gefunden, teste ohne Kategorie-Filter'
            );

            // Fallback: Suche ohne Kategorie-Filter
            const fallbackQuery = usersRef
              .where('user_type', '==', 'firma')
              .where('onboardingCompleted', '==', true)
              .limit(10);

            const fallbackSnapshot = await fallbackQuery.get();

            if (fallbackSnapshot.empty) {
              console.log('❌ Keine Firmen-User in der Datenbank gefunden');
              return NextResponse.json({
                success: true,
                data: [],
                action: action,
                message: 'Keine passenden Dienstleister in der Datenbank gefunden',
              });
            }

            finalSnapshot = fallbackSnapshot;
          }

          // Konvertiere Firebase-Daten zu Dienstleister-Format mit echten Bewertungen und Projekten
          const providers = await Promise.all(
            finalSnapshot.docs.map(async doc => {
              const userData = doc.data();

              try {
                // Lade echte Bewertungen für diesen Dienstleister
                const reviewsSnapshot = await db
                  .collection('reviews')
                  .where('providerId', '==', doc.id)
                  .orderBy('createdAt', 'desc')
                  .limit(3)
                  .get();

                const realReviews = reviewsSnapshot.docs.map(reviewDoc => {
                  const reviewData = reviewDoc.data();
                  return {
                    rating: reviewData.rating || 5,
                    comment: reviewData.comment || '',
                    customerName: reviewData.customerName || 'Anonymer Kunde',
                  };
                });

                // Berechne echte durchschnittliche Bewertung
                const realAverageRating =
                  realReviews.length > 0
                    ? realReviews.reduce((sum, review) => sum + review.rating, 0) /
                      realReviews.length
                    : 0;

                // Lade echte abgeschlossene Projekte
                const completedProjectsSnapshot = await db
                  .collection('projects')
                  .where('providerId', '==', doc.id)
                  .where('status', '==', 'completed')
                  .get();

                const realCompletedJobs = completedProjectsSnapshot.size;

                return {
                  id: doc.id,
                  companyName: userData.companyName || 'Unbekanntes Unternehmen',
                  name: userData.companyName || 'Unbekanntes Unternehmen',
                  description:
                    userData.publicDescription ||
                    userData.description ||
                    'Keine Beschreibung verfügbar',
                  services: userData.skills || userData.specialties || [],
                  categories:
                    userData.industry || userData.selectedCategory
                      ? [userData.industry || userData.selectedCategory]
                      : [],
                  location: {
                    city: userData.city,
                    postalCode: userData.postalCode,
                    lat: userData.lat,
                    lng: userData.lng,
                  },
                  rating: realAverageRating > 0 ? realAverageRating : userData.averageRating || 0,
                  reviewCount: realReviews.length || userData.totalReviews || 0,
                  completedJobs: realCompletedJobs || userData.completedProjects || 0,
                  priceRange: userData.hourlyRate
                    ? `€${userData.hourlyRate}/Std`
                    : 'Preis auf Anfrage',
                  specialties: userData.skills || userData.specialties || [],
                  distance: '< 25 km',
                  reviews: realReviews,
                  isVerified:
                    userData.stripeAccountChargesEnabled || userData.onboardingCompleted || false,
                  responseTime: userData.responseTime ? `${userData.responseTime}h` : 'Binnen 24h',
                  availability: 'Nach Absprache',
                  profilePictureURL:
                    userData.profilePictureURL ||
                    userData.profilePictureFirebaseUrl ||
                    userData.companyLogo ||
                    null,
                };
              } catch (error) {
                console.error(`Fehler beim Laden der Daten für ${doc.id}:`, error);
                // Fallback zu Basis-Daten bei Fehlern
                return {
                  id: doc.id,
                  companyName: userData.companyName || 'Unbekanntes Unternehmen',
                  name: userData.companyName || 'Unbekanntes Unternehmen',
                  description:
                    userData.publicDescription ||
                    userData.description ||
                    'Keine Beschreibung verfügbar',
                  services: userData.skills || userData.specialties || [],
                  categories:
                    userData.industry || userData.selectedCategory
                      ? [userData.industry || userData.selectedCategory]
                      : [],
                  location: {
                    city: userData.city,
                    postalCode: userData.postalCode,
                    lat: userData.lat,
                    lng: userData.lng,
                  },
                  rating: userData.averageRating || 0,
                  reviewCount: userData.totalReviews || 0,
                  completedJobs: userData.completedProjects || 0,
                  priceRange: userData.hourlyRate
                    ? `€${userData.hourlyRate}/Std`
                    : 'Preis auf Anfrage',
                  specialties: userData.skills || userData.specialties || [],
                  distance: '< 25 km',
                  reviews: [],
                  isVerified:
                    userData.stripeAccountChargesEnabled || userData.onboardingCompleted || false,
                  responseTime: userData.responseTime ? `${userData.responseTime}h` : 'Binnen 24h',
                  availability: 'Nach Absprache',
                  profilePictureURL:
                    userData.profilePictureURL ||
                    userData.profilePictureFirebaseUrl ||
                    userData.companyLogo ||
                    null,
                };
              }
            })
          );

          // Sortiere nach Bewertung und Anzahl abgeschlossener Projekte
          providers.sort((a, b) => {
            const scoreA = a.rating * 0.7 + (Math.min(a.completedJobs, 100) / 100) * 0.3;
            const scoreB = b.rating * 0.7 + (Math.min(b.completedJobs, 100) / 100) * 0.3;
            return scoreB - scoreA;
          });

          console.log(`✅ ${providers.length} echte Dienstleister gefunden`);

          return NextResponse.json({
            success: true,
            data: providers.slice(0, 10),
            action: action,
            message: `${providers.length} passende Dienstleister gefunden`,
          });
        } catch (error) {
          console.error('Fehler beim Laden der Dienstleister aus Firebase:', error);
          return NextResponse.json(
            { error: 'Fehler beim Abrufen der Dienstleister aus der Datenbank' },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
    }

    // Standard KI-Verarbeitung für andere Actions
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
      // Extrahiere JSON aus Code-Blöcken falls vorhanden
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      parsedResponse = JSON.parse(jsonText);
    } catch {
      // Falls kein JSON parsbar ist, versuche direktes Parsen
      try {
        parsedResponse = JSON.parse(text);
      } catch {
        parsedResponse = { text: text };
      }
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
