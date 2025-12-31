/**
 * Zentrale Konfiguration für Taskilo KI Prompts
 * Diese Datei enthält alle Prompts für die KI-gestützte Inhaltsgenerierung
 * Kategorie-spezifische Anpassungen können hier vorgenommen werden
 */

export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  category?: string; // Optional: für kategorieübergreifende Prompts
  prompt: string;
  version: string;
  lastUpdated: string;
}

// Basis-Prompt für Profilbeschreibungen (kategorieübergreifend)
const baseProfilePrompt = `Du bist ein professioneller Texter für Dienstleister-Profile auf der deutschen Plattform Taskilo.

DEINE AUFGABE:
Erstelle eine überzeugende, professionelle Profilbeschreibung die Kunden anspricht und Vertrauen aufbaut.

KONTEXT:
Kategorie: {{category}}
Dienstleistung: {{subcategory}}
Informationen vom Nutzer: {{userInput}}

STILRICHTLINIEN:
- Schreibe in der Ich-Form (persönlich und authentisch)
- Professionell aber nahbar
- 3-4 kurze, prägnante Absätze
- Hebe Alleinstellungsmerkmale und Erfahrung hervor
- Sprich potenzielle Kunden direkt an ("Sie profitieren von...")
- Erwähne konkrete Referenzen wenn genannt
- Betone Qualifikationen und Zertifizierungen

FORMATIERUNG:
- Verwende <p> für Absätze
- Verwende <strong> für wichtige Begriffe und Highlights
- Verwende <ul>/<li> für Aufzählungen (wenn mehr als 3 Punkte)
- KEINE Emojis
- KEINE Überschriften (h1, h2, etc.)

AUSGABE:
Antworte NUR mit dem HTML-formatierten Text. Keine Einleitung, keine Erklärung, kein Markdown.`;

// ============================================
// HAUPTKATEGORIE-SPEZIFISCHE ERWEITERUNGEN
// ============================================

export const categoryPromptExtensions: Record<string, string> = {
  // HANDWERK
  'handwerk': `
BRANCHENSPEZIFISCH (Handwerk):
- Betone Meisterqualifikation und Ausbildung falls vorhanden
- Erwähne Garantieleistungen und Gewährleistung
- Hebe Zuverlässigkeit und Termintreue hervor
- Betone regionale Verfügbarkeit und Anfahrt
- Erwähne Versicherungsschutz und Haftpflicht
- Referenzobjekte und zufriedene Kunden hervorheben
- Qualität der Arbeit und saubere Ausführung betonen`,

  // HAUSHALT
  'haushalt': `
BRANCHENSPEZIFISCH (Haushalt):
- Betone Gründlichkeit und Zuverlässigkeit
- Erwähne Erfahrung mit verschiedenen Haushaltsgrößen
- Hebe Diskretion und Vertrauenswürdigkeit hervor
- Betone Flexibilität bei Terminen
- Erwähne verwendete Reinigungsmittel (umweltfreundlich?)
- Regelmäßige Einsätze oder Einmalaufträge möglich`,

  // TRANSPORT
  'transport': `
BRANCHENSPEZIFISCH (Transport):
- Betone Pünktlichkeit und Zuverlässigkeit
- Erwähne Fuhrpark und Kapazitäten
- Hebe Versicherungsschutz für Transportgut hervor
- Betone Erfahrung mit empfindlichen Gütern
- Erwähne regionale/überregionale Verfügbarkeit
- Tracking und Kommunikation während Transport betonen`,

  // IT & DIGITAL
  'it_digital': `
BRANCHENSPEZIFISCH (IT & Digital):
- Betone technische Expertise und Zertifizierungen
- Erwähne Erfahrung mit spezifischen Technologien/Frameworks
- Hebe agile Arbeitsweise und klare Kommunikation hervor
- Betone Datenschutz und Sicherheit (DSGVO-konform)
- Erwähne erfolgreiche Projekte und Kundenzufriedenheit
- Support und Wartung nach Projektabschluss anbieten`,

  // GARTEN
  'garten': `
BRANCHENSPEZIFISCH (Garten):
- Betone Fachwissen über Pflanzen und Jahreszeiten
- Erwähne eigene Ausrüstung und Werkzeuge
- Hebe regelmäßige Pflegeverträge hervor
- Betone umweltbewusstes Arbeiten
- Erwähne Erfahrung mit verschiedenen Gartengrößen
- Vorher-Nachher-Ergebnisse als Referenz`,

  // WELLNESS
  'wellness': `
BRANCHENSPEZIFISCH (Wellness):
- Betone Qualifikationen und Zertifizierungen
- Erwähne Spezialisierungen und Behandlungsmethoden
- Hebe ganzheitlichen Ansatz und Wohlbefinden hervor
- Betone Hygiene und angenehme Atmosphäre
- Erwähne Erfahrung mit verschiedenen Zielgruppen
- Vertraulichkeit und Diskretion betonen`,

  // GASTRONOMIE
  'gastronomie': `
BRANCHENSPEZIFISCH (Hotel & Gastronomie):
- Betone kulinarische Spezialisierungen und Kochstile
- Erwähne Erfahrung mit verschiedenen Küchen (italienisch, französisch, regional, etc.)
- Hebe Hygienestandards und HACCP-Kenntnisse hervor
- Betone Flexibilität bei Events und besonderen Anlässen
- Erwähne eigenes Equipment falls vorhanden
- Referenzen von bekannten Häusern/Veranstaltungen sind sehr wertvoll
- Kreativität bei Menügestaltung hervorheben`,

  // MARKETING
  'marketing': `
BRANCHENSPEZIFISCH (Marketing & Vertrieb):
- Betone messbare Erfolge und ROI
- Erwähne Erfahrung mit verschiedenen Branchen
- Hebe datengetriebenen Ansatz hervor
- Betone aktuelle Kenntnisse (Algorithmen, Trends)
- Erwähne erfolgreiche Kampagnen als Referenz
- Transparente Reporting und Kommunikation`,

  // FINANZEN & RECHT
  'finanzen': `
BRANCHENSPEZIFISCH (Finanzen & Recht):
- Betone Qualifikationen und Zulassungen
- Erwähne Spezialisierungen (Branchen, Rechtsgebiete)
- Hebe Vertraulichkeit und Diskretion hervor
- Betone aktuelle Kenntnisse (Steuerrecht, Gesetze)
- Erwähne langjährige Erfahrung und Mandanten
- Persönliche Betreuung und Erreichbarkeit`,

  // BILDUNG
  'bildung': `
BRANCHENSPEZIFISCH (Bildung & Unterstützung):
- Betone pädagogische Qualifikation und Erfahrung
- Erwähne Erfolge bei Schülern/Kunden
- Hebe individuelle Förderung hervor
- Betone Geduld und Einfühlungsvermögen
- Erwähne Flexibilität bei Terminen und Orten
- Methodik und Lernansatz beschreiben`,

  // TIERE
  'tiere': `
BRANCHENSPEZIFISCH (Tiere & Pflanzen):
- Betone Liebe zu Tieren und Erfahrung
- Erwähne Qualifikationen und Weiterbildungen
- Hebe Zuverlässigkeit und Verantwortungsbewusstsein hervor
- Betone Flexibilität und Verfügbarkeit
- Erwähne Erfahrung mit verschiedenen Tierarten
- Referenzen von zufriedenen Tierbesitzern`,

  // KREATIV
  'kreativ': `
BRANCHENSPEZIFISCH (Kreativ & Kunst):
- Betone kreativen Stil und künstlerische Vision
- Erwähne Erfahrung mit verschiedenen Projekten/Branchen
- Hebe den Prozess von Konzept bis Umsetzung hervor
- Betone Termintreue und professionelle Arbeitsweise
- Portfolio und Arbeitsproben sind essentiell
- Erwähne technische Ausstattung und Software`,

  // EVENT
  'event': `
BRANCHENSPEZIFISCH (Event & Veranstaltung):
- Betone Erfahrung mit verschiedenen Eventgrößen
- Erwähne technische Ausstattung und Equipment
- Hebe Flexibilität und Spontaneität hervor
- Betone Zuverlässigkeit und Pünktlichkeit
- Erwähne bekannte Events/Kunden als Referenz
- Versicherung und Backup-Lösungen erwähnen`,

  // BÜRO
  'buero': `
BRANCHENSPEZIFISCH (Büro & Administration):
- Betone Organisationstalent und Strukturiertheit
- Erwähne Erfahrung mit verschiedenen Branchen
- Hebe Diskretion und Vertraulichkeit hervor
- Betone technische Kenntnisse (Software, Tools)
- Erwähne Flexibilität bei Arbeitszeiten
- Zuverlässigkeit und Genauigkeit betonen`,

  // DEFAULT
  'default': `
ALLGEMEIN:
- Betone deine einzigartigen Stärken
- Hebe Erfahrung und Qualifikationen hervor
- Zeige Kundenorientierung und Servicegedanken
- Erwähne Flexibilität und Zuverlässigkeit
- Referenzen und Kundenfeedback einbeziehen`
};

// ============================================
// SUBKATEGORIE-SPEZIFISCHE ERWEITERUNGEN
// ============================================

export const subcategoryPromptExtensions: Record<string, string> = {
  // HANDWERK - Subkategorien
  'tischler': `Betone Holzexpertise, Maßanfertigungen, Möbelbau und Restaurierungen. Erwähne Erfahrung mit verschiedenen Holzarten.`,
  'klempner': `Betone schnelle Notdienst-Verfügbarkeit, Rohrinstallationen und Sanitärreparaturen. Erwähne 24h-Erreichbarkeit falls vorhanden.`,
  'maler & lackierer': `Betone saubere Arbeit, Farbberatung und verschiedene Techniken (Lasuren, Tapezieren, Fassaden). Erwähne Abdeckarbeiten und Sauberkeit.`,
  'elektriker': `Betone Sicherheit, Prüfprotokolle und Zertifizierungen. Erwähne Smart-Home-Kompetenz und E-Check.`,
  'heizungsanitär': `Betone Energieeffizienz-Beratung, Wartungsverträge und Notdienst. Erwähne Erfahrung mit verschiedenen Heizsystemen.`,
  'fliesenleger': `Betone präzise Verlegung, Materialberatung und verschiedene Formate. Erwähne Erfahrung mit Großformat-Fliesen.`,
  'dachdecker': `Betone Sicherheit, Höhenarbeit-Zertifizierung und verschiedene Dachtypen. Erwähne Sturmschaden-Reparaturen.`,
  'maurer': `Betone Fundamentarbeiten, Rohbau und Sanierungen. Erwähne Erfahrung mit Alt- und Neubauten.`,
  'trockenbauer': `Betone schnelle Ausführung, Schallschutz und Brandschutz. Erwähne verschiedene Deckensysteme.`,
  'schreiner': `Betone Maßarbeit, individuelle Lösungen und Einbauschränke. Erwähne Kücheneinbau und Innenausbau.`,
  'zimmerer': `Betone Holzbau-Expertise, Dachstühle und Carports. Erwähne traditionelle und moderne Techniken.`,
  'bodenleger': `Betone verschiedene Bodenarten (Parkett, Laminat, Vinyl), Untergrundvorbereitung und Fußleisten.`,
  'glaser': `Betone Isolierverglasung, Sicherheitsglas und Spiegel. Erwähne Notverglasungen.`,
  'schlosser': `Betone Metallarbeiten, Tore, Geländer und Sicherheitstechnik. Erwähne Schweißarbeiten.`,
  'metallbauer': `Betone Konstruktionen, Treppen und Balkone. Erwähne CAD-Planung und Fertigung.`,
  'fenstertürenbau': `Betone Energieeffizienz, Einbruchschutz und Montage. Erwähne verschiedene Materialien.`,
  'heizung': `Betone Energieberatung, Wärmepumpen und Wartung. Erwähne Fördermittel-Beratung.`,
  'autoreparatur': `Betone Diagnose-Kompetenz, faire Preise und Ersatzteile. Erwähne Marken-Spezialisierung.`,
  'montageservice': `Betone Möbelmontage, Küchen und schnelle Ausführung. Erwähne IKEA-Erfahrung.`,
  'umzugshelfer': `Betone körperliche Fitness, Sorgfalt und Erfahrung. Erwähne Verpackungsservice.`,

  // HAUSHALT - Subkategorien
  'reinigungskraft': `Betone Gründlichkeit, eigene Reinigungsmittel und regelmäßige Termine. Erwähne Büro- und Privatreinigung.`,
  'haushaltshilfe': `Betone Vielseitigkeit (Kochen, Wäsche, Einkauf), Vertrauenswürdigkeit und Flexibilität.`,
  'fensterputzer': `Betone streifenfreie Reinigung, professionelle Ausrüstung und auch schwer erreichbare Fenster.`,
  'teppichreinigung': `Betone Tiefenreinigung, Fleckenentfernung und schonende Verfahren. Erwähne verschiedene Materialien.`,
  'bodenreinigung': `Betone verschiedene Bodenarten, Versiegelung und Grundreinigung. Erwähne gewerbliche Erfahrung.`,
  'hausreinigung': `Betone Komplett-Service, regelmäßige Termine und Vertrauenswürdigkeit.`,

  // TRANSPORT - Subkategorien
  'fahrer': `Betone Führerscheinklassen, Ortskenntnis und Pünktlichkeit. Erwähne Personenbeförderung.`,
  'kurierdienst': `Betone Schnelligkeit, Same-Day-Delivery und Tracking. Erwähne Dokumentenzustellung.`,
  'transportdienstleistungen': `Betone Kapazitäten, Versicherung und Verpackung. Erwähne verschiedene Transportgüter.`,
  'lagerlogistik': `Betone Lagerverwaltung, Kommissionierung und Inventur. Erwähne WMS-Erfahrung.`,
  'logistik': `Betone Supply-Chain-Erfahrung, Optimierung und Koordination. Erwähne Software-Kenntnisse.`,
  'möbeltransportieren': `Betone Möbelschutz, Demontage/Montage und Sorgfalt. Erwähne Klaviertransport-Erfahrung.`,

  // IT & DIGITAL - Subkategorien
  'webentwicklung': `Betone Technologie-Stack (React, Next.js, etc.), responsive Design und SEO. Erwähne CMS-Erfahrung.`,
  'app-entwicklung': `Betone iOS/Android-Expertise, Cross-Platform (Flutter, React Native) und App-Store-Erfahrung.`,
  'it-support': `Betone schnelle Reaktionszeiten, Remote-Support und Hardware-Kenntnisse. Erwähne Helpdesk-Erfahrung.`,
  'systemadministration': `Betone Linux/Windows-Server, Backup-Strategien und Monitoring. Erwähne Cloud-Erfahrung.`,
  'cybersecurity': `Betone Penetration-Testing, Compliance (DSGVO, ISO) und Incident-Response. Erwähne Zertifizierungen.`,
  'softwareentwicklung': `Betone Programmiersprachen, Clean-Code und Testing. Erwähne agile Methoden.`,
  'datenanalyse': `Betone Business Intelligence, Visualisierung und Datenbanken. Erwähne Python/R-Kenntnisse.`,
  'cloud services': `Betone AWS/Azure/GCP-Erfahrung, Migration und Kostenoptimierung.`,
  'netzwerktechnik': `Betone Firewall, VPN und WLAN-Optimierung. Erwähne Zertifizierungen (Cisco).`,
  'datenbankentwicklung': `Betone SQL/NoSQL, Optimierung und Datenmodellierung. Erwähne große Datenmengen.`,
  'it-beratung': `Betone strategische Planung, Digitalisierung und Prozessoptimierung. Erwähne Branchenerfahrung.`,
  'webdesign': `Betone UX/UI, Corporate Design und responsive Layouts. Erwähne Figma/Adobe-Kenntnisse.`,
  'ux/ui design': `Betone User Research, Prototyping und Usability-Tests. Erwähne Design-Systems.`,
  'systemintegration': `Betone API-Entwicklung, Schnittstellen und Automatisierung. Erwähne ERP-Erfahrung.`,
  'cloud computing': `Betone Skalierbarkeit, Container (Docker, Kubernetes) und Serverless.`,

  // GARTEN - Subkategorien
  'gartenpflege': `Betone regelmäßige Pflege, Unkrautbekämpfung und Düngung. Erwähne Pflegeverträge.`,
  'landschaftsgärtner': `Betone Gartengestaltung, Pflanzpläne und Teichanlagen. Erwähne Naturstein-Arbeiten.`,
  'rasenpflege': `Betone Mähen, Vertikutieren und Rasen-Neuanlage. Erwähne Rollrasen-Verlegung.`,
  'heckenschnitt': `Betone Formschnitt, verschiedene Heckenarten und regelmäßige Termine.`,
  'baumpflege': `Betone Baumschnitt, Fällung und Seilklettertechnik. Erwähne Zertifizierungen.`,
  'gartenplanung': `Betone Konzepterstellung, 3D-Visualisierung und Pflanzpläne. Erwähne Umsetzungsbegleitung.`,
  'bewässerungsanlagen': `Betone automatische Systeme, Planung und Wartung. Erwähne Smart-Home-Integration.`,

  // WELLNESS - Subkategorien
  'massage': `Betone Massagearten (klassisch, Thai, Wellness), mobile Massage und Entspannung.`,
  'physiotherapie': `Betone Behandlungsmethoden, Kassenzulassung und Rehabilitation. Erwähne Hausbesuche.`,
  'ernährungsberatung': `Betone individuelle Pläne, Ernährungsanalyse und Ziele (Abnehmen, Sport). Erwähne Zertifizierung.`,
  'kosmetik': `Betone Behandlungen (Gesicht, Körper), Produkte und Hautanalyse. Erwähne mobile Kosmetik.`,
  'friseur': `Betone Stilberatung, Färbetechniken und Trends. Erwähne Hochsteck-Frisuren und Events.`,
  'fitnesstraining': `Betone Personal Training, Trainingspläne und Motivation. Erwähne Lizenz und Erfahrung.`,
  'seniorenbetreuung': `Betone Einfühlungsvermögen, Aktivierung und Alltagsbegleitung. Erwähne Erfahrung und Geduld.`,

  // GASTRONOMIE - Subkategorien
  'mietkoch': `Betone kulinarische Vielfalt (italienisch, französisch, regional, asiatisch), Menükreation für Events, HACCP-Zertifizierung und Erfahrung in der Spitzengastronomie. Erwähne bekannte Arbeitgeber und besondere Veranstaltungen.`,
  'mietkellner': `Betone Service-Exzellenz, Veranstaltungserfahrung (Hochzeiten, Galas), diskrete Arbeitsweise und professionelles Auftreten. Erwähne Weinkenntnisse und Sprachkenntnisse.`,
  'catering': `Betone Menüvielfalt, Eventgrößen (10-500 Personen), Full-Service und Ausstattung. Erwähne Referenz-Veranstaltungen.`,

  // MARKETING - Subkategorien
  'onlinemarketing': `Betone SEO/SEA, Conversion-Optimierung und Analytics. Erwähne messbare Erfolge.`,
  'social media marketing': `Betone Plattform-Expertise (Instagram, TikTok, LinkedIn), Content-Strategie und Community-Management.`,
  'contentmarketing': `Betone Storytelling, Blog-Artikel und Content-Strategie. Erwähne SEO-Texte.`,
  'marketingberater': `Betone strategische Beratung, Markenentwicklung und Kampagnenplanung.`,
  'marktforschung': `Betone Umfragen, Datenanalyse und Wettbewerbsanalyse. Erwähne Branchenerfahrung.`,

  // FINANZEN - Subkategorien
  'buchhaltung': `Betone DATEV-Kenntnisse, laufende Buchhaltung und Monatsabschlüsse. Erwähne Branchenerfahrung.`,
  'steuerberatung': `Betone Steuererklärungen, Steueroptimierung und Betriebsprüfungen. Erwähne Spezialisierungen.`,
  'rechtsberatung': `Betone Rechtsgebiete, außergerichtliche Einigung und Vertretung. Erwähne Erfolgsquote.`,
  'finanzberatung': `Betone Vermögensaufbau, Altersvorsorge und unabhängige Beratung. Erwähne Zertifizierungen.`,
  'versicherungsberatung': `Betone Versicherungsvergleich, Schadenregulierung und unabhängige Beratung.`,
  'rechnungswesen': `Betone Jahresabschlüsse, Kostenrechnung und Controlling. Erwähne ERP-Erfahrung.`,
  'unternehmensberatung': `Betone Strategieentwicklung, Prozessoptimierung und Change-Management. Erwähne Branchenfokus.`,
  'verwaltung': `Betone Büroorganisation, Dokumentenmanagement und Terminkoordination.`,

  // BILDUNG - Subkategorien
  'nachhilfe': `Betone Fächer, Klassenstufen und Erfolge (Notenverbesserung). Erwähne Online-/Präsenz-Optionen.`,
  'nachhilfelehrer': `Betone pädagogische Erfahrung, individuelle Förderung und Prüfungsvorbereitung.`,
  'sprachunterricht': `Betone Sprachen, Niveaustufen und Zertifikatsvorbereitung. Erwähne Muttersprachler-Status.`,
  'musikunterricht': `Betone Instrumente, Anfänger bis Fortgeschrittene und Musiktheorie. Erwähne Konzertbegleitung.`,
  'übersetzer': `Betone Sprachpaare, Fachgebiete und Beglaubigungen. Erwähne Dolmetscher-Dienste.`,
  'kinderbetreuung': `Betone Erfahrung, Erste-Hilfe-Kurs und Aktivitäten. Erwähne Referenzen von Familien.`,

  // TIERE - Subkategorien
  'tierbetreuung': `Betone Tierarten (Hund, Katze, Kleintiere), Fütterung und Gassi-Service. Erwähne Urlaubsbetreuung.`,
  'hundetrainer': `Betone Trainingsmethoden, Verhaltenstherapie und Welpen-Erziehung. Erwähne Zertifizierungen.`,
  'tierarztassistenz': `Betone medizinische Kenntnisse, Tierliebe und Stressmanagement.`,
  'tierpflege': `Betone Fellpflege, Baden und Krallenschneiden. Erwähne mobile Tierpflege.`,

  // KREATIV - Subkategorien
  'fotograf': `Betone Foto-Genres (Hochzeit, Portrait, Produkt), Bildbearbeitung und Equipment. Erwähne Studio.`,
  'videograf': `Betone Videoproduktion, Drohnenaufnahmen und Postproduktion. Erwähne Referenzprojekte.`,
  'grafiker': `Betone Design-Stile, Corporate Design und Print/Digital. Erwähne Software-Kenntnisse.`,
  'musiker': `Betone Instrumente/Gesang, Genres und Live-Erfahrung. Erwähne bekannte Auftritte.`,
  'texter': `Betone Textsorten (Web, Werbung, PR), Branchenerfahrung und SEO. Erwähne Stil.`,
  'dekoration': `Betone Veranstaltungstypen, Stilrichtungen und eigenes Material. Erwähne Hochzeitsdekorationen.`,

  // EVENT - Subkategorien
  'eventplanung': `Betone Eventtypen (Hochzeiten, Firmen, Geburtstage), Full-Service und Koordination.`,
  'sicherheitsdienst': `Betone Sachkundenachweis, Veranstaltungserfahrung und Deeskalation.`,
  'djservice': `Betone Musikstile, Equipment und Lichtshow. Erwähne Erfahrung mit Hochzeiten/Clubs.`,

  // BÜRO - Subkategorien
  'telefonservice': `Betone freundliche Kommunikation, Terminvereinbarung und mehrsprachiger Service.`,
  'inventur': `Betone Genauigkeit, Erfahrung mit Inventursystemen und flexible Einsatzzeiten.`,
  'recherche': `Betone gründliche Recherche, Quellenprüfung und Aufbereitung. Erwähne Branchenwissen.`,
};

/**
 * Generiert den vollständigen Prompt für eine Profilbeschreibung
 */
export function generateProfilePrompt(
  category: string,
  subcategory: string,
  userInput: string
): string {
  // Normalisiere Kategorie-Key
  const categoryKey = category.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, 'und')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
  
  // Normalisiere Subkategorie-Key
  const subcategoryKey = subcategory.toLowerCase().trim();
  
  // Finde passende Erweiterungen
  const categoryExtension = categoryPromptExtensions[categoryKey] || categoryPromptExtensions['default'];
  const subcategoryExtension = subcategoryPromptExtensions[subcategoryKey] || '';
  
  // Ersetze Platzhalter im Basis-Prompt
  let fullPrompt = baseProfilePrompt
    .replace('{{category}}', category)
    .replace('{{subcategory}}', subcategory)
    .replace('{{userInput}}', userInput);
  
  // Füge kategoriesspezifische Erweiterung hinzu
  fullPrompt += '\n' + categoryExtension;
  
  // Füge subkategorie-spezifische Erweiterung hinzu (falls vorhanden)
  if (subcategoryExtension) {
    fullPrompt += `\n\nSPEZIFISCH FÜR ${subcategory.toUpperCase()}:\n${subcategoryExtension}`;
  }
  
  return fullPrompt;
}

/**
 * Alle verfügbaren Prompt-Konfigurationen
 */
export const promptConfigs: PromptConfig[] = [
  {
    id: 'profile-description',
    name: 'Profilbeschreibung',
    description: 'Generiert professionelle Profilbeschreibungen für Tasker',
    prompt: baseProfilePrompt,
    version: '2.0.0',
    lastUpdated: '2025-01-21',
  },
];

/**
 * Interface für KI-Feedback
 */
export interface AIFeedback {
  id?: string;
  promptId: string;
  promptVersion: string;
  category: string;
  subcategory: string;
  userInput: string;
  generatedOutput: string;
  rating: 'good' | 'bad';
  userId: string;
  companyId: string;
  feedback?: string; // Optional: Freitext-Feedback
  createdAt: Date;
}

/**
 * Statistik-Interface für Admin-Dashboard
 */
export interface PromptStatistics {
  promptId: string;
  totalGenerations: number;
  goodRatings: number;
  badRatings: number;
  successRate: number; // Prozent
  byCategory: Record<string, {
    total: number;
    good: number;
    bad: number;
  }>;
  bySubcategory: Record<string, {
    total: number;
    good: number;
    bad: number;
  }>;
}
