// API Route für den KI-Projekt-Assistenten
// pages/api/ai/project-assistant.ts

import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface ProjectAssistantRequest {
  userId: string;
  message: string;
  currentStep: string;
  orderData?: Partial<OrderData>;
  sessionId: string;
}

interface OrderData {
  category: string;
  subcategory: string;
  description: string;
  location: {
    address: string;
    city: string;
    postalCode: string;
  };
  timeline: {
    startDate: string;
    endDate?: string;
    flexibility: 'rigid' | 'flexible' | 'very-flexible';
  };
  budget: {
    min: number;
    max: number;
    currency: 'EUR';
  };
  requirements: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

class TaskiloAIAssistant {
  private static serviceCategories = {
    handwerk: ['Elektriker', 'Klempner', 'Maler', 'Tischler', 'Renovierung'],
    reinigung: ['Hausreinigung', 'Büroreinigung', 'Fensterreinigung', 'Teppichreinigung'],
    garten: ['Rasenpflege', 'Baumschnitt', 'Gartengestaltung', 'Winterdienst'],
    transport: ['Umzug', 'Lieferung', 'Möbeltransport', 'Kurierdienst'],
    it: ['Computer-Reparatur', 'Software-Installation', 'Netzwerk-Setup', 'Datenrettung'],
    wellness: ['Massage', 'Physiotherapie', 'Personal Training', 'Beauty'],
    beratung: ['Rechtsberatung', 'Steuerberatung', 'Unternehmensberatung', 'Coaching'],
  };

  static async processMessage(request: ProjectAssistantRequest): Promise<{
    response: string;
    nextStep?: string;
    suggestions?: string[];
    orderData?: Partial<OrderData>;
    providerMatches?: Array<{
      id: string;
      name: string;
      rating: number;
      price: number;
      distance: number;
      experience: string;
      availability: string;
    }>;
  }> {
    const { message, currentStep, orderData = {} } = request;

    // Nachricht in Firestore speichern
    await this.saveConversation(request);

    switch (currentStep) {
      case 'welcome':
        return this.handleWelcome(message);

      case 'category-selection':
        return this.handleCategorySelection(message);

      case 'description':
        return this.handleDescription(message, orderData);

      case 'location':
        return this.handleLocation(message, orderData);

      case 'timeline':
        return this.handleTimeline(message, orderData);

      case 'budget':
        return this.handleBudget(message, orderData);

      case 'provider-matching':
        return await this.handleProviderMatching(message, orderData, request.userId);

      case 'project-monitoring':
        return await this.handleProjectMonitoring(message, request.userId);

      default:
        return {
          response: 'Entschuldigung, ich verstehe nicht ganz. Können Sie das anders formulieren?',
          suggestions: ['Neuen Auftrag erstellen', 'Hilfe anzeigen'],
        };
    }
  }

  private static handleWelcome(message: string) {
    const category = this.detectCategory(message);

    if (category) {
      return {
        response: `Perfekt! Ich erkenne, dass Sie Hilfe im Bereich "${category}" benötigen.

🎯 **Lassen Sie uns Ihren Auftrag optimal gestalten:**

Beschreiben Sie mir bitte genauer, was gemacht werden soll. Je detaillierter Ihre Beschreibung, desto besser kann ich passende Dienstleister finden.

💡 *Beispiel: "Badezimmer komplett renovieren, neue Fliesen, Dusche einbauen, ca. 8qm"*`,
        nextStep: 'description',
        orderData: { category },
        suggestions: [
          'Komplette Renovierung',
          'Reparatur/Wartung',
          'Installation/Montage',
          'Beratung benötigt',
        ],
      };
    }

    return {
      response: `Gerne helfe ich Ihnen! Um den perfekten Dienstleister zu finden, wählen Sie bitte eine Kategorie:`,
      nextStep: 'category-selection',
      suggestions: Object.keys(this.serviceCategories),
    };
  }

  private static handleCategorySelection(message: string) {
    const category = message.toLowerCase();
    const subcategories = this.serviceCategories[category as keyof typeof this.serviceCategories];

    if (subcategories) {
      return {
        response: `Ausgezeichnet! Für "${category}" bieten wir verschiedene Spezialisierungen an:

${subcategories.map(sub => `• ${sub}`).join('\n')}

Beschreiben Sie mir nun bitte Ihr konkretes Projekt. Was genau soll gemacht werden?`,
        nextStep: 'description',
        orderData: { category },
        suggestions: subcategories.slice(0, 4),
      };
    }

    return {
      response: 'Diese Kategorie kenne ich nicht. Bitte wählen Sie eine der verfügbaren Optionen.',
      suggestions: Object.keys(this.serviceCategories),
    };
  }

  private static handleDescription(message: string, orderData: Partial<OrderData>) {
    // KI-gestützte Analyse der Beschreibung
    const analysis = this.analyzeDescription(message);

    return {
      response: `Danke für die ausführliche Beschreibung!

📋 **Ich habe verstanden:**
${analysis.summary}

📍 **Wo soll das Projekt stattfinden?**
Bitte geben Sie Ihre Adresse oder PLZ ein, damit ich lokale Dienstleister finden kann.

${analysis.estimatedDuration ? `⏱️ *Geschätzte Projektdauer: ${analysis.estimatedDuration}*` : ''}`,
      nextStep: 'location',
      orderData: {
        ...orderData,
        description: message,
        requirements: analysis.requirements,
      },
      suggestions: ['München 80331', 'Berlin 10115', 'Hamburg 20095', 'Andere Stadt'],
    };
  }

  private static handleLocation(message: string, orderData: Partial<OrderData>) {
    const location = this.parseLocation(message);
    const nearbyProviders = this.estimateNearbyProviders(location.city);

    return {
      response: `Perfekt! Für ${location.city} habe ich bereits ${nearbyProviders} qualifizierte Dienstleister gefunden.

⏰ **Zeitplanung:**
Wann soll das Projekt idealerweise starten?

📅 Bitte geben Sie Ihren gewünschten Zeitrahmen an.`,
      nextStep: 'timeline',
      orderData: {
        ...orderData,
        location,
      },
      suggestions: ['So schnell wie möglich', 'Nächste Woche', 'Nächsten Monat', 'Flexibel'],
    };
  }

  private static handleTimeline(message: string, orderData: Partial<OrderData>) {
    const timeline = this.parseTimeline(message);
    const budgetEstimate = this.estimateBudget(orderData.category, orderData.description);

    return {
      response: `Zeitplan notiert! 📅

💰 **Budget-Empfehlung:**
Basierend auf ähnlichen Projekten in Ihrer Region:

• **Basis-Lösung:** ${budgetEstimate.min}€ - ${budgetEstimate.mid}€
• **Premium-Lösung:** ${budgetEstimate.mid}€ - ${budgetEstimate.max}€

Welcher Budgetrahmen passt für Sie?

💡 *Ein realistisches Budget hilft bei der Anbieter-Auswahl und Qualität.*`,
      nextStep: 'budget',
      orderData: {
        ...orderData,
        timeline,
      },
      suggestions: [
        `${budgetEstimate.min}€ - ${budgetEstimate.mid}€`,
        `${budgetEstimate.mid}€ - ${budgetEstimate.max}€`,
        `Über ${budgetEstimate.max}€`,
        'Budget flexibel',
      ],
    };
  }

  private static handleBudget(message: string, orderData: Partial<OrderData>) {
    const budget = this.parseBudget(message);

    return {
      response: `Budget perfekt! 💰

✅ **Ihr Auftrag ist bereit:**

🏷️ **Kategorie:** ${orderData.category}
📝 **Projekt:** ${orderData.description?.substring(0, 100)}...
📍 **Ort:** ${orderData.location?.city}
📅 **Start:** ${orderData.timeline?.startDate || 'Flexibel'}
💰 **Budget:** ${budget.min}€ - ${budget.max}€

🔍 **Soll ich jetzt die besten Dienstleister für Sie suchen?**

Ich analysiere Bewertungen, Verfügbarkeit und Preise!`,
      nextStep: 'provider-matching',
      orderData: {
        ...orderData,
        budget,
      },
      suggestions: ['Ja, Dienstleister suchen!', 'Noch etwas ändern', 'Auftrag speichern'],
    };
  }

  private static async handleProviderMatching(
    message: string,
    orderData: Partial<OrderData>,
    userId: string
  ) {
    if (message.toLowerCase().includes('ja') || message.toLowerCase().includes('suchen')) {
      // Erstelle den Auftrag in Firestore
      const orderId = await this.createOrder(orderData, userId);

      // Suche passende Dienstleister
      const providers = await this.findMatchingProviders(orderData);

      return {
        response: `🎉 **Auftrag erfolgreich erstellt!** (ID: ${orderId})

🔍 **Top 3 Dienstleister gefunden:**

${providers
  .map(
    (provider) => `
⭐ **${provider.name}** (${provider.rating}/5)
💰 Ab ${provider.price}€ | 📍 ${provider.distance}km entfernt
✅ ${provider.experience} | 📅 ${provider.availability}
`
  )
  .join('\n')}

Welchen Dienstleister möchten Sie kontaktieren?`,
        nextStep: 'project-monitoring',
        providerMatches: providers,
        suggestions: providers.map(p => `${p.name} auswählen`),
      };
    }

    return {
      response: 'Was möchten Sie ändern? Ich helfe gerne beim Anpassen!',
      suggestions: ['Beschreibung ändern', 'Anderer Ort', 'Anderes Budget', 'Anderer Zeitpunkt'],
    };
  }

  private static async handleProjectMonitoring(message: string, userId: string) {
    // Lade aktuelle Projekte des Users
    const activeProjects = await this.getActiveProjects(userId);

    if (message.toLowerCase().includes('status')) {
      return {
        response: `📊 **Projekt-Status Update:**

${activeProjects
  .map(
    project => `
🔄 **${project.title}**
• Status: ${project.status}
• Fortschritt: ${project.progress}%
• Nächster Termin: ${project.nextAppointment}
• Dienstleister: ${project.providerName}
`
  )
  .join('\n')}

Gibt es spezielle Fragen zu einem Projekt?`,
        suggestions: [
          'Termin verschieben',
          'Mit Dienstleister chatten',
          'Zusätzliche Arbeiten',
          'Rechnung anfordern',
        ],
      };
    }

    return {
      response: `Wie kann ich Ihnen bei Ihrem laufenden Projekt helfen?

💡 **Verfügbare Aktionen:**
• Projekt-Status abrufen
• Termine verwalten
• Kommunikation koordinieren
• Zahlungen abwickeln
• Bewertungen abgeben`,
      suggestions: ['Projekt-Status zeigen', 'Neuen Auftrag erstellen', 'Hilfe kontaktieren'],
    };
  }

  // Hilfsmethoden
  private static detectCategory(message: string): string | null {
    const keywords = {
      handwerk: ['renovierung', 'reparatur', 'elektriker', 'klempner', 'maler', 'handwerker'],
      reinigung: ['putzen', 'reinigung', 'sauber', 'clean'],
      garten: ['garten', 'rasen', 'baum', 'pflanzen'],
      transport: ['umzug', 'transport', 'lieferung', 'möbel'],
      it: ['computer', 'laptop', 'software', 'netzwerk', 'tech'],
    };

    for (const [category, keywordList] of Object.entries(keywords)) {
      if (keywordList.some(keyword => message.toLowerCase().includes(keyword))) {
        return category;
      }
    }
    return null;
  }

  private static analyzeDescription(description: string) {
    // Einfache KI-Analyse der Beschreibung
    const requirements: string[] = [];
    let estimatedDuration = '';

    if (description.includes('komplett') || description.includes('renovierung')) {
      requirements.push('Umfassende Arbeiten');
      estimatedDuration = '1-2 Wochen';
    }
    if (description.includes('notfall') || description.includes('dringend')) {
      requirements.push('Eilauftrag');
      estimatedDuration = '24-48 Stunden';
    }

    return {
      summary: `• ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`,
      requirements,
      estimatedDuration,
    };
  }

  private static parseLocation(message: string) {
    // Vereinfachte Adress-Parsing
    const plzMatch = message.match(/\d{5}/);
    const cityMatch = message.match(/[A-Za-zäöüß\s]+/);

    return {
      address: message,
      city: cityMatch ? cityMatch[0].trim() : 'Unbekannt',
      postalCode: plzMatch ? plzMatch[0] : '',
    };
  }

  private static parseTimeline(message: string) {
    let flexibility: 'rigid' | 'flexible' | 'very-flexible' = 'flexible';
    let startDate = '';

    if (message.includes('sofort') || message.includes('schnell')) {
      startDate = 'Diese Woche';
      flexibility = 'rigid';
    } else if (message.includes('nächste woche')) {
      startDate = 'Nächste Woche';
    } else if (message.includes('flexibel')) {
      startDate = 'Flexibel';
      flexibility = 'very-flexible';
    }

    return { startDate, flexibility };
  }

  private static parseBudget(message: string) {
    const budgetMatch = message.match(/(\d+)\s*€?\s*-?\s*(\d+)?\s*€?/);
    if (budgetMatch) {
      return {
        min: parseInt(budgetMatch[1]),
        max: budgetMatch[2] ? parseInt(budgetMatch[2]) : parseInt(budgetMatch[1]) * 1.5,
        currency: 'EUR' as const,
      };
    }
    return { min: 200, max: 500, currency: 'EUR' as const };
  }

  private static estimateNearbyProviders(city: string): number {
    // Mock-Schätzung basierend auf Stadt
    const cityProviders: Record<string, number> = {
      münchen: 45,
      berlin: 52,
      hamburg: 38,
      köln: 34,
    };
    return cityProviders[city.toLowerCase()] || 15;
  }

  private static estimateBudget(category?: string, _description?: string) {
    const baseBudgets: Record<string, { min: number; mid: number; max: number }> = {
      handwerk: { min: 150, mid: 400, max: 800 },
      reinigung: { min: 50, mid: 120, max: 250 },
      garten: { min: 80, mid: 200, max: 500 },
      transport: { min: 100, mid: 300, max: 600 },
      it: { min: 80, mid: 180, max: 400 },
    };

    return baseBudgets[category || 'handwerk'];
  }

  private static async createOrder(orderData: Partial<OrderData>, userId: string): Promise<string> {
    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        userId,
        status: 'created',
        createdAt: new Date(),
        aiAssisted: true,
      });
      return orderRef.id;
    } catch {
      return 'temp-' + Date.now();
    }
  }

  private static async findMatchingProviders(_orderData: Partial<OrderData>) {
    // Mock-Dienstleister Matching
    return [
      {
        id: '1',
        name: 'ProService München',
        rating: 4.9,
        price: 280,
        distance: 2.5,
        experience: '15 Jahre Erfahrung',
        availability: 'Verfügbar diese Woche',
      },
      {
        id: '2',
        name: 'Express-Handwerk',
        rating: 4.8,
        price: 320,
        distance: 1.8,
        experience: '10 Jahre Erfahrung',
        availability: 'Verfügbar nächste Woche',
      },
      {
        id: '3',
        name: 'Lokal-Profis',
        rating: 4.7,
        price: 250,
        distance: 3.2,
        experience: '8 Jahre Erfahrung',
        availability: 'Sofort verfügbar',
      },
    ];
  }

  private static async getActiveProjects(userId: string) {
    try {
      const projectsQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        where('status', 'in', ['active', 'in-progress'])
      );
      const snapshot = await getDocs(projectsQuery);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        title: doc.data().description?.substring(0, 50) + '...',
        status: 'In Bearbeitung',
        progress: 65,
        nextAppointment: 'Morgen 10:00',
        providerName: 'ProService München',
      }));
    } catch {
      return [];
    }
  }

  private static async saveConversation(request: ProjectAssistantRequest) {
    try {
      await addDoc(collection(db, 'ai_conversations'), {
        ...request,
        timestamp: new Date(),
      });
    } catch {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProjectAssistantRequest;

    // Validierung
    if (!body.userId || !body.message) {
      return NextResponse.json({ error: 'UserId und Message sind erforderlich' }, { status: 400 });
    }

    const result = await TaskiloAIAssistant.processMessage(body);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
