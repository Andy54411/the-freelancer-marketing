// API Route für Gemini zum Abrufen von Blog-Inhalten
// Ermöglicht der Support-KI aktualisierte Informationen von https://taskilo.de/blog zu beziehen

import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /gemini/blog-content] Gemini Blog-Content Request empfangen');

    // Strukturierte Blog-Inhalte für Gemini Support
    const blogContent = {
      lastUpdated: new Date().toISOString(),
      platform: {
        name: 'Taskilo',
        description:
          'Deutschlands moderne Service-Plattform, die Kunden mit qualifizierten Dienstleistern verbindet',
        website: 'https://taskilo.de',
        type: 'B2C & B2B Service-Marktplatz',
      },

      // Hauptkategorien der Services
      serviceCategories: {
        haushaltsservices: {
          name: 'Haushaltsservices',
          description: 'Reinigung, Gartenpflege, Handwerk, Umzüge und mehr',
          examples: ['Reinigung', 'Gartenpflege', 'Handwerk', 'Umzüge'],
        },
        handwerk: {
          name: 'Handwerk',
          description: 'Maler, Elektriker, Klempner, Schreiner und Fachkräfte',
          examples: ['Maler', 'Elektriker', 'Klempner', 'Schreiner', 'Fachkräfte'],
        },
        digitaleServices: {
          name: 'Digitale Services',
          description: 'Webdesign, Marketing, IT-Support, Grafik und mehr',
          examples: ['Webdesign', 'Marketing', 'IT-Support', 'Grafik'],
        },
        businessServices: {
          name: 'Business Services',
          description: 'Beratung, Übersetzungen, Buchhaltung, Legal Services',
          examples: ['Beratung', 'Übersetzungen', 'Buchhaltung', 'Legal Services'],
        },
      },

      // Zahlungssystem (sehr wichtig für Support)
      paymentSystem: {
        provider: 'Stripe Connect',
        security: 'Bank-Level Sicherheit, SSL-Verschlüsselung, PCI DSS Level 1 Compliance',
        methods: ['Kreditkarten', 'SEPA', 'Apple Pay', 'Google Pay'],

        // Zahlungsabläufe für Kunden
        customerPaymentFlow: {
          standardPayments: {
            step1: 'Service mit Festpreis buchen',
            step2: 'Sofortige sichere Zahlung über Stripe - Geld wird auf Treuhandkonto gehalten',
            step3: 'Dienstleister führt Service durch',
            step4: 'Automatische Freigabe nach Abschluss an Dienstleister',
          },
          additionalHours: {
            process: 'Bei Mehrarbeit dokumentiert Dienstleister zusätzliche Stunden',
            approval: 'Kunde erhält Benachrichtigung und kann Stunden prüfen/genehmigen',
            payment: 'Sofortige sichere Zahlung nach Genehmigung',
            protection: 'Geld wird erst nach Kundenbestätigung freigegeben',
          },
        },

        // Zahlungsabläufe für Dienstleister
        providerPaymentFlow: {
          setup: {
            required: 'Einmalige Stripe Connect Einrichtung gesetzlich vorgeschrieben',
            steps: ['Unternehmensdaten angeben', 'Bankkonto verknüpfen', 'Zahlungen empfangen'],
          },
          payouts: {
            timing: 'Täglich um 16:00 Uhr automatisch',
            processing: '1-2 Werktage Bearbeitungszeit',
            costs: 'Keine zusätzlichen Kosten',
          },
          additionalHours: {
            step1: 'Stunden dokumentieren - zusätzliche Arbeitszeit genau erfassen',
            step2: 'Freigabe einreichen - Kunde erhält Benachrichtigung zur Prüfung',
            step3: 'Automatische Zahlung nach Genehmigung',
          },
        },

        // Gebührenstruktur
        fees: {
          customers: {
            hiddenCosts: 'Keine versteckten Kosten',
            pricing: 'Transparente Preisgestaltung',
            stripe: 'Stripe-Gebühren bereits eingerechnet',
          },
          providers: {
            platformFee: '5-10% Platform-Gebühr',
            payouts: 'Kostenlose Auszahlungen',
            reporting: 'Detaillierte Abrechnungen',
          },
        },
      },

      // Sicherheit & Schutz
      security: {
        moneySafety: 'Geld ist sicher - Treuhandkonto-System mit automatischer Freigabe',
        providerVetting: 'Dienstleister sind geprüft und verifiziert',
        dataProtection: 'DSGVO-konform, SSL-Verschlüsselung für alle Daten',
        disputeManagement: 'Dispute-Management bei Problemen verfügbar',
      },

      // Erste Schritte & Registrierung
      gettingStarted: {
        registration: 'Kostenlose Registrierung für Kunden und Dienstleister',
        customerProcess: 'Service auswählen → Buchen → Bezahlen → Service erhalten',
        providerProcess: 'Registrieren → Stripe Connect einrichten → Aufträge annehmen',
        verification: 'Dienstleister durchlaufen Verifizierungsprozess',
      },

      // Support & Kontakt
      support: {
        liveChat: {
          availability: 'Mo-Fr 9:00-18:00 Uhr',
          action: 'Chat direkt auf der Website verfügbar',
        },
        email: {
          address: 'support@taskilo.de',
          response: 'Schnelle Bearbeitung aller Anfragen',
        },
        phone: {
          number: '+49 (0) 30 1234 5678',
          availability: 'Geschäftszeiten',
        },
      },

      // Häufige Support-Themen
      commonQuestions: {
        howItWorks: 'Taskilo verbindet Kunden mit Dienstleistern über sichere Zahlungsabwicklung',
        registrationCost: 'Registrierung ist komplett kostenlos',
        serviceTypes: 'Haushaltsservices, Handwerk, Digitale Services, Business Services verfügbar',
        paymentSafety: 'Stripe Connect mit Treuhandkonto-System garantiert sichere Zahlungen',
        providerPayment: 'Automatische Auszahlung täglich um 16:00 Uhr',
        additionalCosts: 'Transparente Preise, keine versteckten Kosten für Kunden',
        mobileApp: 'Website ist mobiloptimiert, native App in Planung',
        directBooking: 'Ja, Termine können direkt über die Plattform gebucht werden',
        ratingSystem: 'Bewertungssystem für Qualitätssicherung implementiert',
      },

      // Links & Navigation
      importantLinks: {
        mainSite: 'https://taskilo.de',
        blogOverview: 'https://taskilo.de/blog',
        paymentGuide: 'https://taskilo.de/blog/zahlungsablaeufe',
        registerCustomer: 'https://taskilo.de/register/user',
        registerProvider: 'https://taskilo.de/register/company',
        startProject: 'https://taskilo.de/auftrag/get-started',
        contact: 'https://taskilo.de/contact',
        about: 'https://taskilo.de/about',
        legal: {
          impressum: 'https://taskilo.de/impressum',
          datenschutz: 'https://taskilo.de/datenschutz',
          agb: 'https://taskilo.de/agb',
        },
      },
    };

    console.log(
      '[API /gemini/blog-content] Blog-Content erfolgreich strukturiert und bereitgestellt'
    );

    return NextResponse.json({
      success: true,
      content: blogContent,
      usage: {
        purpose: 'Gemini Support AI Knowledge Base',
        instructions:
          'Diese Daten enthalten alle wichtigen Informationen über Taskilo für die Support-AI',
        lastUpdate: blogContent.lastUpdated,
      },
    });
  } catch (error) {
    console.error('[API /gemini/blog-content] Fehler beim Bereitstellen der Blog-Inhalte:', error);

    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Blog-Inhalte für Gemini',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
