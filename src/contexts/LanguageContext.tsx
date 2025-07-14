'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, values?: Record<string, any>) => string;
  availableLanguages: { code: string; name: string; flag: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  de: {
    // Basis UI-Elemente
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolgreich',
    cancel: 'Abbrechen',
    save: 'Speichern',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    close: 'Schließen',
    back: 'Zurück',
    next: 'Weiter',
    submit: 'Absenden',
    search: 'Suchen',
    filter: 'Filter',
    sort: 'Sortieren',
    name: 'Name',
    email: 'E-Mail',
    phone: 'Telefon',
    address: 'Adresse',
    description: 'Beschreibung',
    price: 'Preis',
    date: 'Datum',
    time: 'Zeit',
    status: 'Status',
    category: 'Kategorie',
    service: 'Service',
    provider: 'Anbieter',
    customer: 'Kunde',
    order: 'Auftrag',
    orders: 'Aufträge',
    dashboard: 'Dashboard',
    profile: 'Profil',
    settings: 'Einstellungen',
    logout: 'Abmelden',
    login: 'Anmelden',
    register: 'Registrieren',
    password: 'Passwort',
    confirm: 'Bestätigen',
    welcome: 'Willkommen',
    hello: 'Hallo',
    goodbye: 'Auf Wiedersehen',
    yes: 'Ja',
    no: 'Nein',
    maybe: 'Vielleicht',
    required: 'Erforderlich',
    optional: 'Optional',
    available: 'Verfügbar',
    unavailable: 'Nicht verfügbar',
    online: 'Online',
    offline: 'Offline',
    new: 'Neu',
    old: 'Alt',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    pending: 'Ausstehend',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
    accepted: 'Angenommen',
    rejected: 'Abgelehnt',
    payment: 'Zahlung',
    invoice: 'Rechnung',
    total: 'Gesamt',
    subtotal: 'Zwischensumme',
    tax: 'Steuer',
    discount: 'Rabatt',
    shipping: 'Versand',
    free: 'Kostenlos',
    premium: 'Premium',
    basic: 'Basis',
    advanced: 'Erweitert',
    help: 'Hilfe',
    support: 'Support',
    contact: 'Kontakt',
    about: 'Über uns',
    terms: 'AGB',
    privacy: 'Datenschutz',
    imprint: 'Impressum',

    // Navigation & Menu
    home: 'Startseite',
    services: 'Dienstleistungen',
    providers: 'Anbieter',
    customers: 'Kunden',
    marketplace: 'Marktplatz',
    bookings: 'Buchungen',
    reviews: 'Bewertungen',
    messages: 'Nachrichten',
    notifications: 'Benachrichtigungen',

    // Hero Section
    'hero.title.line1': 'Finde Hilfe für jede',
    'hero.title.line2': 'Aufgabe in deiner Nähe',
    'hero.title.line3': 'mit ',
    'hero.description':
      'Entdecke lokale Experten für alle deine Aufgaben – von Handwerkerleistungen bis hin zu professionellen Dienstleistungen. Taskilo verbindet dich schnell und einfach mit qualifizierten Anbietern in deiner Nähe.',
    'hero.button.searchHelp': 'Hilfe suchen',
    'hero.button.offerHelp': 'Hilfe anbieten',
    'hero.newProviders': 'Neue Anbieter auf Taskilo',
    'hero.noProviders': 'Keine neuen Anbieter verfügbar',

    // Call to Action
    'cta.title': 'Bereit für Taskilo?',
    'cta.description':
      'Starte jetzt und entdecke die einfachste Art, lokale Dienstleistungen zu finden und anzubieten',
    'cta.button.registerCustomer': 'Als Kunde registrieren',
    'cta.button.registerProvider': 'Als Anbieter registrieren',
    'cta.benefits': 'Kostenlose Registrierung • Verifizierte Anbieter • Sichere Zahlungen',

    // Banner
    'banner.text': 'Neue Features kommen bald!',
    'banner.learnMore': 'Mehr erfahren',
    'banner.close': 'Banner schließen',

    // Service Categories
    'category.cleaning': 'Reinigung',
    'category.handyman': 'Handwerker',
    'category.gardening': 'Gartenpflege',
    'category.tutoring': 'Nachhilfe',
    'category.beauty': 'Schönheit & Wellness',
    'category.moving': 'Umzug',
    'category.petcare': 'Tierpflege',
    'category.delivery': 'Lieferservice',
    'category.repairs': 'Reparaturen',
    'category.photography': 'Fotografie',

    // Booking Process
    'booking.selectService': 'Service auswählen',
    'booking.selectProvider': 'Anbieter auswählen',
    'booking.selectDateTime': 'Termin wählen',
    'booking.confirmation': 'Buchung bestätigen',
    'booking.details': 'Buchungsdetails',
    'booking.location': 'Standort',
    'booking.duration': 'Dauer',
    'booking.notes': 'Anmerkungen',
    'booking.specialRequests': 'Besondere Wünsche',
    'booking.selectCategory': 'Kategorie wählen',
    'booking.selectSubcategory': 'Unterkategorie wählen',
    'booking.orderSummary': 'Auftragszusammenfassung',
    'booking.confirmBooking': 'Buchung bestätigen',
    'booking.payNow': 'Jetzt bezahlen',

    // Modal Komponenten
    'modal.close': 'Modal schließen',
    'modal.open': 'Öffnen',
    'modal.confirm': 'Bestätigen',
    'modal.cancel': 'Abbrechen',
    'modal.title': 'Titel',

    // Navigation erweitert
    'navigation.home': 'Startseite',
    'navigation.services': 'Dienstleistungen',
    'navigation.dashboard': 'Dashboard',
    'navigation.profile': 'Profil',
    'navigation.orders': 'Aufträge',
    'navigation.inbox': 'Postfach',
    'navigation.settings': 'Einstellungen',
    'navigation.logout': 'Abmelden',
    'navigation.menu': 'Menü',
    'navigation.back': 'Zurück',

    // Status Nachrichten
    'status.loading': 'Lädt...',
    'status.saving': 'Speichert...',
    'status.success': 'Erfolgreich',
    'status.error': 'Fehler aufgetreten',
    'status.notFound': 'Nicht gefunden',
    'status.unauthorized': 'Nicht berechtigt',
    'status.processing': 'Wird bearbeitet...',

    // Admin Bereich
    'admin.overview': 'Übersicht',
    'admin.companies': 'Firmen',
    'admin.orders': 'Aufträge',
    'admin.messages': 'Nachrichten',
    'admin.support': 'Offene Support-Tickets',
    'admin.users': 'Benutzer',
    'admin.invites': 'Einladungen',
    'admin.settings': 'Einstellungen',
    'admin.analytics': 'Statistiken',
    'admin.reports': 'Berichte',
    'admin.permissions': 'Berechtigungen',

    // Dashboard
    'dashboard.welcome': 'Willkommen im Dashboard',
    'dashboard.overview': 'Übersicht',
    'dashboard.recentOrders': 'Aktuelle Aufträge',
    'dashboard.earnings': 'Einnahmen',
    'dashboard.statistics': 'Statistiken',

    // Login & Registrierung
    'login.title': 'Anmelden',
    'login.subtitle': 'Willkommen zurück',
    'login.email': 'E-Mail-Adresse',
    'login.password': 'Passwort',
    'login.remember': 'Angemeldet bleiben',
    'login.forgot': 'Passwort vergessen?',
    'login.submit': 'Anmelden',
    'login.register': 'Noch kein Konto? Registrieren',

    // Testimonials
    'testimonials.title.part1': 'Was unsere Kunden über',
    'testimonials.title.part2': 'sagen',
    'testimonials.subtitle': 'Über 10.000 zufriedene Kunden vertrauen bereits auf Taskilo',

    // Testimonial Rollen
    'testimonials.role.homeowner': 'Hausbesitzerin',
    'testimonials.role.manager': 'Geschäftsführer',
    'testimonials.role.mother': 'Mutter von 2 Kindern',
    'testimonials.role.apartmentOwner': 'Apartment-Besitzerin',
    'testimonials.role.entrepreneur': 'IT-Unternehmer',
    'testimonials.role.gardenLover': 'Gartenliebhaberin',
    'testimonials.role.carEnthusiast': 'Auto-Enthusiast',

    // Testimonial Inhalte
    'testimonials.content.maria':
      'Taskilo hat mir geholfen, einen fantastischen Elektriker zu finden. Schnell, professionell und zu einem fairen Preis!',
    'testimonials.content.thomas':
      'Für unser Büro haben wir über Taskilo einen zuverlässigen Reinigungsservice gefunden. Absolute Empfehlung!',
    'testimonials.content.julia':
      'Die Kinderbetreuung über Taskilo war ein Segen. Verifizierte Betreuer und einfache Buchung.',
    'testimonials.content.andreas':
      'Meine Küche wurde perfekt renoviert. Taskilo macht es einfach, vertrauensvolle Handwerker zu finden.',
    'testimonials.content.sarah':
      'Von der Buchung bis zur Bezahlung - alles lief reibungslos. Taskilo ist meine erste Wahl!',
    'testimonials.content.michael':
      'Für IT-Support haben wir schnell einen kompetenten Techniker gefunden. Sehr zufrieden!',
    'testimonials.content.lisa':
      'Mein Garten wurde wunderschön gestaltet. Die Gärtner auf Taskilo sind echte Profis.',
    'testimonials.content.david':
      'Autowäsche und Pflege über Taskilo - schnell gebucht und perfekt ausgeführt.',

    // Testimonial Statistiken
    'testimonials.stats.avgRating': 'Ø Bewertung',
    'testimonials.stats.happyCustomers': 'Zufriedene Kunden',
    'testimonials.stats.reviews': 'Bewertungen',

    // Auth zusätzlich
    'auth.or': 'Oder fahre fort mit',

    // Messages & Chat
    'messages.chatWith': 'Chat mit',
    'messages.loading': 'Chat-Nachrichten werden hier geladen...',

    // Inbox
    'inbox.newRequests': 'Neue Anfragen',
    'inbox.sentOffers': 'Angebot gesendet',
    'inbox.archive': 'Archiv',

    // Sidebar Spezifisch
    'sidebar.unknown': 'Unbekannt',
    'sidebar.noEmail': 'Keine E-Mail verfügbar',
    'sidebar.lifecycle': 'Lifecycle',
    'sidebar.projects': 'Projekte',
    'sidebar.team': 'Team',
    'sidebar.capture': 'Erfassen',
    'sidebar.proposal': 'Vorschlag',
    'sidebar.prompts': 'Prompts',
    'sidebar.activeProposals': 'Aktive Vorschläge',
    'sidebar.archived': 'Archiviert',
    'sidebar.getHelp': 'Hilfe erhalten',
    'sidebar.dataLibrary': 'Datenbibliothek',
    'sidebar.wordAssistant': 'Wort-Assistent',

    // Error Messages Extended
    'error.userNotAuthenticated': 'Benutzer ist nicht authentifiziert',
    'error.userNotFound': 'Kein Benutzer gefunden',
    'error.dataFetch': 'Fehler beim Abrufen der Daten',

    // Navigation Extended
    'navigation.documents': 'Dokumente',

    // Common
    'common.more': 'Mehr',
    'common.open': 'Öffnen',

    // Documents
    'documents.open': 'Öffnen',
    'documents.share': 'Teilen',

    // Chat Component
    'chat.title': 'Chat zum Auftrag',
    'chat.status.unknown': 'Unbekannt',
    'chat.status.customer': 'Kunde',
    'chat.status.provider': 'Anbieter',
    'chat.loading.chat': 'Chat wird geladen...',
    'chat.loading.userdata': 'Benutzerdaten werden geladen...',
    'chat.error.profile':
      'Bitte melden Sie sich an oder Ihr Profil konnte nicht geladen werden, um den Chat zu nutzen.',
    'chat.error.profileLoad': 'Fehler beim Laden Ihres Profils für den Chat.',
    'chat.error.messageLoad':
      'Fehler beim Laden der Nachrichten. Bitte versuchen Sie es später erneut.',
    'chat.error.messageSend':
      'Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
    'chat.error.emailBlocked':
      'Die Weitergabe von E-Mail-Adressen ist im Chat nicht gestattet. Bitte halten Sie die Kommunikation auf der Plattform.',
    'chat.error.phoneBlocked':
      'Die Weitergabe von Telefonnummern ist im Chat nicht gestattet. Bitte halten Sie die Kommunikation auf der Plattform.',
    'chat.messages.noMessages': 'Noch keine Nachrichten in diesem Chat. Seien Sie der Erste!',
    'chat.messages.placeholder': 'Nachricht eingeben...',
    'chat.timestamps.yesterday': 'Gestern',

    // Payment & Checkout
    'payment.title': 'Zahlungsdetails',
    'payment.processing': 'Wird bearbeitet...',
    'payment.payNow': 'Jetzt {amount} EUR zahlen',
    'payment.success': 'Zahlung erfolgreich!',
    'payment.stripeNotReady': 'Stripe ist noch nicht bereit. Bitte versuchen Sie es später erneut.',
    'payment.loadingPaymentData':
      'Zahlungsdaten werden noch geladen. Bitte warten Sie einen Moment.',
    'payment.validationError': 'Fehler bei der Validierung der Zahlungsdaten.',
    'payment.cardError': 'Kartenfehler oder Validierungsfehler.',
    'payment.unexpectedError': 'Ein unerwarteter Fehler ist aufgetreten.',
    'payment.generalError': 'Ein allgemeiner Fehler ist im Bezahlprozess aufgetreten.',
    'payment.statusPending': 'Zahlungsstatus: {status}. Du wirst ggf. weitergeleitet.',
    'payment.stripeApiError': 'Stripe API nicht verfügbar.',
    'payment.clientSecretMissing': 'Client Secret fehlt.',
    'payment.elementsValidationFailed': 'Elements-Validierung fehlgeschlagen.',
    'payment.confirmationFailed': 'Zahlungsbestätigung fehlgeschlagen.',
    'payment.notSuccessfulOrUnknown': 'Zahlung nicht erfolgreich oder Status unbekannt.',

    // Checkout Page
    'checkout.paymentDetails': 'Zahlungsdetails',
    'checkout.processing': 'Verarbeite...',
    'checkout.payNow': 'Jetzt {amount} {currency} zahlen',
    'checkout.success': 'Zahlung erfolgreich! ID: {id}',
    'checkout.statusPending': 'Zahlungsstatus: {status}. Du wirst ggf. weitergeleitet.',
    'checkout.unknownResult':
      'Unbekannter Zahlungsstatus oder Ergebnis von Stripe (kein Fehler, kein PaymentIntent).',
    'checkout.generalError': 'Ein allgemeiner Fehler ist im Bezahlprozess aufgetreten.',
    'checkout.confirmationError': 'Ein Fehler ist bei der Zahlungsbestätigung aufgetreten.',

    // Booking Flow (Get Started)
    'booking.steps.customerType': 'Kundentyp wählen',
    'booking.steps.category': 'Kategorie wählen',
    'booking.steps.subcategory': 'Unterkategorie wählen',
    'booking.steps.description': 'Auftrag beschreiben',
    'booking.title': 'Um welchen Auftrag handelt es sich?',
    'booking.subtitle':
      'Finden Sie die Dienstleistung, die Sie benötigen, um geprüfte Handwerker in Ihrer Nähe zu kontaktieren.',
    'booking.stepProgress': 'Schritt {current}/{total}',
    'booking.showSteps': 'Schritte anzeigen',
    'booking.customerType.private': 'Privatkunde',
    'booking.customerType.business': 'Geschäftskunde',
    'booking.customerType.privateDesc': 'Für den Haushalt, Garten oder persönliche Projekte',
    'booking.customerType.businessDesc': 'Für Ihr Unternehmen, Büro oder Gewerbe',
    'booking.category.title': 'Welche Kategorie passt zu Ihrem Auftrag?',
    'booking.category.search': 'Kategorie suchen...',
    'booking.subcategory.title': 'Welche Unterkategorie passt am besten?',
    'booking.subcategory.search': 'Unterkategorie suchen...',
    'booking.description.title': 'Beschreiben Sie Ihren Auftrag',
    'booking.description.placeholder': 'Beschreiben Sie hier Ihren Auftrag...',
    'booking.description.help':
      'Je detaillierter Ihre Beschreibung, desto besser können sich passende Anbieter bei Ihnen melden.',
    'booking.next': 'Weiter zu Anbieter suchen',
    'booking.error.fillAllFields': 'Bitte füllen Sie alle Felder aus.',
    'booking.modal.title': 'Buchungsschritte',
    'booking.modal.close': 'Schließen',

    // Auth Components
    'auth.checking': 'Authentifizierung wird geprüft...',
    'auth.loading': 'Laden...',

    // Dashboard
    'dashboard.loading': 'Dashboard wird geladen...',
    'dashboard.title': 'Dashboard',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.orders': 'Aufträge',
    'nav.profile': 'Profil',
    'nav.help': 'Hilfe',
    'nav.startWithTaskilo': 'Starte mit Taskilo',
    'nav.services': 'Services',
    'nav.about': 'Über uns',
    'nav.contact': 'Kontakt',
    'nav.openMenu': 'Menü öffnen',
    'nav.closeMenu': 'Menü schließen',

    // Admin Dashboard
    'admin.title': 'Admin Dashboard',
    'admin.description': 'Überblick über alle wichtigen Kennzahlen und Verwaltungsfunktionen.',
    'admin.welcome': 'Willkommen im Admin-Dashboard',
    'admin.platform.title': 'Plattform-Verwaltung',
    'admin.settings.description':
      'Verwalten Sie Plattformgebühren, Stripe-Einstellungen und andere wichtige Konfigurationen',

    // Company Dashboard
    'company.tabs.overview': 'Übersicht',
    'company.tabs.calendar': 'Kalender',
    'company.tabs.profile': 'Profil',
    'company.tabs.settings': 'Einstellungen',
    'company.table.service': 'Dienstleistung',
    'company.table.customer': 'Kunde',
    'company.table.status': 'Status',
    'company.table.date': 'Datum',
    'company.table.revenue': 'Umsatz',
    'company.orders.viewAll': 'Alle eingegangenen Aufträge anzeigen',
    'company.profile.title': 'Company Profile verwalten',
    'company.profile.description':
      'Verwalten Sie Ihr Unternehmensprofil, Services, Portfolio und FAQ für eine professionelle Präsentation auf Taskilo.',
    'company.profile.management': 'Profil-Management',
    'company.profile.placeholder': 'Profil-Features werden hier implementiert.',

    // Chart und Datenvisualisierung
    'chart.revenue.title': 'Umsatz Übersicht',
    'chart.revenue.description': 'Zeigt den Gesamtumsatz über die ausgewählte Zeitperiode an',
    'chart.revenue.loading': 'Umsatzdaten werden geladen...',
    'chart.revenue.error': 'Die Umsatzdaten konnten nicht geladen werden.',
    'chart.revenue.noData': 'Keine Umsatzdaten für den ausgewählten Zeitraum verfügbar.',
    'chart.revenue.totalRevenue': 'Gesamtumsatz',
    'chart.timeRange.7d': '7 Tage',
    'chart.timeRange.30d': '30 Tage',
    'chart.timeRange.90d': '90 Tage',
    'chart.timeRange.label': 'Zeitraum auswählen',
    'chart.tooltip.revenue': 'Umsatz',
    'chart.tooltip.date': 'Datum',
    'chart.axis.revenue': 'Umsatz (€)',
    'chart.axis.date': 'Datum',

    // Data Table
    'table.columns.adjust': 'Spalten anpassen',
    'table.columns.short': 'Spalten',
    'table.section.add': 'Abschnitt hinzufügen',
    'table.loading': 'Daten werden geladen...',
    'table.noData': 'Keine Daten verfügbar',
    'table.pagination.previous': 'Vorherige',
    'table.pagination.next': 'Nächste',
    'table.pagination.first': 'Erste',
    'table.pagination.last': 'Letzte',
    'table.pagination.rows': 'Zeilen pro Seite',
    'table.pagination.showing': 'Seite {from} von {to}',
    'table.search.placeholder': 'Suchen...',
    'table.filter.all': 'Alle',
    'table.select.all': 'Alle auswählen',
    'table.select.none': 'Auswahl aufheben',
    'table.drag.reorder': 'Zum Neuordnen ziehen',
    'table.navigation.firstPage': 'Zur ersten Seite',
    'table.navigation.previousPage': 'Zur vorherigen Seite',
    'table.navigation.nextPage': 'Zur nächsten Seite',
    'table.navigation.lastPage': 'Zur letzten Seite',

    // Get Started Page (Booking Flow)
    'booking.steps.title': 'Um welchen Auftrag handelt es sich?',
    'booking.steps.subtitle':
      'Finden Sie die Dienstleistung, die Sie benötigen, um geprüfte Handwerker in Ihrer Nähe zu kontaktieren.',
    'booking.steps.current': 'Schritt {current}/{total}',
    'booking.steps.showSteps': 'Schritte anzeigen',
    'booking.customer.private.title': 'Ich bin Privatkunde',
    'booking.customer.private.description': 'Dienstleister für mein Zuhause finden und buchen.',
    'booking.customer.business.title': 'Ich bin ein Unternehmen',
    'booking.customer.business.description': 'Für mein Unternehmen Hilfe buchen (B2B).',
    'booking.category.main.label': 'Wähle eine Hauptkategorie',
    'booking.category.main.placeholder': 'z. B. Handwerk, IT & Technik …',
    'booking.category.sub.label': 'Wähle eine Unterkategorie',
    'booking.category.sub.placeholder': 'z. B. Elektriker, Umzugshelfer …',

    // Section Cards
    'cards.newOrders.title': 'Neue Aufträge',
    'cards.newOrders.status': 'Warten auf Annahme',
    'cards.balance.pending': 'ausstehend',
    'cards.balance.available': 'Sofort verfügbar',
    'cards.withdraw.confirm': 'Auszahlung beantragen:',
    'cards.withdraw.available': 'Verfügbares Guthaben',
    'cards.withdraw.fee': 'Plattformgebühr (4,5%)',
    'cards.withdraw.amount': 'Auszahlungsbetrag',
    'cards.withdraw.question': 'Möchten Sie die Auszahlung jetzt beantragen?',
    'cards.withdraw.processing': 'Wird verarbeitet...',
    'cards.withdraw.button': 'Auszahlen',
    'cards.withdraw.error': 'Fehler bei der Auszahlung',
    'cards.withdraw.unknownError': 'Unbekannter Fehler',

    // User Dashboard
    'user.dashboard.loading': 'Lade dein persönliches Dashboard...',
    'user.dashboard.errorMessage':
      'Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.',

    // Add Payment Method Form
    'payment.addMethod.title': 'Zahlungsmethode hinzufügen',
    'payment.addMethod.processing': 'Verarbeitung läuft...',
    'payment.addMethod.success': 'Zahlungsmethode erfolgreich hinzugefügt!',
    'payment.addMethod.systemNotReady': 'Zahlungssystem ist noch nicht bereit.',
    'payment.addMethod.setupFailed': 'Setup der Zahlungsmethode fehlgeschlagen.',
    'payment.addMethod.unexpectedError': 'Ein unerwarteter Fehler ist aufgetreten.',
    'payment.addMethod.addButton': 'Zahlungsmethode hinzufügen',

    // User Info Card
    'user.role.customer': 'Kunde',
    'user.role.provider': 'Anbieter',
    'user.viewProfile': 'Profil anzeigen',
    'user.avatarAlt': '{name} Avatar',

    // Reviews & Ratings
    'reviews.title': 'Bewertungen',
    'reviews.average': 'Durchschnittsbewertung',
    'reviews.total': '{count} Bewertungen',
    'reviews.noReviews': 'Noch keine Bewertungen vorhanden',
    'reviews.loading': 'Bewertungen werden geladen...',
    'reviews.loadMore': 'Weitere Bewertungen laden',
    'reviews.anonymous': 'Anonymer Nutzer',
    'reviews.verified': 'Verifizierte Bewertung',
    'reviews.returning': 'Wiederkehrender Kunde',
    'reviews.translate': 'Übersetzen',
    'reviews.translating': 'Übersetzen...',
    'reviews.showMore': 'Mehr anzeigen',
    'reviews.showLess': 'Weniger anzeigen',
    'reviews.helpful': 'Hilfreich',
    'reviews.providerResponse': 'Antwort des Anbieters',
    'reviews.projectTitle': 'Projekt',
    'reviews.projectPrice': 'Preis',
    'reviews.projectDuration': 'Dauer',

    // Provider Profile
    'provider.rating': 'Bewertung',
    'provider.experience': 'Erfahrung',
    'provider.responseTime': 'Antwortzeit',
    'provider.completedJobs': 'Erledigte Aufträge',
    'provider.languages': 'Sprachen',
    'provider.availability': 'Verfügbarkeit',
    'provider.portfolio': 'Portfolio',
    'provider.certifications': 'Zertifikate',

    // Reviews & Ratings
    'review.writeReview': 'Bewertung schreiben',
    'review.overall': 'Gesamtbewertung',
    'review.quality': 'Qualität',
    'review.punctuality': 'Pünktlichkeit',
    'review.communication': 'Kommunikation',
    'review.value': 'Preis-Leistung',
    'review.wouldRecommend': 'Würde weiterempfehlen',

    // Forms & Validation
    'form.firstName': 'Vorname',
    'form.lastName': 'Nachname',
    'form.phoneNumber': 'Telefonnummer',
    'form.postalCode': 'Postleitzahl',
    'form.city': 'Stadt',
    'form.street': 'Straße',
    'form.houseNumber': 'Hausnummer',
    'form.emailInvalid': 'Ungültige E-Mail-Adresse',
    'form.fieldRequired': 'Dieses Feld ist erforderlich',
    'form.passwordTooShort': 'Passwort zu kurz (mindestens 8 Zeichen)',
    'form.passwordsDoNotMatch': 'Passwörter stimmen nicht überein',

    // Account & Authentication
    'auth.signUp': 'Registrieren',
    'auth.signIn': 'Anmelden',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.resetPassword': 'Passwort zurücksetzen',
    'auth.confirmPassword': 'Passwort bestätigen',
    'auth.createAccount': 'Konto erstellen',
    'auth.alreadyHaveAccount': 'Bereits ein Konto?',
    'auth.noAccount': 'Noch kein Konto?',
    'auth.terms': 'Nutzungsbedingungen',
    'auth.privacy': 'Datenschutzerklärung',
    'auth.agreeToTerms': 'Ich stimme den Nutzungsbedingungen zu',

    // Messages & Chat
    'message.typeMessage': 'Nachricht eingeben...',
    'message.send': 'Senden',
    'message.online': 'Online',
    'message.lastSeen': 'Zuletzt online',
    'message.typing': 'tippt...',
    'message.delivered': 'Zugestellt',
    'message.read': 'Gelesen',

    // Payment & Billing (existing)
    'payment.method': 'Zahlungsmethode',
    'payment.card': 'Kreditkarte',
    'payment.paypal': 'PayPal',
    'payment.bankTransfer': 'Überweisung',
    'payment.cash': 'Barzahlung',
    'payment.successful': 'Zahlung erfolgreich',
    'payment.failed': 'Zahlung fehlgeschlagen',
    'payment.refund': 'Rückerstattung',

    // Time & Date
    'time.today': 'Heute',
    'time.tomorrow': 'Morgen',
    'time.yesterday': 'Gestern',
    'time.thisWeek': 'Diese Woche',
    'time.nextWeek': 'Nächste Woche',
    'time.morning': 'Morgen',
    'time.afternoon': 'Nachmittag',
    'time.evening': 'Abend',
    'time.flexible': 'Flexibel',

    // Status Messages
    'status.pending': 'Ausstehend',
    'status.confirmed': 'Bestätigt',
    'status.inProgress': 'In Bearbeitung',
    'status.completed': 'Abgeschlossen',
    'status.cancelled': 'Storniert',
    'status.refunded': 'Erstattet',

    // Error Messages
    'error.general': 'Es ist ein Fehler aufgetreten',
    'error.network': 'Netzwerkfehler',
    'error.serverError': 'Serverfehler',
    'error.notFound': 'Nicht gefunden',
    'error.unauthorized': 'Nicht autorisiert',
    'error.sessionExpired': 'Sitzung abgelaufen',

    // Success Messages
    'success.profileUpdated': 'Profil aktualisiert',
    'success.bookingCreated': 'Buchung erstellt',
    'success.messageSent': 'Nachricht gesendet',
    'success.reviewSubmitted': 'Bewertung eingereicht',
    'success.passwordChanged': 'Passwort geändert',

    // Footer
    'footer.product': 'Produkt',
    'footer.features': 'Features',
    'footer.comingSoon': 'Bald verfügbar',
    'footer.categories': 'Kategorien',
    'footer.pricing': 'Preise',
    'footer.help': 'Hilfe',
    'footer.solutions': 'Lösungen',
    'footer.forCompanies': 'Für Unternehmen',
    'footer.forFreelancers': 'Für Freelancer',
    'footer.forCustomers': 'Für Kunden',
    'footer.startProject': 'Projekt starten',
    'footer.becomeProvider': 'Anbieter werden',
    'footer.company': 'Unternehmen',
    'footer.about': 'Über uns',
    'footer.careers': 'Karriere',
    'footer.blog': 'Blog',
    'footer.press': 'Presse',
    'footer.contact': 'Kontakt',
    'footer.legal': 'Rechtliches',
    'footer.imprint': 'Impressum',
    'footer.privacy': 'Datenschutz',
    'footer.terms': 'AGB',
    'footer.cookies': 'Cookie-Einstellungen',
    'footer.emailPlaceholder': 'Ihre E-Mail-Adresse',
    'footer.subscribe': 'Abonnieren',
    'footer.newsletterText': 'Bleiben Sie über neue Features und Updates informiert',
    'footer.copyright': '© {year} Taskilo. Alle Rechte vorbehalten.',

    // CategoryGrid
    'categoryGrid.furniture.label': 'Möbelmontage',
    'categoryGrid.furniture.title': 'Möbelmontage',
    'categoryGrid.furniture.text': 'Hilfe beim Aufbau von Möbeln und IKEA-Produkten.',
    'categoryGrid.furniture.tag1': 'Möbelmontage',
    'categoryGrid.furniture.tag2': 'IKEA Montage',
    'categoryGrid.chef.label': 'Mietköche',
    'categoryGrid.chef.title': 'Mietköche',
    'categoryGrid.chef.text': 'Flexible Köche für Events, Zuhause oder Gastronomie.',
    'categoryGrid.chef.tag1': 'Privatkoch buchen',
    'categoryGrid.chef.tag2': 'Event-Küche',
    'categoryGrid.electrical.label': 'Elektrikarbeiten',
    'categoryGrid.electrical.title': 'Elektrikarbeiten',
    'categoryGrid.electrical.text': 'Professionelle Unterstützung bei Elektroarbeiten.',
    'categoryGrid.electrical.tag1': 'Lichtinstallation',
    'categoryGrid.electrical.tag2': 'Steckdosen tauschen',
    'categoryGrid.repair.label': 'Reparaturen im Haus',
    'categoryGrid.repair.title': 'Reparaturen',
    'categoryGrid.repair.text': 'Hilfe bei kleinen Reparaturen und Wartungen.',
    'categoryGrid.repair.tag1': 'Kleinreparaturen',
    'categoryGrid.repair.tag2': 'Tür einstellen',
    'categoryGrid.moving.label': 'Umzug',
    'categoryGrid.moving.title': 'Umzug',
    'categoryGrid.moving.text': 'Ein- und Auspacken, Tragen und Möbeltransport.',
    'categoryGrid.moving.tag1': 'Umzugshilfe',
    'categoryGrid.moving.tag2': 'Schwere Lasten heben',
    'categoryGrid.popular.label': 'Beliebt',
    'categoryGrid.popular.title': 'Beliebte Tasks',
    'categoryGrid.popular.text': 'Die beliebtesten Dienstleistungen der Woche.',
    'categoryGrid.popular.tag1': 'Top Anbieter',
    'categoryGrid.popular.tag2': 'Trending',
    'categoryGrid.trends':
      'Aktuelle Trends: Geschwungene Sofas, Computer-Schreibtische und nachhaltige Materialien.',
    'categoryGrid.loading': 'Laden...',
    'categoryGrid.imageNotAvailable': 'Bild nicht verfügbar',

    // Features Section
    'features.verified.title': 'Verifizierte Dienstleister',
    'features.verified.description':
      'Alle Unternehmen und Handwerker durchlaufen einen strengen Verifizierungsprozess für maximale Sicherheit und Qualität.',
    'features.booking.title': 'Blitzschnelle Buchung',
    'features.booking.description':
      'Buchen Sie professionelle Dienstleistungen in wenigen Klicks - von der Anfrage bis zur Bestätigung in Minuten.',
    'features.payment.title': 'Sichere Bezahlung',
    'features.payment.description':
      'Integrierte Zahlungsabwicklung mit Käuferschutz. Zahlen Sie erst nach erfolgreicher Leistungserbringung.',
    'features.contact.title': 'Direkter Kontakt',
    'features.contact.description':
      'Kommunizieren Sie direkt mit Ihren Dienstleistern über unseren integrierten Chat und behalten Sie den Überblick.',
    'features.nationwide.title': 'Deutschlandweit verfügbar',
    'features.nationwide.description':
      'Finden Sie qualifizierte Dienstleister in ganz Deutschland - von Hamburg bis München.',
    'features.reviews.title': 'Transparente Bewertungen',
    'features.reviews.description':
      'Echte Kundenbewertungen und detaillierte Profile helfen Ihnen bei der Auswahl des besten Dienstleisters.',
    'features.sectionTitle': 'Warum Taskilo die beste Wahl ist',
    'features.sectionDescription':
      'Entdecken Sie, wie Taskilo die Verbindung zwischen Kunden und professionellen Dienstleistern revolutioniert',
  },
  en: {
    // Basic UI Elements
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    description: 'Description',
    price: 'Price',
    date: 'Date',
    time: 'Time',
    status: 'Status',
    category: 'Category',
    service: 'Service',
    provider: 'Provider',
    customer: 'Customer',
    order: 'Order',
    orders: 'Orders',
    dashboard: 'Dashboard',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    login: 'Login',
    register: 'Register',
    password: 'Password',
    confirm: 'Confirm',
    welcome: 'Welcome',
    hello: 'Hello',
    goodbye: 'Goodbye',
    yes: 'Yes',
    no: 'No',
    maybe: 'Maybe',
    required: 'Required',
    optional: 'Optional',
    available: 'Available',
    unavailable: 'Unavailable',
    online: 'Online',
    offline: 'Offline',
    new: 'New',
    old: 'Old',
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    accepted: 'Accepted',
    rejected: 'Rejected',
    payment: 'Payment',
    invoice: 'Invoice',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    shipping: 'Shipping',
    free: 'Free',
    premium: 'Premium',
    basic: 'Basic',
    advanced: 'Advanced',
    help: 'Help',
    support: 'Support',
    contact: 'Contact',
    about: 'About',
    terms: 'Terms',
    privacy: 'Privacy',
    imprint: 'Imprint',

    // Navigation & Menu
    home: 'Home',
    services: 'Services',
    providers: 'Providers',
    customers: 'Customers',
    marketplace: 'Marketplace',
    bookings: 'Bookings',
    reviews: 'Reviews',
    messages: 'Messages',
    notifications: 'Notifications',

    // Navigation Extended
    'nav.dashboard': 'Dashboard',
    'nav.orders': 'Orders',
    'nav.profile': 'Profile',
    'nav.help': 'Help',
    'nav.startWithTaskilo': 'Start with Taskilo',
    'nav.services': 'Services',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.openMenu': 'Open menu',
    'nav.closeMenu': 'Close menu',

    // Hero Section
    'hero.title.line1': 'Find reliable',
    'hero.title.line2': 'local service providers',
    'hero.title.line3': 'with Taskilo',
    'hero.description':
      'From craftsmen to cleaning staff - connect with verified experts in your area',
    'hero.button.searchHelp': 'Search for help',
    'hero.button.offerHelp': 'Offer help',
    'hero.newProviders': 'New providers',
    'hero.noProviders': 'No providers found',

    // Call to Action
    'cta.title': 'Ready for Taskilo?',
    'cta.description': 'Start now and discover the easiest way to find and offer local services',
    'cta.button.registerCustomer': 'Register as customer',
    'cta.button.registerProvider': 'Register as provider',
    'cta.benefits': 'Free registration • Verified providers • Secure payments',

    // Banner
    'banner.text': 'New features coming soon!',
    'banner.learnMore': 'Learn more',
    'banner.close': 'Close banner',

    // Service Categories
    'category.cleaning': 'Cleaning',
    'category.handyman': 'Handyman',
    'category.gardening': 'Gardening',
    'category.tutoring': 'Tutoring',
    'category.beauty': 'Beauty & Wellness',
    'category.moving': 'Moving',
    'category.petcare': 'Pet Care',
    'category.delivery': 'Delivery',
    'category.repairs': 'Repairs',
    'category.photography': 'Photography',

    // Booking Process
    'booking.selectService': 'Select Service',
    'booking.selectProvider': 'Select Provider',
    'booking.selectDateTime': 'Select Date & Time',
    'booking.confirmation': 'Booking Confirmation',
    'booking.details': 'Booking Details',
    'booking.location': 'Location',
    'booking.duration': 'Duration',
    'booking.notes': 'Notes',
    'booking.specialRequests': 'Special Requests',

    // Provider Profile
    'provider.rating': 'Rating',
    'provider.experience': 'Experience',
    'provider.responseTime': 'Response Time',
    'provider.completedJobs': 'Completed Jobs',
    'provider.languages': 'Languages',
    'provider.availability': 'Availability',
    'provider.portfolio': 'Portfolio',
    'provider.certifications': 'Certifications',

    // Reviews & Ratings
    'review.writeReview': 'Write Review',
    'review.overall': 'Overall Rating',
    'review.quality': 'Quality',
    'review.punctuality': 'Punctuality',
    'review.communication': 'Communication',
    'review.value': 'Value for Money',
    'review.wouldRecommend': 'Would Recommend',

    // Forms & Validation
    'form.firstName': 'First Name',
    'form.lastName': 'Last Name',
    'form.phoneNumber': 'Phone Number',
    'form.postalCode': 'Postal Code',
    'form.city': 'City',
    'form.street': 'Street',
    'form.houseNumber': 'House Number',
    'form.emailInvalid': 'Invalid email address',
    'form.fieldRequired': 'This field is required',
    'form.passwordTooShort': 'Password too short (minimum 8 characters)',
    'form.passwordsDoNotMatch': 'Passwords do not match',

    // Account & Authentication
    'auth.signUp': 'Sign Up',
    'auth.signIn': 'Sign In',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.resetPassword': 'Reset Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.createAccount': 'Create Account',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.noAccount': 'No account yet?',
    'auth.terms': 'Terms of Service',
    'auth.privacy': 'Privacy Policy',
    'auth.agreeToTerms': 'I agree to the Terms of Service',

    // Messages & Chat
    'message.typeMessage': 'Type a message...',
    'message.send': 'Send',
    'message.online': 'Online',
    'message.lastSeen': 'Last seen',
    'message.typing': 'typing...',
    'message.delivered': 'Delivered',
    'message.read': 'Read',

    // Payment & Billing (existing)
    'payment.method': 'Payment Method',
    'payment.card': 'Credit Card',
    'payment.paypal': 'PayPal',
    'payment.bankTransfer': 'Bank Transfer',
    'payment.cash': 'Cash Payment',
    'payment.successful': 'Payment successful',
    'payment.failed': 'Payment failed',
    'payment.refund': 'Refund',

    // Time & Date
    'time.today': 'Today',
    'time.tomorrow': 'Tomorrow',
    'time.yesterday': 'Yesterday',
    'time.thisWeek': 'This Week',
    'time.nextWeek': 'Next Week',
    'time.morning': 'Morning',
    'time.afternoon': 'Afternoon',
    'time.evening': 'Evening',
    'time.flexible': 'Flexible',

    // Status Messages
    'status.pending': 'Pending',
    'status.confirmed': 'Confirmed',
    'status.inProgress': 'In Progress',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    'status.refunded': 'Refunded',

    // Error Messages
    'error.general': 'An error occurred',
    'error.network': 'Network error',
    'error.serverError': 'Server error',
    'error.notFound': 'Not found',
    'error.unauthorized': 'Unauthorized',
    'error.sessionExpired': 'Session expired',

    // Success Messages
    'success.profileUpdated': 'Profile updated',
    'success.bookingCreated': 'Booking created',
    'success.messageSent': 'Message sent',
    'success.reviewSubmitted': 'Review submitted',
    'success.passwordChanged': 'Password changed',

    // Booking Process Extended
    'booking.selectCategory': 'Select Category',
    'booking.selectSubcategory': 'Select Subcategory',
    'booking.orderSummary': 'Order Summary',
    'booking.confirmBooking': 'Confirm Booking',
    'booking.payNow': 'Pay Now',

    // Modal Components
    'modal.close': 'Close Modal',
    'modal.open': 'Open',
    'modal.confirm': 'Confirm',
    'modal.cancel': 'Cancel',
    'modal.title': 'Title',

    // Navigation Extended
    'navigation.home': 'Home',
    'navigation.services': 'Services',
    'navigation.dashboard': 'Dashboard',
    'navigation.profile': 'Profile',
    'navigation.orders': 'Orders',
    'navigation.inbox': 'Inbox',
    'navigation.settings': 'Settings',
    'navigation.logout': 'Logout',
    'navigation.menu': 'Menu',
    'navigation.back': 'Back',

    // Status Messages
    'status.loading': 'Loading...',
    'status.saving': 'Saving...',
    'status.success': 'Success',
    'status.error': 'Error occurred',
    'status.notFound': 'Not found',
    'status.unauthorized': 'Unauthorized',
    'status.processing': 'Processing...',

    // Admin Area
    'admin.overview': 'Overview',
    'admin.companies': 'Companies',
    'admin.orders': 'Orders',
    'admin.users': 'Users',
    'admin.invites': 'Invites',
    'admin.settings': 'Settings',
    'admin.analytics': 'Analytics',
    'admin.reports': 'Reports',
    'admin.permissions': 'Permissions',

    // Dashboard
    'dashboard.welcome': 'Welcome to Dashboard',
    'dashboard.overview': 'Overview',
    'dashboard.recentOrders': 'Recent Orders',
    'dashboard.earnings': 'Earnings',
    'dashboard.statistics': 'Statistics',

    // Login & Registration
    'login.title': 'Sign In',
    'login.subtitle': 'Welcome back',
    'login.email': 'Email address',
    'login.password': 'Password',
    'login.remember': 'Remember me',
    'login.forgot': 'Forgot password?',
    'login.submit': 'Sign In',
    'login.register': 'No account? Register',

    // Testimonials
    'testimonials.title.part1': 'What our customers say about',
    'testimonials.title.part2': 'Taskilo',
    'testimonials.subtitle': 'Over 10,000 happy customers already trust Taskilo',

    // Testimonial Roles
    'testimonials.role.homeowner': 'Homeowner',
    'testimonials.role.manager': 'Manager',
    'testimonials.role.mother': 'Mother of 2 children',
    'testimonials.role.apartmentOwner': 'Apartment Owner',
    'testimonials.role.entrepreneur': 'IT Entrepreneur',
    'testimonials.role.gardenLover': 'Garden Enthusiast',
    'testimonials.role.carEnthusiast': 'Car Enthusiast',

    // Testimonial Content
    'testimonials.content.maria':
      'Taskilo helped me find a fantastic electrician. Fast, professional and at a fair price!',
    'testimonials.content.thomas':
      'We found a reliable cleaning service for our office through Taskilo. Absolute recommendation!',
    'testimonials.content.julia':
      'The childcare through Taskilo was a blessing. Verified caregivers and easy booking.',
    'testimonials.content.andreas':
      'My kitchen was perfectly renovated. Taskilo makes it easy to find trustworthy craftsmen.',
    'testimonials.content.sarah':
      'From booking to payment - everything went smoothly. Taskilo is my first choice!',
    'testimonials.content.michael':
      'For IT support we quickly found a competent technician. Very satisfied!',
    'testimonials.content.lisa':
      'My garden was beautifully designed. The gardeners on Taskilo are real professionals.',
    'testimonials.content.david':
      'Car washing and care through Taskilo - quickly booked and perfectly executed.',

    // Testimonial Statistics
    'testimonials.stats.avgRating': 'Avg Rating',
    'testimonials.stats.happyCustomers': 'Happy Customers',
    'testimonials.stats.reviews': 'Reviews',

    // Auth zusätzlich
    'auth.or': 'Or continue with',

    // Messages & Chat
    'messages.chatWith': 'Chat with',
    'messages.loading': 'Chat messages will load here...',

    // Inbox
    'inbox.newRequests': 'New Requests',
    'inbox.sentOffers': 'Sent Offers',
    'inbox.archive': 'Archive',

    // Sidebar Specific
    'sidebar.unknown': 'Unknown',
    'sidebar.noEmail': 'No email available',
    'sidebar.lifecycle': 'Lifecycle',
    'sidebar.projects': 'Projects',
    'sidebar.team': 'Team',
    'sidebar.capture': 'Capture',
    'sidebar.proposal': 'Proposal',
    'sidebar.prompts': 'Prompts',
    'sidebar.activeProposals': 'Active Proposals',
    'sidebar.archived': 'Archived',
    'sidebar.getHelp': 'Get Help',
    'sidebar.dataLibrary': 'Data Library',
    'sidebar.wordAssistant': 'Word Assistant',

    // Error Messages Extended
    'error.userNotAuthenticated': 'User is not authenticated',
    'error.userNotFound': 'No user found',
    'error.dataFetch': 'Error fetching data',

    // Navigation Extended
    'navigation.documents': 'Documents',

    // Common
    'common.more': 'More',
    'common.open': 'Open',

    // Documents
    'documents.open': 'Open',
    'documents.share': 'Share',

    // Chat Component
    'chat.title': 'Chat for Order',
    'chat.status.unknown': 'Unknown',
    'chat.status.customer': 'Customer',
    'chat.status.provider': 'Provider',
    'chat.loading.chat': 'Loading chat...',
    'chat.loading.userdata': 'Loading user data...',
    'chat.error.profile': 'Please log in or your profile could not be loaded to use the chat.',
    'chat.error.profileLoad': 'Error loading your profile for the chat.',
    'chat.error.messageLoad': 'Error loading messages. Please try again later.',
    'chat.error.messageSend': 'Message could not be sent. Please try again.',
    'chat.error.emailBlocked':
      'Sharing email addresses is not permitted in chat. Please keep communication on the platform.',
    'chat.error.phoneBlocked':
      'Sharing phone numbers is not permitted in chat. Please keep communication on the platform.',
    'chat.messages.noMessages': 'No messages in this chat yet. Be the first!',
    'chat.messages.placeholder': 'Enter message...',
    'chat.timestamps.yesterday': 'Yesterday',

    // Payment & Checkout
    'payment.title': 'Payment Details',
    'payment.processing': 'Processing...',
    'payment.payNow': 'Pay {amount} EUR now',
    'payment.success': 'Payment successful!',
    'payment.stripeNotReady': 'Stripe is not ready yet. Please try again later.',
    'payment.loadingPaymentData': 'Payment data is still loading. Please wait a moment.',
    'payment.validationError': 'Error validating payment data.',
    'payment.cardError': 'Card error or validation error.',
    'payment.unexpectedError': 'An unexpected error occurred.',
    'payment.generalError': 'A general error occurred in the payment process.',
    'payment.statusPending': 'Payment status: {status}. You may be redirected.',
    'payment.stripeApiError': 'Stripe API not available.',
    'payment.clientSecretMissing': 'Client Secret missing.',
    'payment.elementsValidationFailed': 'Elements validation failed.',
    'payment.confirmationFailed': 'Payment confirmation failed.',
    'payment.notSuccessfulOrUnknown': 'Payment not successful or status unknown.',

    // Checkout Page
    'checkout.paymentDetails': 'Payment Details',
    'checkout.processing': 'Processing...',
    'checkout.payNow': 'Pay {amount} {currency} now',
    'checkout.success': 'Payment successful! ID: {id}',
    'checkout.statusPending': 'Payment status: {status}. You may be redirected.',
    'checkout.unknownResult':
      'Unknown payment status or result from Stripe (no error, no PaymentIntent).',
    'checkout.generalError': 'A general error occurred in the payment process.',
    'checkout.confirmationError': 'An error occurred during payment confirmation.',

    // Booking Flow (Get Started)
    'booking.steps.customerType': 'Choose customer type',
    'booking.steps.category': 'Choose category',
    'booking.steps.subcategory': 'Choose subcategory',
    'booking.steps.description': 'Describe task',
    'booking.title': 'What kind of task is this?',
    'booking.subtitle': 'Find the service you need to contact verified professionals in your area.',
    'booking.stepProgress': 'Step {current}/{total}',
    'booking.showSteps': 'Show steps',
    'booking.customerType.private': 'Private Customer',
    'booking.customerType.business': 'Business Customer',
    'booking.customerType.privateDesc': 'For household, garden or personal projects',
    'booking.customerType.businessDesc': 'For your company, office or business',
    'booking.category.title': 'Which category fits your task?',
    'booking.category.search': 'Search category...',
    'booking.subcategory.title': 'Which subcategory fits best?',
    'booking.subcategory.search': 'Search subcategory...',
    'booking.description.title': 'Describe your task',
    'booking.description.placeholder': 'Describe your task here...',
    'booking.description.help':
      'The more detailed your description, the better suitable providers can contact you.',
    'booking.next': 'Continue to find providers',
    'booking.error.fillAllFields': 'Please fill out all fields.',
    'booking.modal.title': 'Booking Steps',
    'booking.modal.close': 'Close',

    // Auth Components
    'auth.checking': 'Checking authentication...',
    'auth.loading': 'Loading...',

    // Add Payment Method Form
    'payment.addMethod.title': 'Add Payment Method',
    'payment.addMethod.processing': 'Processing...',
    'payment.addMethod.success': 'Payment method successfully added!',
    'payment.addMethod.systemNotReady': 'Payment system is not ready yet.',
    'payment.addMethod.setupFailed': 'Payment method setup failed.',
    'payment.addMethod.unexpectedError': 'An unexpected error occurred.',
    'payment.addMethod.addButton': 'Add Payment Method',

    // User Info Card
    'user.role.customer': 'Customer',
    'user.role.provider': 'Provider',
    'user.viewProfile': 'View Profile',
    'user.avatarAlt': '{name} Avatar',

    // Reviews & Ratings
    'reviews.title': 'Reviews',
    'reviews.average': 'Average Rating',
    'reviews.total': '{count} Reviews',
    'reviews.noReviews': 'No reviews available yet',
    'reviews.loading': 'Loading reviews...',
    'reviews.loadMore': 'Load more reviews',
    'reviews.anonymous': 'Anonymous User',
    'reviews.verified': 'Verified Review',
    'reviews.returning': 'Returning Customer',
    'reviews.translate': 'Translate',
    'reviews.translating': 'Translating...',
    'reviews.showMore': 'Show more',
    'reviews.showLess': 'Show less',
    'reviews.helpful': 'Helpful',
    'reviews.providerResponse': 'Provider Response',
    'reviews.projectTitle': 'Project',
    'reviews.projectPrice': 'Price',
    'reviews.projectDuration': 'Duration',

    // Chart and Data Visualization
    'chart.revenue.title': 'Revenue Overview',
    'chart.revenue.description': 'Shows total revenue over the selected time period',
    'chart.revenue.loading': 'Loading revenue data...',
    'chart.revenue.error': 'Revenue data could not be loaded.',
    'chart.revenue.noData': 'No revenue data available for the selected period.',
    'chart.revenue.totalRevenue': 'Total Revenue',
    'chart.timeRange.7d': '7 Days',
    'chart.timeRange.30d': '30 Days',
    'chart.timeRange.90d': '90 Days',
    'chart.timeRange.label': 'Select time range',
    'chart.tooltip.revenue': 'Revenue',
    'chart.tooltip.date': 'Date',
    'chart.axis.revenue': 'Revenue (€)',
    'chart.axis.date': 'Date',

    // Data Table
    'table.columns.adjust': 'Adjust columns',
    'table.columns.short': 'Columns',
    'table.section.add': 'Add section',
    'table.loading': 'Loading data...',
    'table.noData': 'No data available',
    'table.pagination.previous': 'Previous',
    'table.pagination.next': 'Next',
    'table.pagination.first': 'First',
    'table.pagination.last': 'Last',
    'table.pagination.rows': 'Rows per page',
    'table.pagination.showing': 'Page {from} of {to}',
    'table.search.placeholder': 'Search...',
    'table.filter.all': 'All',
    'table.select.all': 'Select all',
    'table.select.none': 'Deselect all',
    'table.drag.reorder': 'Drag to reorder',
    'table.navigation.firstPage': 'Go to first page',
    'table.navigation.previousPage': 'Go to previous page',
    'table.navigation.nextPage': 'Go to next page',
    'table.navigation.lastPage': 'Go to last page',

    // Get Started Page (Booking Flow)
    'booking.steps.title': 'What kind of task is this?',
    'booking.steps.subtitle':
      'Find the service you need to contact verified professionals in your area.',
    'booking.steps.current': 'Step {current}/{total}',
    'booking.steps.showSteps': 'Show steps',
    'booking.customer.private.title': 'I am a private customer',
    'booking.customer.private.description': 'Find and book service providers for my home.',
    'booking.customer.business.title': 'I am a business',
    'booking.customer.business.description': 'Book help for my company (B2B).',
    'booking.category.main.label': 'Choose a main category',
    'booking.category.main.placeholder': 'e.g. Handyman, IT & Technology …',
    'booking.category.sub.label': 'Choose a subcategory',
    'booking.category.sub.placeholder': 'e.g. Electrician, Moving helper …',

    // Footer
    'footer.product': 'Product',
    'footer.features': 'Features',
    'footer.comingSoon': 'Coming Soon',
    'footer.categories': 'Categories',
    'footer.pricing': 'Pricing',
    'footer.help': 'Help',
    'footer.solutions': 'Solutions',
    'footer.forCompanies': 'For Companies',
    'footer.forFreelancers': 'For Freelancers',
    'footer.forCustomers': 'For Customers',
    'footer.startProject': 'Start Project',
    'footer.becomeProvider': 'Become Provider',
    'footer.company': 'Company',
    'footer.about': 'About',
    'footer.careers': 'Careers',
    'footer.blog': 'Blog',
    'footer.press': 'Press',
    'footer.contact': 'Contact',
    'footer.legal': 'Legal',
    'footer.imprint': 'Imprint',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.cookies': 'Cookie Settings',
    'footer.emailPlaceholder': 'Your email address',
    'footer.subscribe': 'Subscribe',
    'footer.newsletterText': 'Stay informed about new features and updates',
    'footer.copyright': '© {year} Taskilo. All rights reserved.',

    // CategoryGrid
    'categoryGrid.furniture.label': 'Furniture Assembly',
    'categoryGrid.furniture.title': 'Furniture Assembly',
    'categoryGrid.furniture.text': 'Help with building furniture and IKEA products.',
    'categoryGrid.furniture.tag1': 'Furniture Assembly',
    'categoryGrid.furniture.tag2': 'IKEA Assembly',
    'categoryGrid.chef.label': 'Private Chefs',
    'categoryGrid.chef.title': 'Private Chefs',
    'categoryGrid.chef.text': 'Flexible chefs for events, home or gastronomy.',
    'categoryGrid.chef.tag1': 'Book Private Chef',
    'categoryGrid.chef.tag2': 'Event Kitchen',
    'categoryGrid.electrical.label': 'Electrical Work',
    'categoryGrid.electrical.title': 'Electrical Work',
    'categoryGrid.electrical.text': 'Professional support for electrical work.',
    'categoryGrid.electrical.tag1': 'Light Installation',
    'categoryGrid.electrical.tag2': 'Outlet Replacement',
    'categoryGrid.repair.label': 'Home Repairs',
    'categoryGrid.repair.title': 'Repairs',
    'categoryGrid.repair.text': 'Help with small repairs and maintenance.',
    'categoryGrid.repair.tag1': 'Minor Repairs',
    'categoryGrid.repair.tag2': 'Door Adjustment',
    'categoryGrid.moving.label': 'Moving',
    'categoryGrid.moving.title': 'Moving',
    'categoryGrid.moving.text': 'Packing, unpacking, carrying and furniture transport.',
    'categoryGrid.moving.tag1': 'Moving Help',
    'categoryGrid.moving.tag2': 'Heavy Lifting',
    'categoryGrid.popular.label': 'Popular',
    'categoryGrid.popular.title': 'Popular Tasks',
    'categoryGrid.popular.text': 'The most popular services of the week.',
    'categoryGrid.popular.tag1': 'Top Providers',
    'categoryGrid.popular.tag2': 'Trending',
    'categoryGrid.trends':
      'Current trends: Curved sofas, computer desks and sustainable materials.',
    'categoryGrid.loading': 'Loading...',
    'categoryGrid.imageNotAvailable': 'Image not available',

    // Features Section
    'features.verified.title': 'Verified Service Providers',
    'features.verified.description':
      'All companies and craftsmen undergo a strict verification process for maximum security and quality.',
    'features.booking.title': 'Lightning-fast Booking',
    'features.booking.description':
      'Book professional services in just a few clicks - from request to confirmation in minutes.',
    'features.payment.title': 'Secure Payment',
    'features.payment.description':
      'Integrated payment processing with buyer protection. Pay only after successful service delivery.',
    'features.contact.title': 'Direct Contact',
    'features.contact.description':
      'Communicate directly with your service providers via our integrated chat and stay informed.',
    'features.nationwide.title': 'Available Nationwide',
    'features.nationwide.description':
      'Find qualified service providers throughout Germany - from Hamburg to Munich.',
    'features.reviews.title': 'Transparent Reviews',
    'features.reviews.description':
      'Real customer reviews and detailed profiles help you choose the best service provider.',
    'features.sectionTitle': 'Why Taskilo is the best choice',
    'features.sectionDescription':
      'Discover how Taskilo revolutionizes the connection between customers and professional service providers',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState('de');

  // Verfügbare Sprachen für die Anwendung
  const availableLanguages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  useEffect(() => {
    // Lade die Sprache aus localStorage
    const savedLanguage = localStorage.getItem('taskilo-language');
    if (savedLanguage && translations[savedLanguage as keyof typeof translations]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: string) => {
    // Nur unterstützte Sprachen erlauben
    if (availableLanguages.find(l => l.code === lang)) {
      setLanguage(lang);
      localStorage.setItem('taskilo-language', lang);
    }
  };

  const t = (key: string, values?: Record<string, any>) => {
    // Verwende die aktuelle Sprache oder fallback zu Deutsch
    const langTranslations = translations[language as keyof typeof translations] || translations.de;
    let text = langTranslations[key as keyof typeof langTranslations] || key;

    // Interpolation von Werten
    if (values) {
      Object.entries(values).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value.toString());
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t,
        availableLanguages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
