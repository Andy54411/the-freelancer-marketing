'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, values?: Record<string, any>) => string;
  isTranslating: boolean;
  availableLanguages: { code: string; name: string; flag: string }[];
  translatePageContent: (targetLang: string) => Promise<void>;
  dynamicTranslations: Record<string, string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  de: {
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
  },
  en: {
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
  },
  es: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    submit: 'Enviar',
    search: 'Buscar',
    filter: 'Filtro',
    sort: 'Ordenar',
    name: 'Nombre',
    email: 'Correo',
    phone: 'Teléfono',
    address: 'Dirección',
    description: 'Descripción',
    price: 'Precio',
    date: 'Fecha',
    time: 'Hora',
    status: 'Estado',
    category: 'Categoría',
    service: 'Servicio',
    provider: 'Proveedor',
    customer: 'Cliente',
    order: 'Pedido',
    orders: 'Pedidos',
    dashboard: 'Panel',
    profile: 'Perfil',
    settings: 'Configuración',
    logout: 'Cerrar sesión',
    login: 'Iniciar sesión',
    register: 'Registrarse',
    password: 'Contraseña',
    confirm: 'Confirmar',
    welcome: 'Bienvenido',
    hello: 'Hola',
    goodbye: 'Adiós',
    yes: 'Sí',
    no: 'No',
    maybe: 'Tal vez',
    required: 'Requerido',
    optional: 'Opcional',
    available: 'Disponible',
    unavailable: 'No disponible',
    online: 'En línea',
    offline: 'Fuera de línea',
    new: 'Nuevo',
    old: 'Viejo',
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    completed: 'Completado',
    cancelled: 'Cancelado',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
    payment: 'Pago',
    invoice: 'Factura',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Impuesto',
    discount: 'Descuento',
    shipping: 'Envío',
    free: 'Gratis',
    premium: 'Premium',
    basic: 'Básico',
    advanced: 'Avanzado',
    help: 'Ayuda',
    support: 'Soporte',
    contact: 'Contacto',
    about: 'Acerca de',
    terms: 'Términos',
    privacy: 'Privacidad',
    imprint: 'Aviso legal',
  },
  fr: {
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    submit: 'Soumettre',
    search: 'Rechercher',
    filter: 'Filtre',
    sort: 'Trier',
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    address: 'Adresse',
    description: 'Description',
    price: 'Prix',
    date: 'Date',
    time: 'Heure',
    status: 'Statut',
    category: 'Catégorie',
    service: 'Service',
    provider: 'Fournisseur',
    customer: 'Client',
    order: 'Commande',
    orders: 'Commandes',
    dashboard: 'Tableau de bord',
    profile: 'Profil',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    login: 'Connexion',
    register: "S'inscrire",
    password: 'Mot de passe',
    confirm: 'Confirmer',
    welcome: 'Bienvenue',
    hello: 'Bonjour',
    goodbye: 'Au revoir',
    yes: 'Oui',
    no: 'Non',
    maybe: 'Peut-être',
    required: 'Requis',
    optional: 'Optionnel',
    available: 'Disponible',
    unavailable: 'Indisponible',
    online: 'En ligne',
    offline: 'Hors ligne',
    new: 'Nouveau',
    old: 'Ancien',
    active: 'Actif',
    inactive: 'Inactif',
    pending: 'En attente',
    completed: 'Terminé',
    cancelled: 'Annulé',
    accepted: 'Accepté',
    rejected: 'Rejeté',
    payment: 'Paiement',
    invoice: 'Facture',
    total: 'Total',
    subtotal: 'Sous-total',
    tax: 'Taxe',
    discount: 'Remise',
    shipping: 'Expédition',
    free: 'Gratuit',
    premium: 'Premium',
    basic: 'Basique',
    advanced: 'Avancé',
    help: 'Aide',
    support: 'Support',
    contact: 'Contact',
    about: 'À propos',
    terms: 'Conditions',
    privacy: 'Confidentialité',
    imprint: 'Mentions légales',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState('de');
  const [isTranslating, setIsTranslating] = useState(false);
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, string>>({});
  const router = useRouter();

  // Verfügbare Sprachen für automatische Übersetzung
  const availableLanguages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ];

  useEffect(() => {
    // Lade die Sprache aus localStorage
    const savedLanguage = localStorage.getItem('taskilo-language');
    if (savedLanguage && translations[savedLanguage as keyof typeof translations]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const translatePageContent = async (targetLang: string) => {
    if (isTranslating) return; // Verhindere mehrfache gleichzeitige Übersetzungen

    setIsTranslating(true);

    try {
      // Sammle alle sichtbaren Texte von der aktuellen Seite
      const textElements = document.querySelectorAll('[data-translatable]');
      const textsToTranslate: string[] = [];
      const sourceKeys: string[] = [];

      textElements.forEach(element => {
        const text = element.textContent?.trim();
        if (text && text.length > 0) {
          textsToTranslate.push(text);
          sourceKeys.push(element.getAttribute('data-translation-key') || text);
        }
      });

      if (textsToTranslate.length === 0) {
        console.log('Keine Texte zum Übersetzen gefunden');
        setIsTranslating(false);
        return;
      }

      console.log(`Übersetze ${textsToTranslate.length} Texte nach ${targetLang}`);

      // Übersetze alle Texte in einem Batch
      const response = await fetch('/api/translate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: textsToTranslate,
          targetLang: targetLang,
          sourceKeys: sourceKeys,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Fehler:', errorData);
        throw new Error(`Übersetzung fehlgeschlagen: ${response.status}`);
      }

      const data = await response.json();

      // Aktualisiere die dynamischen Übersetzungen
      setDynamicTranslations(prev => ({
        ...prev,
        ...data.translations,
      }));

      // Wende die Übersetzungen auf die Elemente an
      textElements.forEach((element, index) => {
        const key = sourceKeys[index];
        const translatedText = data.translations[key];
        if (translatedText && element.textContent) {
          element.textContent = translatedText;
        }
      });

      console.log('Übersetzung erfolgreich abgeschlossen');
    } catch (error) {
      console.error('Fehler bei der Seitenübersetzung:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('taskilo-language', lang);

    // Falls es keine manuelle Übersetzung für diese Sprache gibt, verwende automatische Übersetzung
    if (!translations[lang as keyof typeof translations] && lang !== 'de') {
      translatePageContent(lang);
    }
  };

  const t = (key: string, values?: Record<string, any>) => {
    // Fallback zu 'de' wenn die aktuelle Sprache nicht verfügbar ist
    const langTranslations = translations[language as keyof typeof translations] || translations.de;
    let text = langTranslations[key as keyof typeof langTranslations] || key;

    // Prüfe auch in dynamischen Übersetzungen
    if (text === key && dynamicTranslations[key]) {
      text = dynamicTranslations[key];
    }

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
        isTranslating,
        availableLanguages,
        translatePageContent,
        dynamicTranslations,
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
