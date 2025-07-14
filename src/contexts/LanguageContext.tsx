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
    'hero.title.line1': 'Finde zuverlässige',
    'hero.title.line2': 'lokale Dienstleister',
    'hero.title.line3': 'mit Taskilo',
    'hero.description':
      'Von Handwerkern bis zu Reinigungskräften - verbinde dich mit verifizierten Experten in deiner Nähe',
    'hero.button.searchHelp': 'Hilfe suchen',
    'hero.button.offerHelp': 'Hilfe anbieten',
    'hero.newProviders': 'Neue Anbieter',
    'hero.noProviders': 'Keine Anbieter gefunden',

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

    // Payment & Billing
    'payment.method': 'Zahlungsmethode',
    'payment.card': 'Kreditkarte',
    'payment.paypal': 'PayPal',
    'payment.bankTransfer': 'Überweisung',
    'payment.cash': 'Barzahlung',
    'payment.processing': 'Zahlung wird verarbeitet...',
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

    // Payment & Billing
    'payment.method': 'Payment Method',
    'payment.card': 'Credit Card',
    'payment.paypal': 'PayPal',
    'payment.bankTransfer': 'Bank Transfer',
    'payment.cash': 'Cash Payment',
    'payment.processing': 'Processing payment...',
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
