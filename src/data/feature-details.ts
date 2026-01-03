// Central feature data for detail pages
export const allFeatureDetails = {
  // Intelligente Suche & Matching
  'ki-basierte-anbietersuche': {
    title: 'Taskilo KI-Anbietersuche',
    subtitle: 'Intelligente Algorithmen finden den perfekten Match für Ihr Projekt',
    description:
      'Unsere Taskilo KI analysiert Ihre Projektanforderungen und findet automatisch die besten passenden Dienstleister basierend auf Standort, Verfügbarkeit, Expertise und Bewertungen.',
    category: 'Intelligente Suche & Matching',
    benefits: [
      'Machine Learning Algorithmen für optimale Matches',
      'Automatische Kategorisierung von Projektanforderungen',
      'Intelligente Filterung nach Qualifikationen',
      'Bewertungsbasierte Qualitätssicherung',
      'Kontinuierliche Verbesserung durch Nutzerfeedback',
    ],
    useCases: [
      'Komplexe Projekte mit spezifischen Anforderungen',
      'Schnelle Findung qualifizierter Spezialisten',
      'Automatische Vorauswahl bei großer Anbieteranzahl',
      'Matching basierend auf früheren erfolgreichen Projekten',
    ],
    howItWorks: [
      'Beschreiben Sie Ihr Projekt in natürlicher Sprache',
      'Taskilo KI analysiert Schlüsselwörter und Projektkontext',
      'Automatische Zuordnung zu passenden Dienstleisterkategorien',
      'Scoring-System bewertet Anbieter nach Passgenauigkeit',
      'Präsentation der Top-Matches mit Begründung',
    ],
    stats: [
      { value: '96%', label: 'Matching-Genauigkeit' },
      { value: '< 5 Sek', label: 'Analysezeit' },
      { value: '4.8/5', label: 'Kundenzufriedenheit' },
    ],
    callToAction: {
      primary: { text: 'Taskilo KI-Suche testen', href: '/auftrag/get-started' },
      secondary: { text: 'Wie es funktioniert', href: '/help/ki-suche' },
    },
  },

  'geo-lokalisierte-suche': {
    title: 'Geo-lokalisierte Suche',
    subtitle: 'Finden Sie Dienstleister in Ihrer direkten Umgebung',
    description:
      'Präzise Standortbestimmung mit anpassbaren Suchradius-Filtern. Finden Sie lokale Anbieter für persönliche Services oder erweitern Sie den Radius für spezialisierte Dienstleistungen.',
    category: 'Intelligente Suche & Matching',
    benefits: [
      'GPS-genaue Standortbestimmung',
      'Anpassbare Suchradius von 1-50km',
      'Verkehrszeiten-Integration für realistische Anfahrt',
      'Lokale Anbieter bevorzugt für persönliche Services',
      'Überregionale Suche für spezialisierte Dienste',
    ],
    useCases: [
      'Notfall-Services in der Nähe',
      'Lokale Handwerker für Hausreparaturen',
      'Haushaltsservices im direkten Umkreis',
      'Spezialisierte Dienstleister auch überregional',
    ],
    howItWorks: [
      'Automatische Standorterkennung oder manuelle Eingabe',
      'Auswahl des gewünschten Suchradius',
      'Filterung der Anbieter nach Entfernung',
      'Anzeige von Anfahrtszeiten und Kosten',
      'Sortierung nach Nähe oder anderen Kriterien',
    ],
    stats: [
      { value: '±5m', label: 'Standortgenauigkeit' },
      { value: '1-50km', label: 'Suchradius' },
      { value: '90%', label: 'Lokale Verfügbarkeit' },
    ],
    callToAction: {
      primary: { text: 'Lokale Anbieter finden', href: '/auftrag/get-started' },
      secondary: { text: 'Standort-Features', href: '/features/location' },
    },
  },

  'bewertungsbasiertes-ranking': {
    title: 'Bewertungsbasiertes Ranking',
    subtitle: 'Die besten Anbieter immer an der Spitze',
    description:
      'Unser intelligentes Bewertungssystem kombiniert Kundenfeedback, Projektabschlussquote und Qualitätskriterien für ein faires und transparentes Ranking.',
    category: 'Intelligente Suche & Matching',
    benefits: [
      'Transparentes 5-Sterne Bewertungssystem',
      'Verifizierte Bewertungen nur von echten Kunden',
      'Gewichtung nach Projektgröße und -komplexität',
      'Kontinuierliche Qualitätskontrolle',
      'Automatische Filterung von Fake-Bewertungen',
    ],
    useCases: [
      'Vertrauen in unbekannte Dienstleister aufbauen',
      'Qualitätsvergleich zwischen Anbietern',
      'Risikominimierung bei wichtigen Projekten',
      'Schnelle Identifikation von Top-Performern',
    ],
    howItWorks: [
      'Kunden bewerten nach Projektabschluss',
      'Mehrdimensionale Bewertung (Qualität, Pünktlichkeit, Kommunikation)',
      'Algorithmus gewichtet Bewertungen nach Relevanz',
      'Automatische Erkennung und Filterung von Anomalien',
      'Dynamisches Ranking basierend auf aktueller Performance',
    ],
    callToAction: {
      primary: { text: 'Top-bewertete Anbieter finden', href: '/auftrag/get-started' },
      secondary: { text: 'Bewertungssystem verstehen', href: '/help/ratings' },
    },
  },

  'sofortbuchung-verfuegbar': {
    title: 'Sofortbuchung verfügbar',
    subtitle: 'Direktbuchung ohne Wartezeit für dringende Projekte',
    description:
      'Bei verfügbaren Anbietern können Sie sofort buchen und zahlen. Ideal für Notfälle oder wenn es schnell gehen muss.',
    category: 'Intelligente Suche & Matching',
    benefits: [
      'Keine Wartezeit auf Angebotsbestätigung',
      'Sofortige Terminbestätigung',
      'Echtzeit-Verfügbarkeitsprüfung',
      'Automatische Zahlungsabwicklung',
      'Instant-Benachrichtigung an Dienstleister',
    ],
    useCases: [
      'Notfall-Reparaturen (Heizungsausfall, Wasserschäden)',
      'Last-Minute Services (Reinigung vor Besuch)',
      'Dringende IT-Support Anfragen',
      'Spontane Dienstleistungen',
    ],
    howItWorks: [
      'Anbieter markieren verfügbare Zeitslots',
      'System prüft Echtzeit-Verfügbarkeit',
      'Ein-Klick-Buchung mit sofortiger Bestätigung',
      'Automatische Zahlung und Vertragsabschluss',
      'Direkter Kontakt zwischen Kunde und Anbieter',
    ],
    callToAction: {
      primary: { text: 'Sofort buchen', href: '/auftrag/get-started' },
      secondary: { text: 'Verfügbare Services', href: '/services/instant' },
    },
  },

  // 🛡️ Sicherheit & Vertrauen
  'verifizierte-dienstleister': {
    title: 'Verifizierte Dienstleister',
    subtitle: 'Mehrstufiger Verifikationsprozess für maximale Sicherheit',
    description:
      'Alle Anbieter durchlaufen eine umfassende Überprüfung inklusive Identitätsprüfung, Qualifikationsnachweis und Referenzvalidierung.',
    category: 'Sicherheit & Vertrauen',
    benefits: [
      'Persönliche Identitätsprüfung per Video-Ident',
      'Überprüfung von Qualifikationen und Zertifikaten',
      'Gewerbeanmeldung und Steuer-Compliance Check',
      'Referenzvalidierung und Background-Check',
      'Kontinuierliche Qualitätsüberwachung',
    ],
    useCases: [
      'Sicherheit bei sensiblen Haushaltsdiensten',
      'Vertrauen bei hochwertigen Reparaturen',
      'Qualitätsgarantie bei Business-Services',
      'Rechtssicherheit bei gewerblichen Aufträgen',
    ],
    howItWorks: [
      'Anbieter-Registrierung mit Dokumenten-Upload',
      'Video-Ident Verfahren zur Identitätsprüfung',
      'Fachliche Qualifikationsprüfung',
      'Referenz- und Background-Check',
      'Freischaltung nach erfolgreicher Vollverifikation',
    ],
    stats: [
      { value: '100%', label: 'Anbieter verifiziert' },
      { value: '5 Stufen', label: 'Prüfprozess' },
      { value: '< 0.1%', label: 'Probleme mit Anbietern' },
    ],
    callToAction: {
      primary: { text: 'Verifizierte Anbieter finden', href: '/auftrag/get-started' },
      secondary: { text: 'Verifikationsprozess', href: '/safety/verification' },
    },
  },

  qualitaetsgarantie: {
    title: 'Qualitätsgarantie',
    subtitle: 'Geld-zurück-Garantie bei nicht zufriedenstellender Leistung',
    description:
      'Unser umfassendes Schutzprogramm garantiert Ihre Zufriedenheit oder Sie erhalten Ihr Geld zurück. Zusätzlicher Schutz durch Versicherungen.',
    category: 'Sicherheit & Vertrauen',
    benefits: [
      '100% Geld-zurück-Garantie bei Unzufriedenheit',
      'Kostenlose Nachbesserung bei Mängeln',
      'Versicherungsschutz für Schäden',
      'Mediation bei Streitfällen',
      'Schnelle und unbürokratische Abwicklung',
    ],
    useCases: [
      'Schutz bei teuren Reparatur-Arbeiten',
      'Absicherung bei neuen, unbekannten Anbietern',
      'Qualitätssicherung bei wichtigen Projekten',
      'Vertrauen bei sensiblen Dienstleistungen',
    ],
    howItWorks: [
      'Automatischer Schutz bei jeder Buchung',
      'Reklamation innerhalb von 30 Tagen möglich',
      'Mediation zwischen Kunde und Anbieter',
      'Bei erfolgloser Lösung: Geld-zurück-Garantie',
      'Versicherung übernimmt bei Schäden',
    ],
    callToAction: {
      primary: { text: 'Geschützt buchen', href: '/auftrag/get-started' },
      secondary: { text: 'Garantie-Details', href: '/safety/guarantee' },
    },
  },

  'transparente-vertraege': {
    title: 'Transparente Verträge',
    subtitle: 'Klare Projektbeschreibungen und rechtlich bindende Bedingungen',
    description:
      'Alle Verträge sind digital dokumentiert, transparent und rechtlich bindend. Klare Preise, Leistungsbeschreibungen und Bedingungen ohne versteckte Kosten.',
    category: 'Sicherheit & Vertrauen',
    benefits: [
      'Digitale, rechtlich bindende Verträge',
      'Transparente Preisgestaltung ohne versteckte Kosten',
      'Detaillierte Leistungsbeschreibungen',
      'Standardisierte AGB zum Schutz aller Parteien',
      'Automatische Vertragsdokumentation',
    ],
    useCases: [
      'Rechtssicherheit bei allen Projekten',
      'Klare Abgrenzung von Leistungsumfang',
      'Schutz vor Nachforderungen',
      'Professionelle Geschäftsabwicklung',
    ],
    howItWorks: [
      'Automatische Vertragserstellung bei Buchung',
      'Detaillierte Projekt- und Preisbeschreibung',
      'Digitale Signatur durch beide Parteien',
      'Sichere Speicherung in der Cloud',
      'Jederzeit einsehbar in Ihrem Dashboard',
    ],
    callToAction: {
      primary: { text: 'Verträge einsehen', href: '/dashboard/contracts' },
      secondary: { text: 'Rechtliche Infos', href: '/legal/contracts' },
    },
  },

  '247-support-system': {
    title: '24/7 Support-System',
    subtitle: 'Taskilo KI-Support rund um die Uhr verfügbar',
    description:
      'Unser intelligentes Support-System kombiniert Taskilo KI-Chat, Wissensdatenbank und menschliche Experten für schnelle Hilfe zu jeder Tages- und Nachtzeit.',
    category: 'Sicherheit & Vertrauen',
    benefits: [
      'Taskilo KI-Chat für sofortige Antworten',
      'Menschliche Experten bei komplexen Fragen',
      'Umfassende Wissensdatenbank',
      'Multi-Channel Support (Chat, E-Mail, Telefon)',
      'Prioritäts-Support für Business-Kunden',
    ],
    useCases: [
      'Technische Probleme außerhalb der Geschäftszeiten',
      'Dringende Fragen bei laufenden Projekten',
      'Hilfe bei der ersten Nutzung',
      'Konfliktlösung zwischen Kunden und Anbietern',
    ],
    howItWorks: [
      'Taskilo KI-Chat analysiert Ihre Frage sofort',
      'Automatische Weiterleitung an passende Ressourcen',
      'Bei Bedarf Verbindung zu menschlichen Experten',
      'Ticket-System für komplexe Anfragen',
      'Follow-up bis zur vollständigen Lösung',
    ],
    callToAction: {
      primary: { text: 'Support kontaktieren', href: '/support' },
      secondary: { text: 'Hilfe-Center', href: '/help' },
    },
  },

  // Sichere Zahlungssysteme
  'revolut-integration': {
    title: 'Sichere Zahlungen',
    subtitle: 'Sichere Zahlungsabwicklung mit allen gängigen Zahlungsmethoden',
    description:
      'Powered by Revolut - eine der sichersten Zahlungsplattformen Europas. Unterstützt alle gängigen Zahlungsmethoden von Kreditkarte bis SEPA.',
    category: 'Moderne Zahlungssysteme',
    benefits: [
      'EU-lizenzierte Bank mit höchsten Sicherheitsstandards',
      'Alle gängigen Zahlungsmethoden (Kreditkarte, SEPA, Banküberweisung)',
      'Sofortige Zahlungsbestätigung',
      'Europäische Datenverarbeitung',
      'DSGVO-konforme Zahlungsabwicklung',
    ],
    useCases: [
      'Sichere Online-Zahlung vor Projektbeginn',
      'Escrow-System für sichere Auftragsabwicklung',
      'Flexible Zahlungsmethoden je nach Kundenvorliebe',
      'B2B Zahlungen mit SEPA-Überweisung',
    ],
    howItWorks: [
      'Wählen Sie Ihre bevorzugte Zahlungsmethode',
      'Sichere Dateneingabe über verschlüsselte Verbindung',
      'Sofortige Zahlungsverarbeitung und Bestätigung',
      'Automatische Rechnungserstellung',
      'Funds werden sicher im Escrow bis Projektabschluss gehalten',
    ],
    stats: [
      { value: '99.99%', label: 'Verfügbarkeit' },
      { value: 'EU', label: 'Datenstandort' },
      { value: '< 2 Sek', label: 'Zahlungszeit' },
    ],
    callToAction: {
      primary: { text: 'Sicher bezahlen', href: '/auftrag/get-started' },
      secondary: { text: 'Zahlungsmethoden', href: '/payment/methods' },
    },
  },

  '3-abrechnungsmodelle': {
    title: '3 Abrechnungsmodelle',
    subtitle: 'Festpreis, Meilenstein-basiert oder Stundenabrechnung',
    description:
      'Flexible Abrechnungsmodelle für jeden Projekttyp: Festpreis für B2C, Meilenstein-basiert für B2B-Projekte oder Stundenabrechnung für langfristige Zusammenarbeiten.',
    category: 'Moderne Zahlungssysteme',
    benefits: [
      'Festpreis-Modell für planbare Kosten',
      'Meilenstein-Zahlungen für große Projekte',
      'Stunden-Abrechnung für flexible Services',
      'Automatische Rechnungsstellung',
      'Transparente Kostenaufschlüsselung',
    ],
    useCases: [
      'Haushaltsservices mit Festpreis',
      'Große IT-Projekte mit Meilensteinen',
      'Beratungsleistungen nach Stunden',
      'Langfristige Wartungsverträge',
    ],
    howItWorks: [
      'Anbieter wählt passendes Abrechnungsmodell',
      'Transparente Preisangabe vor Buchung',
      'Automatische Abrechnung nach vereinbartem Modell',
      'Detaillierte Rechnungsstellung',
      'Flexible Anpassung bei Projektänderungen',
    ],
    callToAction: {
      primary: { text: 'Abrechnungsmodelle vergleichen', href: '/pricing/models' },
      secondary: { text: 'Für Anbieter', href: '/register/company' },
    },
  },

  'escrow-service': {
    title: 'Escrow-Service',
    subtitle: 'Treuhänderservice für sichere Zahlungsabwicklung',
    description:
      'Ihr Geld wird sicher verwahrt bis zur erfolgreichen Projektabwicklung. Schutz für beide Seiten durch professionellen Treuhänderservice.',
    category: 'Moderne Zahlungssysteme',
    benefits: [
      'Sicherer Treuhänderservice für alle Zahlungen',
      'Schutz vor Betrug für Kunden und Anbieter',
      'Automatische Freigabe bei Projektabschluss',
      'Dispute-Resolution bei Konflikten',
      'Rechtlich geprüfte Abwicklung',
    ],
    useCases: [
      'Absicherung bei hohen Projektsummen',
      'Vertrauen bei unbekannten Anbietern',
      'Internationale Zahlungen',
      'Schutz bei zeitaufwändigen Projekten',
    ],
    howItWorks: [
      'Zahlung wird beim Escrow-Service hinterlegt',
      'Anbieter erhält Bestätigung der verfügbaren Mittel',
      'Projektdurchführung unter Escrow-Schutz',
      'Automatische Freigabe bei erfolgreicher Lieferung',
      'Mediation bei Unstimmigkeiten',
    ],
    callToAction: {
      primary: { text: 'Escrow-Service nutzen', href: '/auftrag/get-started' },
      secondary: { text: 'Sicherheit verstehen', href: '/safety/escrow' },
    },
  },

  'automatische-rechnungen': {
    title: 'Automatische Rechnungen',
    subtitle: 'DATEV und sevdesk Integration für automatische Buchhaltung',
    description:
      'Nahtlose Integration mit professionellen Buchhaltungstools. Automatische Rechnungserstellung und steuerconforme Dokumentation für Ihre Buchhaltung.',
    category: 'Moderne Zahlungssysteme',
    benefits: [
      'Integration mit DATEV und sevdesk',
      'Automatische Rechnungserstellung',
      'Steuerconforme Dokumentation',
      'Digitale Belegerfassung',
      'Vorsteuerabzug für Unternehmen',
    ],
    useCases: [
      'Automatisierte Buchhaltung für Unternehmen',
      'Steuerliche Absetzbarkeit von Dienstleistungen',
      'Professionelle Rechnungsstellung',
      'Compliance mit Steuergesetzen',
    ],
    howItWorks: [
      'Automatische Rechnungserstellung nach Projektabschluss',
      'Export zu DATEV oder sevdesk',
      'Rechtskonforme Rechnungsformate',
      'Automatische Mehrwertsteuer-Berechnung',
      'Digitale Archivierung für 10 Jahre',
    ],
    callToAction: {
      primary: { text: 'Buchhaltung automatisieren', href: '/dashboard/accounting' },
      secondary: { text: 'Integration einrichten', href: '/settings/integrations' },
    },
  },

  // Business Solutions
  'time-tracking': {
    title: 'Zeiterfassung',
    subtitle: 'Arbeitszeiten digital und gesetzeskonform erfassen',
    description:
      'Professionelle Zeiterfassung fur Ihr Unternehmen. Erfassen Sie Arbeitszeiten Ihrer Mitarbeiter digital, gesetzeskonform und effizient - mit mobiler App und Auswertungen.',
    category: 'Business Solutions',
    benefits: [
      'Gesetzeskonforme Arbeitszeiterfassung nach deutschem Arbeitsrecht',
      'Mobile Stempeluhr fur Mitarbeiter im Aussendienst',
      'Automatische Pausen- und Uberstundenberechnung',
      'Projektbezogene Zeiterfassung fur genaue Kostenrechnung',
      'Integration mit Lohnbuchhaltung und DATEV',
      'GPS-Tracking fur Aussendienst-Mitarbeiter (optional)',
    ],
    useCases: [
      'Handwerksbetriebe mit Aussendienst-Teams',
      'Dienstleister mit projektbezogener Abrechnung',
      'Unternehmen mit Compliance-Anforderungen',
      'Teams mit Home-Office und flexiblen Arbeitszeiten',
      'Schichtbetriebe mit Wechselschichten',
    ],
    howItWorks: [
      'Mitarbeiter stempeln per App, Terminal oder Browser ein und aus',
      'System erfasst automatisch Arbeitszeiten und Pausen',
      'Vorgesetzte prufen und genehmigen Zeiteintraege',
      'Automatische Berechnung von Uberstunden und Zuschlaegen',
      'Export der Daten zur Lohnabrechnung oder DATEV',
    ],
    stats: [
      { value: '100%', label: 'Gesetzeskonform' },
      { value: '< 3 Sek', label: 'Stempeln per App' },
      { value: '24/7', label: 'Mobile Erfassung' },
    ],
    callToAction: {
      primary: { text: 'Jetzt kostenlos testen', href: '/register/company' },
      secondary: { text: 'Demo anfordern', href: '/contact' },
    },
  },

  'employee-records': {
    title: 'Digitale Mitarbeiterakte',
    subtitle: 'Personalverwaltung vollstandig digitalisieren',
    description:
      'Alle Mitarbeiterdaten sicher und zentral verwaltet. Von Arbeitsvertragen uber Gehaltsabrechnungen bis zu Weiterbildungen - alles digital und DSGVO-konform.',
    category: 'Business Solutions',
    benefits: [
      'Zentrale Verwaltung aller Personaldokumente',
      'DSGVO-konforme Speicherung mit Zugriffsrechten',
      'Automatische Erinnerungen fur Fristen und Termine',
      'Digitale Unterschriften fur Vertrage und Dokumente',
      'Vollstandige Audit-Trails fur Compliance',
      'Self-Service Portal fur Mitarbeiter',
    ],
    useCases: [
      'Aufbewahrung von Arbeitsvertragen und Anderungen',
      'Verwaltung von Zertifikaten und Qualifikationen',
      'Dokumentation von Mitarbeitergesprachen',
      'Urlaubsantraege und Abwesenheitsmanagement',
      'Onboarding neuer Mitarbeiter',
    ],
    howItWorks: [
      'Mitarbeiter werden im System angelegt mit Stammdaten',
      'Dokumente werden digital hochgeladen und kategorisiert',
      'Automatische Erinnerungen bei ablaufenden Dokumenten',
      'Mitarbeiter haben Self-Service Zugang zu ihren Daten',
      'Vorgesetzte und HR erhalten rollenbasierte Zugriffsrechte',
    ],
    stats: [
      { value: '100%', label: 'DSGVO-konform' },
      { value: '10 Jahre', label: 'Dokumentenarchiv' },
      { value: '256-Bit', label: 'Verschlusselung' },
    ],
    callToAction: {
      primary: { text: 'Jetzt digitalisieren', href: '/register/company' },
      secondary: { text: 'Funktionen entdecken', href: '/features' },
    },
  },
};

export type FeatureDetail = (typeof allFeatureDetails)[keyof typeof allFeatureDetails];
