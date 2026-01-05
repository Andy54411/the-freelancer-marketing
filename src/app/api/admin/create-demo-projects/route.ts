import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import * as admin from 'firebase-admin';

// 10 realistische Demo-Projekte für Kundenakquise
const DEMO_PROJECTS = [
  {
    title: 'Komplette Badsanierung in Einfamilienhaus',
    description: 'Wir suchen einen erfahrenen Handwerker für die komplette Sanierung unseres Badezimmers (ca. 12 m²). Das Projekt umfasst: Entfernung der alten Fliesen, neue Verlegung von Boden- und Wandfliesen, Installation einer bodengleichen Dusche, neues WC und Waschbecken, sowie Erneuerung aller Wasserleitungen. Wir haben bereits alle Materialien ausgewählt und benötigen nur die fachgerechte Ausführung. Ein Besichtigungstermin ist jederzeit möglich.',
    category: 'Handwerk',
    subcategory: 'Fliesenleger',
    budgetAmount: 8500,
    maxBudget: 12000,
    budgetType: 'fixed' as const,
    timeline: '4-6 Wochen',
    location: 'München, Bayern',
    country: 'deutschland',
    state: 'Bayern',
    city: 'München',
    isRemote: false,
    urgency: 'medium' as const,
    projectScope: 'einmalig' as const,
    siteVisitPossible: true,
    workingHours: 'werktags' as const,
    requiredQualifications: ['Meisterbrief', 'Erfahrung mit bodengleichen Duschen'],
    contactPreference: 'telefon' as const,
    customerVerified: true,
    customerOrderCount: 3,
    customerResponseRate: 95,
  },
  {
    title: 'Webshop-Entwicklung für Feinkost-Unternehmen',
    description: 'Für unser wachsendes Feinkost-Unternehmen suchen wir einen erfahrenen Webentwickler zur Erstellung eines professionellen Online-Shops. Anforderungen: Responsive Design, Integration von Zahlungsanbietern (PayPal, Kreditkarte, Klarna), Warenwirtschaftsanbindung, SEO-Optimierung und DSGVO-konforme Umsetzung. Wir haben bereits ein Corporate Design und benötigen eine moderne, benutzerfreundliche Umsetzung auf Shopify oder WooCommerce.',
    category: 'IT & Digital',
    subcategory: 'Webentwicklung',
    budgetAmount: 15000,
    maxBudget: 25000,
    budgetType: 'fixed' as const,
    timeline: '8-12 Wochen',
    location: 'Hamburg',
    country: 'deutschland',
    state: 'Hamburg',
    city: 'Hamburg',
    isRemote: true,
    urgency: 'normal' as const,
    projectScope: 'einmalig' as const,
    siteVisitPossible: false,
    workingHours: 'flexibel' as const,
    requiredQualifications: ['Shopify/WooCommerce Erfahrung', 'SEO-Kenntnisse'],
    contactPreference: 'email' as const,
    customerVerified: true,
    customerOrderCount: 1,
    customerResponseRate: 100,
  },
  {
    title: 'Regelmäßige Gartenpflege für Bürokomplex',
    description: 'Wir suchen einen zuverlässigen Gärtner für die regelmäßige Pflege unserer Außenanlagen (ca. 2.000 m²). Die Arbeiten umfassen: wöchentlichen Rasenschnitt, Heckenpflege, Unkrautentfernung, Bewässerung der Beete und saisonale Bepflanzung. Der Vertrag soll zunächst für 12 Monate laufen mit Option auf Verlängerung. Alle notwendigen Werkzeuge und Geräte können vor Ort gelagert werden.',
    category: 'Garten',
    subcategory: 'Gartenpflege',
    budgetAmount: 800,
    maxBudget: 1200,
    budgetType: 'fixed' as const,
    timeline: 'Monatlich',
    location: 'Frankfurt am Main',
    country: 'deutschland',
    state: 'Hessen',
    city: 'Frankfurt am Main',
    isRemote: false,
    urgency: 'low' as const,
    projectScope: 'langfristig' as const,
    siteVisitPossible: true,
    workingHours: 'werktags' as const,
    requiredQualifications: ['Gewerbeschein', 'Eigene Ausrüstung von Vorteil'],
    contactPreference: 'telefon' as const,
    customerVerified: true,
    customerOrderCount: 7,
    customerResponseRate: 88,
  },
  {
    title: 'Elektriker für Altbausanierung gesucht',
    description: 'Für die Komplettsanierung unserer Altbauwohnung (120 m²) in Berlin-Prenzlauer Berg suchen wir einen qualifizierten Elektriker. Arbeiten: Komplette Neuverkabelung, Installation eines neuen Sicherungskastens, Einbau von Steckdosen und Schaltern nach Wunsch, Vorbereitung für Smart-Home-Integration. Die Wohnung ist aktuell entkernt. Baubeginn ab sofort möglich.',
    category: 'Handwerk',
    subcategory: 'Elektriker',
    budgetAmount: 12000,
    maxBudget: 18000,
    budgetType: 'fixed' as const,
    timeline: '3-4 Wochen',
    location: 'Berlin',
    country: 'deutschland',
    state: 'Berlin',
    city: 'Berlin',
    isRemote: false,
    urgency: 'high' as const,
    projectScope: 'einmalig' as const,
    siteVisitPossible: true,
    workingHours: 'werktags' as const,
    requiredQualifications: ['Meisterbrief Elektrotechnik', 'Erfahrung mit Altbauten'],
    contactPreference: 'telefon' as const,
    customerVerified: true,
    customerOrderCount: 2,
    customerResponseRate: 92,
  },
  {
    title: 'Social Media Management für Startup',
    description: 'Junges Münchner Tech-Startup sucht erfahrenen Social Media Manager für den Aufbau unserer Online-Präsenz. Aufgaben: Content-Erstellung für Instagram, LinkedIn und TikTok, Community Management, Entwicklung einer Content-Strategie, monatliches Reporting. Wir sind im Bereich nachhaltige Mobilität tätig und haben eine junge, umweltbewusste Zielgruppe. Langfristige Zusammenarbeit gewünscht.',
    category: 'Marketing & Vertrieb',
    subcategory: 'Social Media Marketing',
    budgetAmount: 2500,
    maxBudget: 4000,
    budgetType: 'fixed' as const,
    timeline: 'Monatlich',
    location: 'München',
    country: 'deutschland',
    state: 'Bayern',
    city: 'München',
    isRemote: true,
    urgency: 'medium' as const,
    projectScope: 'langfristig' as const,
    siteVisitPossible: false,
    workingHours: 'flexibel' as const,
    requiredQualifications: ['Nachweisbare Social Media Erfolge', 'Erfahrung mit B2C-Marketing'],
    contactPreference: 'chat' as const,
    customerVerified: true,
    customerOrderCount: 4,
    customerResponseRate: 97,
  },
  {
    title: 'Umzugshelfer für Firmenumzug benötigt',
    description: 'Wir ziehen mit unserem Büro (ca. 15 Arbeitsplätze) in neue Räumlichkeiten um und suchen 4-5 zuverlässige Umzugshelfer. Zu transportieren sind: Büromöbel, IT-Equipment, Akten und Deko. Die neue Adresse ist nur 5 km entfernt. LKW wird von uns gestellt. Der Umzug soll an einem Wochenende stattfinden, um den Geschäftsbetrieb nicht zu stören.',
    category: 'Transport',
    subcategory: 'Umzugshelfer',
    budgetAmount: 1500,
    maxBudget: 2000,
    budgetType: 'fixed' as const,
    timeline: 'Ein Wochenende',
    location: 'Köln',
    country: 'deutschland',
    state: 'Nordrhein-Westfalen',
    city: 'Köln',
    isRemote: false,
    urgency: 'high' as const,
    projectScope: 'einmalig' as const,
    siteVisitPossible: true,
    workingHours: 'wochenende' as const,
    requiredQualifications: ['Körperliche Belastbarkeit', 'Pünktlichkeit'],
    contactPreference: 'telefon' as const,
    customerVerified: true,
    customerOrderCount: 1,
    customerResponseRate: 100,
  },
  {
    title: 'Buchhaltung und Lohnabrechnung für KMU',
    description: 'Mittelständisches Produktionsunternehmen (45 Mitarbeiter) sucht externe Unterstützung für die laufende Buchhaltung und monatliche Lohnabrechnung. Umfang: Kontierung und Verbuchung aller Geschäftsvorfälle, Erstellung der monatlichen BWA, Lohn- und Gehaltsabrechnung, Meldungen an Sozialversicherungsträger. DATEV-Kenntnisse erforderlich. Langfristige Zusammenarbeit gewünscht.',
    category: 'Finanzen & Recht',
    subcategory: 'Buchhaltung',
    budgetAmount: 3500,
    maxBudget: 5000,
    budgetType: 'fixed' as const,
    timeline: 'Monatlich',
    location: 'Stuttgart',
    country: 'deutschland',
    state: 'Baden-Württemberg',
    city: 'Stuttgart',
    isRemote: true,
    urgency: 'normal' as const,
    projectScope: 'langfristig' as const,
    siteVisitPossible: false,
    workingHours: 'werktags' as const,
    requiredQualifications: ['DATEV-Zertifizierung', 'Erfahrung mit Lohnbuchhaltung'],
    contactPreference: 'email' as const,
    customerVerified: true,
    customerOrderCount: 5,
    customerResponseRate: 90,
  },
  {
    title: 'Fotograf für Produktfotografie gesucht',
    description: 'Online-Modeboutique sucht professionellen Fotografen für die Erstellung von Produktfotos unserer neuen Frühjahrskollektion. Umfang: ca. 80 Kleidungsstücke, jeweils 3-4 Ansichten, Freisteller auf weißem Hintergrund, zusätzlich einige Lifestyle-Shots mit Model. Eigenes Studio vorhanden. Die Bilder werden für Webshop und Social Media verwendet.',
    category: 'Kreativ & Kunst',
    subcategory: 'Fotograf',
    budgetAmount: 2800,
    maxBudget: 4000,
    budgetType: 'fixed' as const,
    timeline: '2-3 Tage',
    location: 'Düsseldorf',
    country: 'deutschland',
    state: 'Nordrhein-Westfalen',
    city: 'Düsseldorf',
    isRemote: false,
    urgency: 'medium' as const,
    projectScope: 'einmalig' as const,
    siteVisitPossible: true,
    workingHours: 'flexibel' as const,
    requiredQualifications: ['Professionelle Ausrüstung', 'Erfahrung mit Modefotografie'],
    contactPreference: 'email' as const,
    customerVerified: true,
    customerOrderCount: 2,
    customerResponseRate: 85,
  },
  {
    title: 'Catering für Firmenjubiläum (150 Personen)',
    description: 'Anlässlich unseres 25-jährigen Firmenjubiläums suchen wir einen erfahrenen Caterer für ein elegantes Abendessen mit 150 Gästen. Gewünscht: Sektempfang, 4-Gänge-Menü mit vegetarischer Alternative, Weinbegleitung und Dessertbuffet. Die Veranstaltung findet in unserer Firmenzentrale statt, Küche vorhanden. Personal für Service und Abräumen wird ebenfalls benötigt.',
    category: 'Hotel & Gastronomie',
    subcategory: 'Catering',
    budgetAmount: 12000,
    maxBudget: 18000,
    budgetType: 'fixed' as const,
    timeline: 'Einmaliges Event',
    location: 'Nürnberg',
    country: 'deutschland',
    state: 'Bayern',
    city: 'Nürnberg',
    isRemote: false,
    urgency: 'medium' as const,
    projectScope: 'einmalig' as const,
    siteVisitPossible: true,
    workingHours: 'abends' as const,
    requiredQualifications: ['Erfahrung mit größeren Events', 'Hygienezertifikat'],
    contactPreference: 'telefon' as const,
    customerVerified: true,
    customerOrderCount: 6,
    customerResponseRate: 94,
  },
  {
    title: 'Nachhilfe in Mathematik und Physik (Abitur)',
    description: 'Suchen erfahrenen Nachhilfelehrer für unseren Sohn (17 Jahre, Gymnasium, 12. Klasse) zur Vorbereitung auf das Abitur in Mathematik und Physik. Bevorzugt 2x pro Woche je 90 Minuten, gerne bei uns zu Hause oder online. Der Unterricht sollte ab sofort beginnen und bis zu den Prüfungen im Mai andauern. Geduld und strukturierte Vorgehensweise sind uns wichtig.',
    category: 'Bildung & Unterstützung',
    subcategory: 'Nachhilfe',
    budgetAmount: 35,
    maxBudget: 50,
    budgetType: 'hourly' as const,
    timeline: 'Bis Mai 2026',
    location: 'Leipzig',
    country: 'deutschland',
    state: 'Sachsen',
    city: 'Leipzig',
    isRemote: true,
    urgency: 'high' as const,
    projectScope: 'langfristig' as const,
    siteVisitPossible: true,
    workingHours: 'abends' as const,
    requiredQualifications: ['Studium MINT-Fach oder Lehramt', 'Erfahrung mit Abiturvorbereitung'],
    contactPreference: 'chat' as const,
    customerVerified: true,
    customerOrderCount: 1,
    customerResponseRate: 100,
  },
];

export async function POST() {
  if (!db) {
    return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
  }

  try {
    const batch = db.batch();
    const createdIds: string[] = [];
    const now = admin.firestore.Timestamp.now();

    for (const project of DEMO_PROJECTS) {
      const docRef = db.collection('project_requests').doc();
      
      batch.set(docRef, {
        ...project,
        // Standard-Felder
        status: 'open',
        isPublic: true,
        isDemo: true, // Markierung als Demo-Projekt
        requestType: 'marketplace',
        createdAt: now,
        updatedAt: now,
        viewCount: Math.floor(Math.random() * 50) + 10, // 10-60 Views
        proposalsCount: Math.floor(Math.random() * 5), // 0-4 Proposals
        customerUid: 'demo_customer_' + Math.random().toString(36).substring(7),
        escrowRequired: true,
        maxProposals: 10,
        proposalDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage
      });
      
      createdIds.push(docRef.id);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${DEMO_PROJECTS.length} Demo-Projekte erstellt`,
      projectIds: createdIds,
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Fehler beim Erstellen der Demo-Projekte',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}

export async function DELETE() {
  if (!db) {
    return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
  }

  try {
    // Lösche alle Demo-Projekte
    const snapshot = await db.collection('project_requests')
      .where('isDemo', '==', true)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${snapshot.size} Demo-Projekte gelöscht`,
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Fehler beim Löschen der Demo-Projekte',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
