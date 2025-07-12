"use client";

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
    'footer.product': 'Produkt',
    'footer.features': 'Features',
    'footer.comingSoon': 'Coming Soon',
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
    'footer.cookies': 'Cookies',
    'footer.newsletter': 'Newsletter',
    'footer.emailPlaceholder': 'Ihre E-Mail-Adresse',
    'footer.subscribe': 'Abonnieren',
    'footer.newsletterText': 'Verpassen Sie keine Updates!',
    'footer.copyright': '© {year} Taskilo, Alle Rechte vorbehalten',
    'banner.text': '🚀 Neue Features kommen bald! KI-Assistent, Mobile App und mehr...',
    'banner.learnMore': 'Mehr erfahren',
    'banner.close': 'Banner schließen',
    'comingSoon.title': 'Coming Soon',
    'comingSoon.subtitle': 'Taskilo wird noch besser! Entdecken Sie die spannenden neuen Features, die wir für Sie entwickeln.',
    'comingSoon.launchCountdown': 'KI-Assistent Launch in:',
    'comingSoon.days': 'Tage',
    'comingSoon.hours': 'Stunden',
    'comingSoon.minutes': 'Minuten',
    'comingSoon.seconds': 'Sekunden',
    'comingSoon.emailPlaceholder': 'Ihre E-Mail-Adresse',
    'comingSoon.notify': 'Benachrichtigen',
    'comingSoon.thankYou': 'Vielen Dank! Wir benachrichtigen Sie bei neuen Updates.',
    'comingSoon.whatToExpect': 'Was erwartet Sie?',
    'comingSoon.whatToExpectSubtitle': 'Innovative Features, die Ihre Erfahrung mit Taskilo revolutionieren werden.',
    'comingSoon.readyForFuture': 'Bereit für die Zukunft?',
    'comingSoon.readyForFutureText': 'Nutzen Sie bereits heute die verfügbaren Features von Taskilo und freuen Sie sich auf die kommenden Innovationen.',
    'comingSoon.startProject': 'Projekt starten',
    'comingSoon.registerAsProvider': 'Als Anbieter registrieren',
    'comingSoon.toDashboard': 'Zum Dashboard',
    'features.aiAssistant.title': 'KI-gestützter Projektassistent',
    'features.aiAssistant.description': 'Intelligente Projektvorschläge und automatische Anbieter-Matching',
    'features.mobileApp.title': 'Mobile App',
    'features.mobileApp.description': 'Native iOS und Android App für unterwegs',
    'features.reviewSystem.title': 'Erweiterte Bewertungssysteme',
    'features.reviewSystem.description': 'Detaillierte Anbieter-Bewertungen und Qualitätssicherung',
    'features.teamCollaboration.title': 'Team-Kollaboration',
    'features.teamCollaboration.description': 'Mehrere Benutzer pro Unternehmen und Projekt-Teams',
    'features.automaticBilling.title': 'Automatisierte Rechnungsstellung',
    'features.automaticBilling.description': 'Integrierte Buchhaltung und Steuer-Management',
    'features.videoConsultation.title': 'Video-Beratung',
    'features.videoConsultation.description': 'Direkte Video-Calls mit Anbietern für komplexe Projekte',
    'features.status.inDevelopment': 'In Entwicklung',
    'features.status.betaTest': 'Beta-Test',
    'features.status.planning': 'Planung',
    'features.status.concept': 'Konzept',
    'features.status.prototype': 'Prototyp',
    'milestones.aiLaunch.title': 'KI-Assistent Launch',
    'milestones.aiLaunch.description': 'Vollständig ausgerollter KI-gestützter Projektassistent',
    'milestones.mobileBeta.title': 'Mobile App Beta',
    'milestones.mobileBeta.description': 'Beta-Version der mobilen App für iOS und Android',
    'milestones.premiumFeatures.title': 'Premium Features',
    'milestones.premiumFeatures.description': 'Erweiterte Funktionen für Geschäftskunden',
    'milestones.apiLaunch.title': 'API Launch',
    'milestones.apiLaunch.description': 'Öffentliche API für Drittanbieter-Integrationen',
  },
  en: {
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
    'footer.cookies': 'Cookies',
    'footer.newsletter': 'Newsletter',
    'footer.emailPlaceholder': 'Your email address',
    'footer.subscribe': 'Subscribe',
    'footer.newsletterText': 'Don\'t miss any updates!',
    'footer.copyright': '© {year} Taskilo, All rights reserved',
    'banner.text': '🚀 New features coming soon! AI Assistant, Mobile App and more...',
    'banner.learnMore': 'Learn More',
    'banner.close': 'Close Banner',
    'comingSoon.title': 'Coming Soon',
    'comingSoon.subtitle': 'Taskilo is getting even better! Discover the exciting new features we\'re developing for you.',
    'comingSoon.launchCountdown': 'AI Assistant Launch in:',
    'comingSoon.days': 'Days',
    'comingSoon.hours': 'Hours',
    'comingSoon.minutes': 'Minutes',
    'comingSoon.seconds': 'Seconds',
    'comingSoon.emailPlaceholder': 'Your email address',
    'comingSoon.notify': 'Notify',
    'comingSoon.thankYou': 'Thank you! We\'ll notify you about new updates.',
    'comingSoon.whatToExpect': 'What to Expect?',
    'comingSoon.whatToExpectSubtitle': 'Innovative features that will revolutionize your experience with Taskilo.',
    'comingSoon.readyForFuture': 'Ready for the Future?',
    'comingSoon.readyForFutureText': 'Use the available features of Taskilo today and look forward to the upcoming innovations.',
    'comingSoon.startProject': 'Start Project',
    'comingSoon.registerAsProvider': 'Register as Provider',
    'comingSoon.toDashboard': 'To Dashboard',
    'features.aiAssistant.title': 'AI-powered Project Assistant',
    'features.aiAssistant.description': 'Intelligent project suggestions and automatic provider matching',
    'features.mobileApp.title': 'Mobile App',
    'features.mobileApp.description': 'Native iOS and Android app for on-the-go',
    'features.reviewSystem.title': 'Advanced Review Systems',
    'features.reviewSystem.description': 'Detailed provider reviews and quality assurance',
    'features.teamCollaboration.title': 'Team Collaboration',
    'features.teamCollaboration.description': 'Multiple users per company and project teams',
    'features.automaticBilling.title': 'Automated Billing',
    'features.automaticBilling.description': 'Integrated accounting and tax management',
    'features.videoConsultation.title': 'Video Consultation',
    'features.videoConsultation.description': 'Direct video calls with providers for complex projects',
    'features.status.inDevelopment': 'In Development',
    'features.status.betaTest': 'Beta Test',
    'features.status.planning': 'Planning',
    'features.status.concept': 'Concept',
    'features.status.prototype': 'Prototype',
    'milestones.aiLaunch.title': 'AI Assistant Launch',
    'milestones.aiLaunch.description': 'Fully deployed AI-powered project assistant',
    'milestones.mobileBeta.title': 'Mobile App Beta',
    'milestones.mobileBeta.description': 'Beta version of the mobile app for iOS and Android',
    'milestones.premiumFeatures.title': 'Premium Features',
    'milestones.premiumFeatures.description': 'Advanced features for business customers',
    'milestones.apiLaunch.title': 'API Launch',
    'milestones.apiLaunch.description': 'Public API for third-party integrations',
  },
  fr: {
    'footer.product': 'Produit',
    'footer.features': 'Fonctionnalités',
    'footer.comingSoon': 'Bientôt',
    'footer.categories': 'Catégories',
    'footer.pricing': 'Tarifs',
    'footer.help': 'Aide',
    'footer.solutions': 'Solutions',
    'footer.forCompanies': 'Pour les entreprises',
    'footer.forFreelancers': 'Pour les freelances',
    'footer.forCustomers': 'Pour les clients',
    'footer.startProject': 'Démarrer un projet',
    'footer.becomeProvider': 'Devenir prestataire',
    'footer.company': 'Entreprise',
    'footer.about': 'À propos',
    'footer.careers': 'Carrières',
    'footer.blog': 'Blog',
    'footer.press': 'Presse',
    'footer.contact': 'Contact',
    'footer.legal': 'Légal',
    'footer.imprint': 'Mentions légales',
    'footer.privacy': 'Confidentialité',
    'footer.terms': 'Conditions',
    'footer.cookies': 'Cookies',
    'footer.newsletter': 'Newsletter',
    'footer.emailPlaceholder': 'Votre adresse e-mail',
    'footer.subscribe': 'S\'abonner',
    'footer.newsletterText': 'Ne manquez aucune mise à jour !',
    'footer.copyright': '© {year} Taskilo, Tous droits réservés',
    'banner.text': '🚀 Nouvelles fonctionnalités bientôt ! Assistant IA, App mobile et plus...',
    'banner.learnMore': 'En savoir plus',
    'banner.close': 'Fermer la bannière',
    'comingSoon.title': 'Bientôt',
    'comingSoon.subtitle': 'Taskilo s\'améliore encore ! Découvrez les nouvelles fonctionnalités passionnantes que nous développons pour vous.',
    'comingSoon.launchCountdown': 'Lancement de l\'Assistant IA dans :',
    'comingSoon.days': 'Jours',
    'comingSoon.hours': 'Heures',
    'comingSoon.minutes': 'Minutes',
    'comingSoon.seconds': 'Secondes',
    'comingSoon.emailPlaceholder': 'Votre adresse e-mail',
    'comingSoon.notify': 'Notifier',
    'comingSoon.thankYou': 'Merci ! Nous vous notifierons des nouvelles mises à jour.',
    'comingSoon.whatToExpect': 'À quoi s\'attendre ?',
    'comingSoon.whatToExpectSubtitle': 'Des fonctionnalités innovantes qui révolutionneront votre expérience avec Taskilo.',
    'comingSoon.readyForFuture': 'Prêt pour l\'avenir ?',
    'comingSoon.readyForFutureText': 'Utilisez dès aujourd\'hui les fonctionnalités disponibles de Taskilo et réjouissez-vous des innovations à venir.',
    'comingSoon.startProject': 'Démarrer un projet',
    'comingSoon.registerAsProvider': 'S\'inscrire comme prestataire',
    'comingSoon.toDashboard': 'Vers le tableau de bord',
    'features.aiAssistant.title': 'Assistant de projet IA',
    'features.aiAssistant.description': 'Suggestions de projets intelligentes et correspondance automatique des prestataires',
    'features.mobileApp.title': 'Application mobile',
    'features.mobileApp.description': 'Application native iOS et Android pour mobile',
    'features.reviewSystem.title': 'Systèmes d\'évaluation avancés',
    'features.reviewSystem.description': 'Évaluations détaillées des prestataires et assurance qualité',
    'features.teamCollaboration.title': 'Collaboration d\'équipe',
    'features.teamCollaboration.description': 'Plusieurs utilisateurs par entreprise et équipes de projet',
    'features.automaticBilling.title': 'Facturation automatisée',
    'features.automaticBilling.description': 'Comptabilité intégrée et gestion fiscale',
    'features.videoConsultation.title': 'Consultation vidéo',
    'features.videoConsultation.description': 'Appels vidéo directs avec les prestataires pour les projets complexes',
    'features.status.inDevelopment': 'En développement',
    'features.status.betaTest': 'Test bêta',
    'features.status.planning': 'Planification',
    'features.status.concept': 'Concept',
    'features.status.prototype': 'Prototype',
    'milestones.aiLaunch.title': 'Lancement de l\'assistant IA',
    'milestones.aiLaunch.description': 'Assistant de projet IA entièrement déployé',
    'milestones.mobileBeta.title': 'Bêta de l\'application mobile',
    'milestones.mobileBeta.description': 'Version bêta de l\'application mobile pour iOS et Android',
    'milestones.premiumFeatures.title': 'Fonctionnalités premium',
    'milestones.premiumFeatures.description': 'Fonctionnalités avancées pour les clients professionnels',
    'milestones.apiLaunch.title': 'Lancement de l\'API',
    'milestones.apiLaunch.description': 'API publique pour les intégrations tierces',
  },
  es: {
    'footer.product': 'Producto',
    'footer.features': 'Funcionalidades',
    'footer.comingSoon': 'Próximamente',
    'footer.categories': 'Categorías',
    'footer.pricing': 'Precios',
    'footer.help': 'Ayuda',
    'footer.solutions': 'Soluciones',
    'footer.forCompanies': 'Para empresas',
    'footer.forFreelancers': 'Para freelancers',
    'footer.forCustomers': 'Para clientes',
    'footer.startProject': 'Iniciar proyecto',
    'footer.becomeProvider': 'Convertirse en proveedor',
    'footer.company': 'Empresa',
    'footer.about': 'Acerca de',
    'footer.careers': 'Carreras',
    'footer.blog': 'Blog',
    'footer.press': 'Prensa',
    'footer.contact': 'Contacto',
    'footer.legal': 'Legal',
    'footer.imprint': 'Aviso legal',
    'footer.privacy': 'Privacidad',
    'footer.terms': 'Términos',
    'footer.cookies': 'Cookies',
    'footer.newsletter': 'Newsletter',
    'footer.emailPlaceholder': 'Su dirección de correo electrónico',
    'footer.subscribe': 'Suscribirse',
    'footer.newsletterText': '¡No se pierda ninguna actualización!',
    'footer.copyright': '© {year} Taskilo, Todos los derechos reservados',
    'banner.text': '🚀 ¡Nuevas funcionalidades próximamente! Asistente IA, App móvil y más...',
    'banner.learnMore': 'Saber más',
    'banner.close': 'Cerrar banner',
    'comingSoon.title': 'Próximamente',
    'comingSoon.subtitle': '¡Taskilo está mejorando aún más! Descubra las emocionantes nuevas funcionalidades que estamos desarrollando para usted.',
    'comingSoon.launchCountdown': 'Lanzamiento del Asistente IA en:',
    'comingSoon.days': 'Días',
    'comingSoon.hours': 'Horas',
    'comingSoon.minutes': 'Minutos',
    'comingSoon.seconds': 'Segundos',
    'comingSoon.emailPlaceholder': 'Su dirección de correo electrónico',
    'comingSoon.notify': 'Notificar',
    'comingSoon.thankYou': '¡Gracias! Le notificaremos sobre nuevas actualizaciones.',
    'comingSoon.whatToExpect': '¿Qué esperar?',
    'comingSoon.whatToExpectSubtitle': 'Funcionalidades innovadoras que revolucionarán su experiencia con Taskilo.',
    'comingSoon.readyForFuture': '¿Listo para el futuro?',
    'comingSoon.readyForFutureText': 'Use las funcionalidades disponibles de Taskilo hoy y espere las próximas innovaciones.',
    'comingSoon.startProject': 'Iniciar proyecto',
    'comingSoon.registerAsProvider': 'Registrarse como proveedor',
    'comingSoon.toDashboard': 'Al panel',
    'features.aiAssistant.title': 'Asistente de proyecto IA',
    'features.aiAssistant.description': 'Sugerencias inteligentes de proyectos y coincidencia automática de proveedores',
    'features.mobileApp.title': 'App móvil',
    'features.mobileApp.description': 'App nativa iOS y Android para móvil',
    'features.reviewSystem.title': 'Sistemas de reseñas avanzados',
    'features.reviewSystem.description': 'Reseñas detalladas de proveedores y control de calidad',
    'features.teamCollaboration.title': 'Colaboración en equipo',
    'features.teamCollaboration.description': 'Múltiples usuarios por empresa y equipos de proyecto',
    'features.automaticBilling.title': 'Facturación automatizada',
    'features.automaticBilling.description': 'Contabilidad integrada y gestión fiscal',
    'features.videoConsultation.title': 'Consulta por video',
    'features.videoConsultation.description': 'Llamadas de video directas con proveedores para proyectos complejos',
    'features.status.inDevelopment': 'En desarrollo',
    'features.status.betaTest': 'Prueba beta',
    'features.status.planning': 'Planificación',
    'features.status.concept': 'Concepto',
    'features.status.prototype': 'Prototipo',
    'milestones.aiLaunch.title': 'Lanzamiento del asistente IA',
    'milestones.aiLaunch.description': 'Asistente de proyecto IA completamente desplegado',
    'milestones.mobileBeta.title': 'Beta de app móvil',
    'milestones.mobileBeta.description': 'Versión beta de la app móvil para iOS y Android',
    'milestones.premiumFeatures.title': 'Funcionalidades premium',
    'milestones.premiumFeatures.description': 'Funcionalidades avanzadas para clientes empresariales',
    'milestones.apiLaunch.title': 'Lanzamiento de API',
    'milestones.apiLaunch.description': 'API pública para integraciones de terceros',
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
    setIsTranslating(true);
    
    try {
      // Sammle alle sichtbaren Texte von der aktuellen Seite
      const textElements = document.querySelectorAll('[data-translatable]');
      const textsToTranslate: string[] = [];
      const sourceKeys: string[] = [];

      textElements.forEach((element) => {
        const text = element.textContent?.trim();
        if (text && text.length > 0) {
          textsToTranslate.push(text);
          sourceKeys.push(element.getAttribute('data-translation-key') || text);
        }
      });

      if (textsToTranslate.length === 0) {
        console.log('Keine Texte zum Übersetzen gefunden');
        return;
      }

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
        throw new Error('Übersetzung fehlgeschlagen');
      }

      const data = await response.json();
      
      // Aktualisiere die dynamischen Übersetzungen
      setDynamicTranslations(prev => ({
        ...prev,
        ...data.translations
      }));

      // Wende die Übersetzungen auf die Elemente an
      textElements.forEach((element, index) => {
        const key = sourceKeys[index];
        const translatedText = data.translations[key];
        if (translatedText && element.textContent) {
          element.textContent = translatedText;
        }
      });

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
    const langTranslations = translations[language as keyof typeof translations];
    let text = langTranslations[key as keyof typeof langTranslations] || key;

    if (values) {
      Object.entries(values).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value.toString());
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: handleSetLanguage, 
      t,
      isTranslating,
      availableLanguages,
      translatePageContent,
      dynamicTranslations
    }}>
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
