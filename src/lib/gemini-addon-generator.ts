/**
 * Gemini AI Add-on Generator
 * Generiert branchenspezifische Add-on Vorschläge basierend auf User-Beschreibung
 */

interface AdditionalService {
  id: string;
  title: string;
  description: string;
  price: number;
  deliveryTime?: number;
  active: boolean;
}

export async function generateAddonSuggestions(
  description: string,
  subcategory: string
): Promise<AdditionalService[]> {
  // Try real Gemini API first, fallback to smart mock
  try {
    const geminiSuggestions = await callGeminiAPI(description, subcategory);
    if (geminiSuggestions && geminiSuggestions.length > 0) {
      return geminiSuggestions;
    }
  } catch (error) {
    console.warn('Gemini API failed, using fallback:', error);
  }

  // Fallback to smart mock responses
  const suggestions = await generateSmartMockSuggestions(description, subcategory);
  return suggestions;
}

async function generateSmartMockSuggestions(
  description: string,
  subcategory: string
): Promise<AdditionalService[]> {
  const lowerDesc = description.toLowerCase();
  const suggestions: AdditionalService[] = [];

  // Detect hourly rate for dynamic pricing
  const hasHourlyRate = /(\d+[,.]?\d*)\s*(€|euro|eur)?\s*(die|pro|per)?\s*stunde/i.test(lowerDesc);
  const hourlyRate = hasHourlyRate
    ? parseFloat(lowerDesc.match(/(\d+[,.]?\d*)/)?.[1]?.replace(',', '.') || '35')
    : 35;

  // Subcategory-specific intelligent suggestions
  const subcategoryMap: { [key: string]: AdditionalService[] } = {
    // === HANDWERK ===
    Tischler: [
      {
        id: 'ai1',
        title: 'Premium-Holz',
        description: 'Echtholz statt Spanplatte',
        price: 150,
        deliveryTime: 1,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Express-Anfertigung',
        description: 'Fertigstellung in halber Zeit',
        price: 200,
        deliveryTime: -3,
        active: true,
      },
    ],

    Klempner: [
      {
        id: 'ai1',
        title: 'Notfall-Service',
        description: '24/7 Bereitschaft',
        price: 80,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Premium-Armaturen',
        description: 'Hochwertige Markenwaren',
        price: 120,
        deliveryTime: 0,
        active: true,
      },
    ],

    'Maler & Lackierer': [
      {
        id: 'ai1',
        title: 'Premium-Farbe',
        description: 'Allergikerfreundliche Bio-Farbe',
        price: 50,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Wochenend-Arbeit',
        description: 'Arbeiten Sa/So möglich',
        price: 100,
        deliveryTime: -1,
        active: true,
      },
    ],

    Elektriker: [
      {
        id: 'ai1',
        title: 'Notfall-Reparatur',
        description: 'Sofort-Service bei Stromausfall',
        price: 120,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Smart-Home Setup',
        description: 'Intelligente Haussteuerung',
        price: 200,
        deliveryTime: 1,
        active: true,
      },
    ],

    HeizungSanitär: [
      {
        id: 'ai1',
        title: 'Notfall-Service',
        description: 'Heizungsausfall So/Feiertag',
        price: 150,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Energieberatung',
        description: 'Optimierung + Sparpotentiale',
        price: 80,
        deliveryTime: 0,
        active: true,
      },
    ],

    Fliesenleger: [
      {
        id: 'ai1',
        title: 'Designer-Fliesen',
        description: 'Exklusive Naturstein-Optik',
        price: 180,
        deliveryTime: 2,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Fußbodenheizung',
        description: 'Installation inklusive',
        price: 300,
        deliveryTime: 1,
        active: true,
      },
    ],

    // === HAUSHALT ===
    Reinigungskraft: [
      {
        id: 'ai1',
        title: 'Öko-Reinigung',
        description: 'Nur biologische Reinigungsmittel',
        price: 15,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Kühlschrank-Reinigung',
        description: 'Gründliche Innenreinigung',
        price: 25,
        deliveryTime: 0,
        active: true,
      },
    ],

    Haushaltshilfe: [
      {
        id: 'ai1',
        title: 'Bügel-Service',
        description: 'Wäsche bügeln inklusive',
        price: 20,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Einkaufs-Service',
        description: 'Lebensmittel besorgen',
        price: 15,
        deliveryTime: 0,
        active: true,
      },
    ],

    Fensterputzer: [
      {
        id: 'ai1',
        title: 'Rahmen-Reinigung',
        description: 'Fensterrahmen mit reinigen',
        price: 20,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Balkon-Reinigung',
        description: 'Balkon/Terrasse mit putzen',
        price: 30,
        deliveryTime: 0,
        active: true,
      },
    ],

    // === TRANSPORT ===
    Fahrer: [
      {
        id: 'ai1',
        title: 'Wartezeit',
        description: 'Bis 30 Min ohne Aufpreis',
        price: 25,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Gepäck-Hilfe',
        description: 'Tragen von schwerem Gepäck',
        price: 15,
        deliveryTime: 0,
        active: true,
      },
    ],

    Kurierdienst: [
      {
        id: 'ai1',
        title: 'Same-Day Express',
        description: 'Zustellung am selben Tag',
        price: 35,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Wertgegenstand',
        description: 'Versicherung bis 5000€',
        price: 25,
        deliveryTime: 0,
        active: true,
      },
    ],

    MöbelTransportieren: [
      {
        id: 'ai1',
        title: 'Auf-/Abbau',
        description: 'Möbel demontieren/montieren',
        price: 80,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Verpackung',
        description: 'Professionelle Polsterung',
        price: 50,
        deliveryTime: 0,
        active: true,
      },
    ],

    // === IT & DIGITAL ===
    Webentwicklung: [
      {
        id: 'ai1',
        title: 'Mobile-Optimierung',
        description: 'Responsive Design inklusive',
        price: 300,
        deliveryTime: 2,
        active: true,
      },
      {
        id: 'ai2',
        title: 'SEO-Optimierung',
        description: 'Suchmaschinenoptimierung',
        price: 200,
        deliveryTime: 1,
        active: true,
      },
    ],

    'App-Entwicklung': [
      {
        id: 'ai1',
        title: 'iOS + Android',
        description: 'Beide Plattformen inklusive',
        price: 800,
        deliveryTime: 5,
        active: true,
      },
      {
        id: 'ai2',
        title: 'App Store Upload',
        description: 'Veröffentlichung inklusive',
        price: 150,
        deliveryTime: 1,
        active: true,
      },
    ],

    'IT-Support': [
      {
        id: 'ai1',
        title: 'Remote-Zugang',
        description: 'Fernwartung-Setup inklusive',
        price: 50,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Daten-Backup',
        description: 'Sicherung vor Reparatur',
        price: 40,
        deliveryTime: 0,
        active: true,
      },
    ],

    Softwareentwicklung: [
      {
        id: 'ai1',
        title: 'Source Code',
        description: 'Vollständiger Quellcode',
        price: 500,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Dokumentation',
        description: 'Technische Dokumentation',
        price: 200,
        deliveryTime: 1,
        active: true,
      },
    ],

    // === WELLNESS ===
    Massage: [
      {
        id: 'ai1',
        title: 'Aromatherapie',
        description: 'Ätherische Öle inklusive',
        price: 20,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Verlängerung +30min',
        description: 'Längere Behandlungszeit',
        price: 35,
        deliveryTime: 0,
        active: true,
      },
    ],

    Friseur: [
      {
        id: 'ai1',
        title: 'Premium-Produkte',
        description: 'Bio-Shampoo und Styling',
        price: 25,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Hausbesuch',
        description: 'Service bei Ihnen zu Hause',
        price: 40,
        deliveryTime: 0,
        active: true,
      },
    ],

    FitnessTraining: [
      {
        id: 'ai1',
        title: 'Ernährungsplan',
        description: 'Individueller Speiseplan',
        price: 50,
        deliveryTime: 1,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Zusatz-Session',
        description: 'Eine Trainingseinheit extra',
        price: 60,
        deliveryTime: 0,
        active: true,
      },
    ],

    Physiotherapie: [
      {
        id: 'ai1',
        title: 'Hausbesuch',
        description: 'Behandlung bei Ihnen zu Hause',
        price: 30,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Übungsplan',
        description: 'Heimübungen-Programm',
        price: 25,
        deliveryTime: 0,
        active: true,
      },
    ],

    // === HOTEL & GASTRONOMIE ===
    Mietkoch:
      hasHourlyRate && /hotel|restaurant|küche|gastronomie/i.test(lowerDesc)
        ? [
            {
              id: 'ai1',
              title: 'Überstunden-Zuschlag',
              description: 'Über 8h täglich +50% Aufpreis',
              price: Math.round(hourlyRate * 0.5),
              deliveryTime: 0,
              active: true,
            },
            {
              id: 'ai2',
              title: 'Wochenend-Service',
              description: 'Sa/So Arbeit +25% pro Stunde',
              price: Math.round(hourlyRate * 0.25),
              deliveryTime: 0,
              active: true,
            },
          ]
        : [
            {
              id: 'ai1',
              title: 'Aperitif',
              description: 'Begrüßungsgetränk für alle Gäste',
              price: 45,
              deliveryTime: 0,
              active: true,
            },
            {
              id: 'ai2',
              title: 'Weinbegleitung',
              description: 'Passende Weine zu jedem Gang',
              price: 80,
              deliveryTime: 0,
              active: true,
            },
          ],

    Mietkellner: [
      {
        id: 'ai1',
        title: 'Barkeeper-Service',
        description: 'Cocktails und Drinks mixen',
        price: 40,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Event-Dekoration',
        description: 'Tische eindecken und dekorieren',
        price: 35,
        deliveryTime: 0,
        active: true,
      },
    ],

    Catering: [
      {
        id: 'ai1',
        title: 'Vegetarisches Menü',
        description: 'Alternative für Vegetarier',
        price: 120,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Service-Personal',
        description: 'Bedienung inklusive',
        price: 200,
        deliveryTime: 0,
        active: true,
      },
    ],

    // === GARTEN ===
    Gartenpflege: [
      {
        id: 'ai1',
        title: 'Entsorgung',
        description: 'Grünschnitt-Abfuhr inklusive',
        price: 40,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Unkrautvernichter',
        description: 'Biologische Unkrautbekämpfung',
        price: 30,
        deliveryTime: 0,
        active: true,
      },
    ],

    Landschaftsgärtner: [
      {
        id: 'ai1',
        title: 'Pflanzberatung',
        description: 'Auswahl standortgerechter Pflanzen',
        price: 80,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Bewässerungsplanung',
        description: 'Automatisches Bewässerungssystem',
        price: 200,
        deliveryTime: 2,
        active: true,
      },
    ],

    Baumpflege: [
      {
        id: 'ai1',
        title: 'Entsorgung',
        description: 'Abtransport des Baumschnitts',
        price: 60,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Wund-Behandlung',
        description: 'Schnittstellen-Versiegelung',
        price: 35,
        deliveryTime: 0,
        active: true,
      },
    ],

    // === MARKETING & VERTRIEB ===
    OnlineMarketing: [
      {
        id: 'ai1',
        title: 'Google Ads Setup',
        description: 'Kampagnen-Einrichtung inklusive',
        price: 300,
        deliveryTime: 1,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Analytics-Reporting',
        description: 'Monatliche Erfolgsmessung',
        price: 150,
        deliveryTime: 0,
        active: true,
      },
    ],

    'Social Media Marketing': [
      {
        id: 'ai1',
        title: 'Content-Erstellung',
        description: '10 Posts extra pro Monat',
        price: 200,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Story-Highlights',
        description: 'Instagram Story-Design',
        price: 80,
        deliveryTime: 1,
        active: true,
      },
    ],

    // === KREATIV & KUNST ===
    Fotograf: [
      {
        id: 'ai1',
        title: 'Zusätzliche Bilder',
        description: '+50 bearbeitete Fotos',
        price: 100,
        deliveryTime: 2,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Express-Bearbeitung',
        description: 'Lieferung in 24h',
        price: 150,
        deliveryTime: -3,
        active: true,
      },
    ],

    Grafiker: [
      {
        id: 'ai1',
        title: 'Print-Dateien',
        description: 'Druckfertige Formate inklusive',
        price: 50,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Social Media Formate',
        description: 'Instagram/Facebook Anpassung',
        price: 75,
        deliveryTime: 1,
        active: true,
      },
    ],

    Videograf: [
      {
        id: 'ai1',
        title: 'Drohnen-Aufnahmen',
        description: 'Luftaufnahmen inklusive',
        price: 200,
        deliveryTime: 1,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Color-Grading',
        description: 'Professionelle Farbkorrektur',
        price: 150,
        deliveryTime: 2,
        active: true,
      },
    ],

    // === BILDUNG & UNTERSTÜTZUNG ===
    Nachhilfe: [
      {
        id: 'ai1',
        title: 'Prüfungsvorbereitung',
        description: 'Spezielle Klausur-Vorbereitung',
        price: 40,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Lernmaterialien',
        description: 'Übungsblätter inklusive',
        price: 20,
        deliveryTime: 0,
        active: true,
      },
    ],

    Sprachunterricht: [
      {
        id: 'ai1',
        title: 'Konversations-Training',
        description: 'Extra Sprechpraxis-Session',
        price: 30,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Zertifikatsvorbereitung',
        description: 'Training für Sprachzertifikat',
        price: 80,
        deliveryTime: 0,
        active: true,
      },
    ],

    // === TIERE & PFLANZEN ===
    Tierbetreuung: [
      {
        id: 'ai1',
        title: 'Gassi-Service',
        description: 'Zusätzlicher Spaziergang',
        price: 15,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Futter-Service',
        description: 'Fütterung nach Ihrem Plan',
        price: 10,
        deliveryTime: 0,
        active: true,
      },
    ],

    Hundetrainer: [
      {
        id: 'ai1',
        title: 'Hausbesuch',
        description: 'Training bei Ihnen zu Hause',
        price: 30,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Follow-up Session',
        description: 'Nachbetreuung nach 2 Wochen',
        price: 40,
        deliveryTime: 14,
        active: true,
      },
    ],

    // === FINANZEN & RECHT ===
    Buchhaltung: [
      {
        id: 'ai1',
        title: 'Jahresabschluss',
        description: 'GuV und Bilanz inklusive',
        price: 200,
        deliveryTime: 3,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Express-Bearbeitung',
        description: 'Prio-Bearbeitung in 48h',
        price: 100,
        deliveryTime: -5,
        active: true,
      },
    ],

    Steuerberatung: [
      {
        id: 'ai1',
        title: 'Steuererklärung',
        description: 'Komplette Erstellung inklusive',
        price: 150,
        deliveryTime: 5,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Betriebsprüfung',
        description: 'Vorbereitung auf Steuerprüfung',
        price: 300,
        deliveryTime: 2,
        active: true,
      },
    ],

    // === EVENT & VERANSTALTUNG ===
    Eventplanung: [
      {
        id: 'ai1',
        title: 'Dekoration',
        description: 'Location-Dekoration inklusive',
        price: 200,
        deliveryTime: 1,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Catering-Organisation',
        description: 'Vollservice Verpflegung',
        price: 300,
        deliveryTime: 2,
        active: true,
      },
    ],

    DJService: [
      {
        id: 'ai1',
        title: 'Lichtshow',
        description: 'Professionelle Beleuchtung',
        price: 150,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Mikrofon-Service',
        description: 'Moderation und Ansagen',
        price: 80,
        deliveryTime: 0,
        active: true,
      },
    ],

    // === BÜRO & ADMINISTRATION ===
    Telefonservice: [
      {
        id: 'ai1',
        title: 'Terminvereinbarung',
        description: 'Kalender-Management inklusive',
        price: 50,
        deliveryTime: 0,
        active: true,
      },
      {
        id: 'ai2',
        title: 'Mehrsprachig',
        description: 'Service in Englisch/Französisch',
        price: 30,
        deliveryTime: 0,
        active: true,
      },
    ],
  };

  // Get suggestions for specific subcategory
  if (subcategoryMap[subcategory]) {
    suggestions.push(...subcategoryMap[subcategory]);
  }

  // Fallback: Generic suggestions based on keywords if no specific subcategory match
  if (suggestions.length === 0) {
    if (/express|schnell|eilig|sofort/i.test(lowerDesc)) {
      suggestions.push({
        id: 'ai1',
        title: 'Express-Service',
        description: 'Prioritäre Bearbeitung',
        price: 75,
        deliveryTime: -2,
        active: true,
      });
    }
    if (/premium|hochwertig|luxus|exklusiv/i.test(lowerDesc)) {
      suggestions.push({
        id: 'ai2',
        title: 'Premium-Option',
        description: 'Hochwertige Ausführung',
        price: 100,
        deliveryTime: 0,
        active: true,
      });
    }

    // Final fallback
    if (suggestions.length === 0) {
      suggestions.push(
        {
          id: 'ai1',
          title: 'Express-Service',
          description: 'Schnellere Bearbeitung',
          price: 50,
          deliveryTime: -1,
          active: true,
        },
        {
          id: 'ai2',
          title: 'Premium-Ausführung',
          description: 'Hochwertige Materialien/Service',
          price: 75,
          deliveryTime: 0,
          active: true,
        }
      );
    }
  }

  // Return only first 2 suggestions
  return suggestions.slice(0, 2);
}

// Real Gemini API integration
export async function callGeminiAPI(
  description: string,
  subcategory: string
): Promise<AdditionalService[]> {
  const prompt = `
    Du bist ein Experte für deutsche Dienstleistungen. Analysiere diese Geschäftsbeschreibung und erstelle 2 sinnvolle Add-on Services:
    
    Beschreibung: "${description}"
    Branche: "${subcategory}"
    
    WICHTIG: Antworte NUR mit einem JSON-Array. Keine zusätzlichen Texte!
    
    Erstelle 2 konkrete, realistische Add-ons mit:
    - Aussagekräftiger Titel (max 20 Zeichen)
    - Kurze Beschreibung (max 50 Zeichen) 
    - Realistischer Preis in Euro (10-200 für kleine Services, bis 500 für IT/große Services)
    - Zeitaufwand in Tagen (kann negativ sein für Express-Service)
    
    JSON Format:
    [
      {
        "id": "ai1",
        "title": "Add-on Titel",
        "description": "Kurze Beschreibung",
        "price": 50,
        "deliveryTime": 0,
        "active": true
      },
      {
        "id": "ai2", 
        "title": "Add-on Titel 2",
        "description": "Kurze Beschreibung 2",
        "price": 75,
        "deliveryTime": -1,
        "active": true
      }
    ]
    
    Beispiele:
    - Friseur → "Express-Styling", "Premium-Produkte"
    - Handwerker → "Wochenend-Service", "Premium-Material"
    - IT → "Express-Lieferung", "Source Code"
    - Koch (Stundenlohn) → "Überstunden-Zuschlag", "Wochenend-Service"
  `;

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API Error: ${response.status}`;

      // If it's a retryable error, show user-friendly message
      if (errorData.retryable) {
        throw new Error(errorMessage);
      }

      throw new Error(`API Error: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.success || !data.response) {
      throw new Error('Invalid API response');
    }

    // Parse Gemini response as JSON - handle multiple formats
    let cleanResponse = data.response.trim();

    // Extract JSON from markdown code blocks
    const jsonMatches = cleanResponse.match(/```json\n?([\s\S]*?)\n?```/g);
    if (jsonMatches && jsonMatches.length > 0) {
      // Use the last JSON block (usually the complete array)
      cleanResponse = jsonMatches[jsonMatches.length - 1].replace(/```json\n?|\n?```/g, '').trim();
    } else {
      // Extract JSON array pattern if no code blocks
      const arrayMatch = cleanResponse.match(/\[\s*{[\s\S]*}\s*\]/);
      if (arrayMatch) {
        cleanResponse = arrayMatch[0];
      }
    }

    const suggestions: AdditionalService[] = JSON.parse(cleanResponse);

    // Validate structure
    if (!Array.isArray(suggestions) || suggestions.length !== 2) {
      throw new Error('Invalid suggestions format');
    }

    // Ensure all required fields exist
    const validatedSuggestions = suggestions.map((suggestion, index) => ({
      id: suggestion.id || `ai${index + 1}`,
      title: suggestion.title || 'Zusätzlicher Service',
      description: suggestion.description || 'Zusätzliche Leistung',
      price: Number(suggestion.price) || 50,
      deliveryTime: Number(suggestion.deliveryTime) || 0,
      active: true,
    }));

    return validatedSuggestions;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}
