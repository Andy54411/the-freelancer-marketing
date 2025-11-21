'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  GoogleBusinessProfileService,
  GoogleBusinessAccount,
  GoogleBusinessLocation,
} from '@/services/GoogleBusinessProfileService';
import { GoogleBusinessTestHelper } from '@/utils/GoogleBusinessTestHelper';
import { AffiliateLocationService } from '@/services/AffiliateLocationService';
import LocationSelectionModal from './LocationSelectionModal';
import AffiliateLocationModal from './AffiliateLocationModal';
import ConversionSetupModal from './ConversionSetupModal';
import MerchantCenterCreationModal from './MerchantCenterCreationModal';
import {
  Target,
  Users,
  Globe,
  Smartphone,
  Eye,
  MapPin,
  Settings,
  CheckCircle2,
  ShoppingBag,
  Search,
  Zap,
  TrendingUp,
  Youtube,
  ChevronDown,
  Monitor,
  Package,
  CreditCard,
  Repeat,
  CheckSquare,
  HelpCircle,
  Link as LinkIcon,
  Check,
  ShoppingCart,
  ScanBarcode,
  Pencil,
} from 'lucide-react';
import { useAlertHelpers } from '@/components/ui/AlertProvider';

const COUNTRY_OPTIONS = [
  'Afghanistan',
  'Ägypten',
  'Ålandinseln',
  'Albanien',
  'Algerien',
  'Amerikanische Jungferninseln',
  'Amerikanisch-Samoa',
  'Andorra',
  'Angola',
  'Anguilla',
  'Antigua und Barbuda',
  'Äquatorialguinea',
  'Argentinien',
  'Armenien',
  'Aruba',
  'Aserbaidschan',
  'Äthiopien',
  'Australien',
  'Bahamas',
  'Bahrain',
  'Bangladesch',
  'Barbados',
  'Belarus',
  'Belgien',
  'Belize',
  'Benin',
  'Bermudas',
  'Bhutan',
  'Birma (Myanmar)',
  'Bolivien',
  'Bonaire, St. Eustatius und Saba',
  'Bosnien und Herzegowina',
  'Botsuana',
  'Brasilien',
  'Britisches Territorium im Indischen Ozean',
  'Brunei Darussalam',
  'Bulgarien',
  'Burkina Faso',
  'Burundi',
  'Chile',
  'China',
  'Cocos-(Keeling)-Inseln',
  'Cook-Inseln',
  'Costa Rica',
  'Curaçao',
  'Dänemark',
  'Deutschland',
  'Dominica',
  'Dominikanische Republik',
  'Dschibuti',
  'Ecuador',
  'Elfenbeinküste',
  'El Salvador',
  'Eritrea',
  'Estland',
  'Falkland-Inseln (Islas Malvinas)',
  'Färöer-Inseln',
  'Fidschi',
  'Finnland',
  'Frankreich',
  'Französische Südgebiete',
  'Französisch-Guayana',
  'Französisch-Polynesien',
  'Gabun',
  'Gambia',
  'Georgien',
  'Ghana',
  'Gibraltar',
  'Grenada',
  'Griechenland',
  'Grönland',
  'Guadeloupe',
  'Guam',
  'Guatemala',
  'Guernsey',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hongkong',
  'Indien',
  'Indonesien',
  'Irak',
  'Irland',
  'Island',
  'Isle of Man',
  'Israel',
  'Italien',
  'Jamaika',
  'Japan',
  'Jemen',
  'Jersey',
  'Jordanien',
  'Jungferninseln (Britisch)',
  'Kaimaninseln',
  'Kambodscha',
  'Kamerun',
  'Kanada',
  'Kap Verde',
  'Kasachstan',
  'Katar',
  'Kenia',
  'Kirgisistan',
  'Kiribati',
  'Kolumbien',
  'Komoren',
  'Kongo',
  'Kongo, Demokratische Republik Kongo',
  'Kosovo',
  'Kroatien',
  'Kuwait',
  'Laos, Demokratische Volksrepublik Laos',
  'Lesotho',
  'Lettland',
  'Libanon',
  'Liberia',
  'Libyen',
  'Liechtenstein',
  'Litauen',
  'Luxemburg',
  'Macau',
  'Madagaskar',
  'Malawi',
  'Malaysia',
  'Malediven',
  'Mali',
  'Malta',
  'Marokko',
  'Marshallinseln',
  'Martinique',
  'Mauretanien',
  'Mauritius',
  'Mayotte',
  'Mazedonien',
  'Mexiko',
  'Mikronesien',
  'Monaco',
  'Mongolei',
  'Montenegro',
  'Montserrat',
  'Mosambik',
  'Namibia',
  'Nauru',
  'Nepal',
  'Neukaledonien',
  'Neuseeland',
  'Nicaragua',
  'Niederlande',
  'Niger',
  'Nigeria',
  'Niue',
  'Nördliche Marianen',
  'Norfolkinsel',
  'Norwegen',
  'Oman',
  'Österreich',
  'Osttimor',
  'Pakistan',
  'Palästinensische Gebiete',
  'Palau',
  'Panama',
  'Papua-Neuguinea',
  'Paraguay',
  'Peru',
  'Philippinen',
  'Polen',
  'Portugal',
  'Puerto Rico',
  'Republik Moldau',
  'Réunion',
  'Ruanda',
  'Rumänien',
  'Russische Föderation',
  'Saint Kitts und Nevis',
  'Sambia',
  'Samoa',
  'San Marino',
  'São Tomé und Príncipe',
  'Saudi-Arabien',
  'Schweden',
  'Schweiz',
  'Senegal',
  'Serbien',
  'Seychellen',
  'Sierra Leone',
  'Simbabwe',
  'Singapur',
  'Sint Maarten',
  'Slowakei',
  'Slowenien',
  'Solomon-Inseln',
  'Somalia',
  'Spanien',
  'Spitzbergen und Jan Mayen',
  'Sri Lanka',
  'St. Helena',
  'St. Lucia',
  'St. Pierre und Miquelon',
  'St. Vincent und die Grenadinen',
  'Südafrika',
  'Südkorea',
  'Suriname',
  'Swasiland',
  'Tadschikistan',
  'Taiwan',
  'Tansania',
  'Thailand',
  'Togo',
  'Tokelau',
  'Tonga',
  'Trinidad und Tobago',
  'Tschad',
  'Tschechien',
  'Tunesien',
  'Türkei',
  'Turkmenistan',
  'Turks- und Caicosinseln',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'Ungarn',
  'Uruguay',
  'USA',
  'Usbekistan',
  'Vanuatu',
  'Venezuela',
  'Vereinigte Arabische Emirate',
  'Vereinigtes Königreich',
  'Vietnam',
  'Wallis- und Futuna-Inseln',
  'Zentralafrikanische Republik',
  'Zypern',
  'Internationale gebührenfreie Telefonnummern',
];

interface CampaignObjectiveSelectorProps {
  companyId: string;
}

interface CampaignObjective {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const campaignObjectives: CampaignObjective[] = [
  {
    id: 'SALES',
    title: 'Umsatz',
    description: 'Sie möchten Ihre Umsätze online, in Apps, am Telefon oder im Geschäft steigern',
    icon: ShoppingBag,
    color: 'text-green-600',
  },
  {
    id: 'LEADS',
    title: 'Leads',
    description:
      'Sie möchten mehr Leads und andere Conversions erzielen, indem Sie Interaktionen fördern',
    icon: Users,
    color: 'text-blue-600',
  },
  {
    id: 'WEBSITE_TRAFFIC',
    title: 'Website-Traffic',
    description: 'Sie möchten die richtigen Personen dazu bewegen, Ihre Website zu besuchen',
    icon: Globe,
    color: 'text-purple-600',
  },
  {
    id: 'APP_DOWNLOADS',
    title: 'App-Werbung',
    description: 'Mehr App-Installationen, Engagements und Vorregistrierungen erzielen',
    icon: Smartphone,
    color: 'text-orange-600',
  },
  {
    id: 'AWARENESS_AND_CONSIDERATION',
    title: 'Bekanntheit und Kaufbereitschaft',
    description:
      'Breite Zielgruppe ansprechen und Interesse an Produkten oder Marken wecken, die Sie anbieten',
    icon: Eye,
    color: 'text-pink-600',
  },
  {
    id: 'LOCAL_STORE_VISITS',
    title: 'Lokale Ladenbesuche und Werbeaktionen',
    description:
      'Mit dieser Option lässt sich die Anzahl der Besuche in lokalen Geschäften, einschließlich Restaurants und Autohäusern, steigern.',
    icon: MapPin,
    color: 'text-red-600',
  },
  {
    id: 'NO_OBJECTIVE',
    title: 'Kampagne ohne Vorgaben für Werbung erstellen',
    description: 'Als Nächstes eine Kampagne auswählen',
    icon: Settings,
    color: 'text-gray-600',
  },
];

export default function CampaignObjectiveSelector({ companyId }: CampaignObjectiveSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useAlertHelpers();

  const salesCampaignTypes = [
    {
      id: 'search',
      title: 'Suchen',
      description: 'Mit Textanzeigen den Umsatz über die Google Suche steigern',
      icon: Search,
    },
    {
      id: 'performance-max',
      title: 'Performance Max-Kampagne',
      description:
        'Mit Anzeigen in der Google Suche, auf YouTube, im Displaynetzwerk und auf anderen Plattformen den Umsatz steigern',
      icon: Zap,
    },
    {
      id: 'demand-gen',
      title: 'Demand Gen',
      description:
        'Mit Bild- und Videoanzeigen auf YouTube, im Google Displaynetzwerk und auf anderen Plattformen die Nachfrage steigern und mehr Conversions erzielen',
      icon: TrendingUp,
    },
    {
      id: 'video',
      title: 'Video',
      description: 'Mit Videoanzeigen auf YouTube den Umsatz steigern',
      icon: Youtube,
    },
    {
      id: 'display',
      title: 'Display',
      description:
        'Mit Ihrem Creative potenzielle Kunden über 3 Millionen Websites und Apps erreichen',
      icon: Monitor,
    },
    {
      id: 'shopping',
      title: 'Shopping',
      description:
        'Mit Shopping-Anzeigen für Produkte aus dem Merchant Center in der Google Suche werben',
      icon: Package,
    },
  ];

  const leadsCampaignTypes = [
    {
      id: 'search',
      title: 'Suchen',
      description: 'Mit Textanzeigen in der Google Suche Leads generieren',
      icon: Search,
    },
    {
      id: 'performance-max',
      title: 'Performance Max-Kampagne',
      description:
        'Mit Anzeigen in der Google Suche, auf YouTube, im Displaynetzwerk und auf anderen Plattformen Leads generieren, unabhängig davon, wo die angesprochenen Nutzer gerade browsen',
      icon: Zap,
    },
    {
      id: 'demand-gen',
      title: 'Demand Gen',
      description:
        'Mit Bild- und Videoanzeigen auf YouTube, im Google Displaynetzwerk und auf anderen Plattformen die Nachfrage steigern und mehr Conversions erzielen',
      icon: TrendingUp,
    },
    {
      id: 'video',
      title: 'Video',
      description: 'Mit Videoanzeigen Leads auf YouTube generieren',
      icon: Youtube,
    },
    {
      id: 'display',
      title: 'Display',
      description:
        'Mit Ihrem Creative potenzielle Kunden über 3 Millionen Websites und Apps erreichen',
      icon: Monitor,
    },
    {
      id: 'shopping',
      title: 'Shopping',
      description:
        'Mit Shopping-Anzeigen für Produkte aus dem Merchant Center in der Google Suche werben',
      icon: Package,
    },
  ];

  const websiteTrafficCampaignTypes = [
    {
      id: 'search',
      title: 'Suchen',
      description: 'Mit Textanzeigen mehr Websitezugriffe über die Google Suche erzielen',
      icon: Search,
    },
    {
      id: 'performance-max',
      title: 'Performance Max-Kampagne',
      description:
        'Mit Anzeigen in der Google Suche, auf YouTube, im Displaynetzwerk und auf anderen Plattformen den Website-Traffic steigern, unabhängig davon, wo die angesprochenen Nutzer gerade browsen',
      icon: Zap,
    },
    {
      id: 'demand-gen',
      title: 'Demand Gen',
      description:
        'Mit Bild- und Videoanzeigen auf YouTube, im Google Displaynetzwerk und auf anderen Plattformen die Nachfrage steigern und mehr Conversions erzielen',
      icon: TrendingUp,
    },
    {
      id: 'video',
      title: 'Video',
      description: 'Mit Videoanzeigen mehr Zugriffe auf Ihre Website über YouTube erzielen',
      icon: Youtube,
    },
    {
      id: 'display',
      title: 'Display',
      description:
        'Mit Ihrem Creative potenzielle Kunden über 3 Millionen Websites und Apps erreichen',
      icon: Monitor,
    },
    {
      id: 'shopping',
      title: 'Shopping',
      description:
        'Mit Shopping-Anzeigen für Produkte aus dem Merchant Center in der Google Suche werben',
      icon: Package,
    },
  ];

  const appCampaignTypes = [
    {
      id: 'app',
      title: 'App',
      description:
        'Mit App-Anzeigen in der Google Suche, auf Google Play, auf YouTube und auf Partnerwebsites für Android- oder iOS-Apps werben',
      icon: Smartphone,
    },
  ];

  const appSubtypes = [
    {
      id: 'app-installs',
      title: 'App-Installationen',
      description: 'Neue Nutzer zur Installation der App bewegen',
    },
    {
      id: 'app-engagement',
      title: 'App-Interaktionskampagnen',
      description:
        'Nutzer sollen Aktionen in Ihrer App ausführen (mindestens 50.000 Installationen erforderlich)',
    },
    {
      id: 'app-pre-registration',
      title: 'App-Vorregistrierung (nur Android)',
      description: 'Nutzer dafür gewinnen, sich vor Einführung Ihrer App vorzuregistrieren',
    },
  ];

  const videoSubtypes = [
    {
      id: 'drive_conversions',
      title: 'Mehr Conversions',
      description:
        'Mehr Conversions mit Videoanzeigen erzielen, die Nutzer dazu bewegen, mit Ihrem Unternehmen zu interagieren',
    },
  ];

  // Kampagnentypen für "Kampagne ohne Vorgaben"
  const noObjectiveCampaignTypes = [
    {
      id: 'search',
      title: 'Suchen',
      description: 'Mit Textanzeigen mehr Klicks in der Google Suche erzielen',
      icon: Search,
    },
    {
      id: 'performance-max',
      title: 'Performance Max-Kampagne',
      description:
        'Mit Anzeigen in der Google Suche, auf YouTube, im Displaynetzwerk und auf anderen Plattformen überall die richtigen Nutzer erreichen',
      icon: Zap,
    },
    {
      id: 'demand-gen',
      title: 'Demand Gen',
      description:
        'Mit Bild- und Videoanzeigen auf YouTube, im Google Displaynetzwerk und auf anderen Plattformen die Nachfrage steigern und mehr Conversions erzielen',
      icon: TrendingUp,
    },
    {
      id: 'display',
      title: 'Display',
      description:
        'Mit Ihrem Creative potenzielle Kunden über 3 Millionen Websites und Apps erreichen',
      icon: Monitor,
    },
    {
      id: 'shopping',
      title: 'Shopping',
      description:
        'Mit Shopping-Anzeigen für Produkte aus dem Merchant Center in der Google Suche werben',
      icon: Package,
    },
    {
      id: 'video',
      title: 'Video',
      description: 'Mit Videoanzeigen mehr Klicks auf YouTube erzielen',
      icon: Youtube,
    },
    {
      id: 'app',
      title: 'App',
      description:
        'Mit App-Anzeigen in der Google Suche, auf Google Play, auf YouTube und auf Partnerwebsites für Android- oder iOS-Apps werben',
      icon: Smartphone,
    },
  ];

  const [selectedObjective, setSelectedObjective] = useState<string>('');
  const [selectedCampaignType, setSelectedCampaignType] = useState<string>('');
  const [selectedTactics, setSelectedTactics] = useState<string[]>([]);
  const [selectedConversionGoals, setSelectedConversionGoals] = useState<string[]>([]);
  const [selectedAppSubtype, setSelectedAppSubtype] = useState<string>('');
  const [selectedVideoSubtype, setSelectedVideoSubtype] = useState<string>('drive_conversions');
  const [selectedAppPlatform, setSelectedAppPlatform] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAwarenessSubtype, setSelectedAwarenessSubtype] = useState<string>('');
  const [selectedLocalGoal, setSelectedLocalGoal] = useState<string>('');
  const [selectedLocalBusinessType, setSelectedLocalBusinessType] =
    useState<string>('google-business-profile');
  const [isGoogleBusinessConnected, setIsGoogleBusinessConnected] = useState<boolean>(false);
  const [isLoadingGoogleBusiness, setIsLoadingGoogleBusiness] = useState<boolean>(false);
  const [googleBusinessError, setGoogleBusinessError] = useState<string>('');
  const [googleBusinessAccounts, setGoogleBusinessAccounts] = useState<any[]>([]);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState<boolean>(false);
  const [showMerchantCenterModal, setShowMerchantCenterModal] = useState<boolean>(false);
  const [selectedAffiliateChains, setSelectedAffiliateChains] = useState<any[]>([]);
  const [enhancedConversionsEnabled, setEnhancedConversionsEnabled] = useState<boolean>(true);
  const [showMoreConversionGoals, setShowMoreConversionGoals] = useState<boolean>(false);
  const [showConversionSetupModal, setShowConversionSetupModal] = useState<boolean>(false);
  const [selectedGoalForSetup, setSelectedGoalForSetup] = useState<string>('');
  const [conversionSetupMethod, setConversionSetupMethod] = useState<string>('ga4');
  const [campaignName, setCampaignName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [phoneCountry, setPhoneCountry] = useState<string>('Deutschland');
  const [businessData, setBusinessData] = useState({
    businessName: '',
    landingDestination: '',
    websiteUrl: '',
  });
  const [conversionGoalConfigs, setConversionGoalConfigs] = useState<Record<string, any>>({});

  useEffect(() => {
    // Body scroll blockieren wenn Modal offen ist
    if (showLocationModal || showAffiliateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup beim Unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showLocationModal, showAffiliateModal]);

  useEffect(() => {
    // Daten aus URL-Parametern laden
    setBusinessData({
      businessName: searchParams.get('businessName') || '',
      landingDestination: searchParams.get('landingDestination') || '',
      websiteUrl: searchParams.get('websiteUrl') || '',
    });

    // Google Business Profile Connection Status checken
    checkGoogleBusinessConnection();

    // OAuth Success verarbeiten
    const googleBusinessSuccess = searchParams.get('google_business_success');
    if (googleBusinessSuccess === 'true') {
      // URL bereinigen (Success-Parameter entfernen)
      const url = new URL(window.location.href);
      url.searchParams.delete('google_business_success');
      window.history.replaceState({}, '', url.toString());

      // Connection Status neu laden
      checkGoogleBusinessConnection();
    }

    // OAuth Error wird jetzt über Popup-Messages behandelt

    // Legacy OAuth Callback verarbeiten (falls noch verwendet)
    const googleBusinessCode = searchParams.get('google_business_code');
    const googleBusinessState = searchParams.get('google_business_state');
    if (googleBusinessCode && googleBusinessState) {
      handleOAuthCallback(googleBusinessCode, googleBusinessState);
    }
  }, [searchParams]);

  const checkGoogleBusinessConnection = async () => {
    try {
      const isConnected = await GoogleBusinessProfileService.isConnected(companyId);
      setIsGoogleBusinessConnected(isConnected);

      if (isConnected) {
        await loadGoogleBusinessData();
      }
    } catch (error) {
      console.error('Error checking Google Business connection:', error);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setIsLoadingGoogleBusiness(true);
      await GoogleBusinessProfileService.handleOAuthCallback(companyId, code, state);
      setIsGoogleBusinessConnected(true);
      await loadGoogleBusinessData();

      // URL Parameter entfernen
      const url = new URL(window.location.href);
      url.searchParams.delete('google_business_code');
      url.searchParams.delete('google_business_state');
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      setGoogleBusinessError('Fehler beim Verbinden mit Google Business Profile');
    } finally {
      setIsLoadingGoogleBusiness(false);
    }
  };

  const loadGoogleBusinessData = async () => {
    try {
      setIsLoadingGoogleBusiness(true);
      setGoogleBusinessError('');

      console.log('🔄 Lade Google Business Accounts für Company:', companyId);
      const accounts = await GoogleBusinessProfileService.getBusinessAccounts(companyId);

      console.log('✅ Google Business Accounts geladen:', accounts);
      setGoogleBusinessAccounts(accounts);

      if (accounts.length === 0) {
        setGoogleBusinessError(
          '❗ Keine Google Business Profile gefunden. Sie müssen zuerst ein Google Unternehmensprofil erstellen, um Standorte für Ihre Anzeigen zu verwenden.'
        );
      }
    } catch (error) {
      console.error('❌ Error loading Google Business data:', error);
      setGoogleBusinessError(
        `Fehler beim Laden der Google Business Daten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    } finally {
      setIsLoadingGoogleBusiness(false);
    }
  };

  const handleObjectiveSelect = (objective: string) => {
    setSelectedObjective(objective);
    // Reset all other selections when switching objectives
    setSelectedCampaignType('');
    setSelectedAppSubtype('');
    setSelectedPlatform('');
    setSearchQuery('');
    setSelectedAwarenessSubtype('');
    setSelectedLocalGoal('');
    setSelectedLocalBusinessType('google-business-profile');
    setCampaignName('');
  };

  // Handler für App-Untertyp-Auswahl
  const handleAppSubtypeSelect = (subtypeId: string) => {
    setSelectedAppSubtype(subtypeId);
    // Für Vorregistrierung automatisch Android setzen (nur Android unterstützt)
    if (subtypeId === 'app-pre-registration') {
      setSelectedAppPlatform('android');
    } else {
      setSelectedAppPlatform('');
    }
  };

  const handleContinue = () => {
    if (!selectedObjective) {
      alert('Bitte wählen Sie ein Kampagnenziel aus.');
      return;
    }

    // Alle Daten zusammenführen und zur nächsten Seite
    const allData = {
      ...businessData,
      objective: selectedObjective,
      enhancedConversions: enhancedConversionsEnabled,
    };

    console.log('Kampagnendaten:', allData);

    // Hier würde zur nächsten Seite navigiert werden (z.B. Kampagnentyp-Auswahl)
    // router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new/campaign-type?${new URLSearchParams(allData)}`);

    alert('Kampagnenziel ausgewählt! (Nächste Seite würde hier folgen)');
  };

  const handleBack = () => {
    router.back();
  };

  const handleConnectGoogleBusiness = async () => {
    try {
      setIsLoadingGoogleBusiness(true);
      setGoogleBusinessError('');

      const authUrl = await GoogleBusinessProfileService.initiateOAuthFlow(companyId);

      // OAuth in neuem Popup-Fenster öffnen
      const popup = window.open(
        authUrl,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.');
      }

      // Message Listener für Success-Meldung vom Popup (COOP-sicher)
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          // Popup wird sich selbst schließen - wir müssen es nicht manuell schließen
          setIsLoadingGoogleBusiness(false);
          checkGoogleBusinessConnection();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          // Popup wird sich selbst schließen - wir müssen es nicht manuell schließen
          setIsLoadingGoogleBusiness(false);
          setGoogleBusinessError(event.data.error || 'OAuth-Fehler aufgetreten');
          window.removeEventListener('message', handleMessage);
        }
      };

      // Popup ist nur über PostMessage kommunizierbar - keine COOP-unsichere popup.closed Prüfung
      // Fallback wird nach 5 Minuten automatisch ausgeführt
      // Cache refresh timestamp: 2025-11-18T09:58

      window.addEventListener('message', handleMessage);

      // Fallback: Nach 5 Minuten OAuth-Vorgang beenden falls keine Antwort kam
      setTimeout(() => {
        setIsLoadingGoogleBusiness(false);
        window.removeEventListener('message', handleMessage);
        // Falls bis jetzt keine Connection-Prüfung stattfand, machen wir eine
        if (isLoadingGoogleBusiness) {
          checkGoogleBusinessConnection();
        }
      }, 300000); // 5 Minuten
    } catch (error) {
      console.error('Error connecting Google Business:', error);
      setGoogleBusinessError(
        error instanceof Error
          ? error.message
          : 'Fehler beim Starten der Google Business Verbindung'
      );
      setIsLoadingGoogleBusiness(false);
    }
  };

  const handleGoogleAdsReauth = async () => {
    try {
      const response = await fetch(`/api/google-ads/auth-url?companyId=${companyId}&isPopup=true`);
      const data = await response.json();

      if (data.success && data.url) {
        const popup = window.open(
          data.url,
          'google-ads-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          alert('Bitte erlauben Sie Popups für diese Seite.');
          return;
        }

        // Listen for message
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'GOOGLE_ADS_OAUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            showSuccess('Berechtigungen erfolgreich aktualisiert!');
            // Retry logic could be added here, or just let user click save again
          } else if (event.data.type === 'GOOGLE_ADS_OAUTH_ERROR') {
            window.removeEventListener('message', handleMessage);
            alert(
              'Fehler bei der Aktualisierung der Berechtigungen: ' +
                (event.data.error || 'Unbekannter Fehler')
            );
          }
        };

        window.addEventListener('message', handleMessage);
      }
    } catch (error) {
      console.error('Error starting re-auth:', error);
      alert('Fehler beim Starten der Authentifizierung.');
    }
  };

  const handleDisconnectGoogleBusiness = async () => {
    try {
      await GoogleBusinessProfileService.disconnect(companyId);
      setIsGoogleBusinessConnected(false);
      setGoogleBusinessAccounts([]);
    } catch (error) {
      console.error('Error disconnecting:', error);
      setGoogleBusinessError('Fehler beim Trennen der Verbindung');
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#14ad9f] rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Was möchten Sie mit Ihrer Kampagne erreichen?
              </h1>
            </div>
            <p className="text-gray-600">
              Wählen Sie ein Ziel aus, damit die verwendeten Zielvorhaben und Einstellungen für Ihre
              Kampagne optimiert werden.
            </p>
          </div>
        </div>

        {/* Campaign Objectives Grid */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Ziel auswählen</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaignObjectives.map(objective => {
                const IconComponent = objective.icon;
                const isSelected = selectedObjective === objective.id;

                return (
                  <div
                    key={objective.id}
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleObjectiveSelect(objective.id)}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="w-5 h-5 text-[#14ad9f]" />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${isSelected ? 'bg-[#14ad9f]' : 'bg-gray-100'}`}
                        >
                          <IconComponent
                            className={`w-5 h-5 ${isSelected ? 'text-white' : objective.color}`}
                          />
                        </div>
                        <h3
                          className={`font-semibold ${isSelected ? 'text-[#14ad9f]' : 'text-gray-900'}`}
                        >
                          {objective.title}
                        </h3>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed">
                        {objective.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kampagnentypen für Sales, Leads, Website-Traffic und App-Downloads */}
        {(selectedObjective === 'SALES' ||
          selectedObjective === 'LEADS' ||
          selectedObjective === 'WEBSITE_TRAFFIC' ||
          selectedObjective === 'APP_DOWNLOADS') && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Wählen Sie einen Kampagnentyp aus
                </h2>
                <p className="text-gray-600">
                  Verschiedene Kampagnentypen helfen Ihnen dabei, Ihre Zielgruppe auf
                  unterschiedliche Weise zu erreichen.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedObjective === 'SALES'
                  ? salesCampaignTypes
                  : selectedObjective === 'LEADS'
                    ? leadsCampaignTypes
                    : selectedObjective === 'WEBSITE_TRAFFIC'
                      ? websiteTrafficCampaignTypes
                      : appCampaignTypes
                ).map(type => {
                  const IconComponent = type.icon;
                  const isSelected = selectedCampaignType === type.id;

                  return (
                    <div
                      key={type.id}
                      className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedCampaignType(type.id)}
                    >
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-5 h-5 text-[#14ad9f]" />
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${isSelected ? 'bg-[#14ad9f]' : 'bg-gray-100'}`}
                          >
                            <IconComponent
                              className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`}
                            />
                          </div>
                          <h3
                            className={`font-semibold ${isSelected ? 'text-[#14ad9f]' : 'text-gray-900'}`}
                          >
                            {type.title}
                          </h3>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed">{type.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Kampagnentypen für "Kampagne ohne Vorgaben" */}
        {selectedObjective === 'NO_OBJECTIVE' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <fieldset>
                <legend className="sr-only">Wählen Sie einen Kampagnentyp aus</legend>

                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Wählen Sie einen Kampagnentyp aus
                  </h2>
                </div>

                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  role="tablist"
                >
                  {noObjectiveCampaignTypes.map(type => {
                    const IconComponent = type.icon;
                    const isSelected = selectedCampaignType === type.id;

                    return (
                      <div
                        key={type.id}
                        role="tab"
                        aria-selected={isSelected}
                        aria-label={type.title}
                        tabIndex={isSelected ? 0 : -1}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedCampaignType(type.id)}
                      >
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle2 className="w-5 h-5 text-[#14ad9f]" />
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${isSelected ? 'bg-[#14ad9f]' : 'bg-gray-100'}`}
                            >
                              <IconComponent
                                className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`}
                              />
                            </div>
                            <h3
                              className={`font-semibold ${isSelected ? 'text-[#14ad9f]' : 'text-gray-900'}`}
                            >
                              {type.title}
                            </h3>
                          </div>

                          <p className="text-sm text-gray-600 leading-relaxed">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </div>
        )}

        {/* Video Campaign Subtype Selection */}
        {selectedCampaignType === 'video' &&
          ['SALES', 'LEADS', 'WEBSITE_TRAFFIC'].includes(selectedObjective) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Kampagnenuntertyp auswählen
                  </h2>
                </div>

                <div className="space-y-3">
                  {videoSubtypes.map(subtype => (
                    <div
                      key={subtype.id}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedVideoSubtype === subtype.id
                          ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedVideoSubtype(subtype.id)}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                          selectedVideoSubtype === subtype.id
                            ? 'border-[#14ad9f] bg-[#14ad9f]'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedVideoSubtype === subtype.id && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`font-semibold mb-1 ${
                            selectedVideoSubtype === subtype.id ? 'text-[#14ad9f]' : 'text-gray-900'
                          }`}
                        >
                          {subtype.title}
                        </h3>
                        <div className="text-sm text-gray-600">
                          {subtype.description}
                          <a
                            href="https://support.google.com/google-ads/answer/10146226?hl=de"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center ml-2"
                            onClick={e => e.stopPropagation()}
                          >
                            Weitere Informationen
                            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                              <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path>
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Conversion Tracking Warning */}
                <div className="mt-6 flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="p-1 bg-yellow-100 rounded text-yellow-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-yellow-800 mb-2">
                      <a
                        href="#"
                        className="font-medium underline hover:text-yellow-900 text-blue-700"
                      >
                        Richten Sie Conversion-Tracking ein
                      </a>
                      , um mit der Erstellung der Kampagne fortzufahren.
                    </p>
                    <div>
                      <a
                        href="https://support.google.com/google-ads/answer/1722054?hl=de"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline inline-flex items-center"
                      >
                        Methoden zum Erfassen von Conversions
                        <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                          <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* App-Kampagnenuntertyp für App-Downloads */}
        {selectedObjective === 'APP_DOWNLOADS' && selectedCampaignType === 'app' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Kampagnenuntertyp auswählen
                </h2>
                <p className="text-gray-600">
                  Wählen Sie aus, welche Art von App-Kampagne Sie erstellen möchten.
                </p>
              </div>

              <div className="space-y-3">
                {appSubtypes.map(subtype => (
                  <div
                    key={subtype.id}
                    className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedAppSubtype === subtype.id
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleAppSubtypeSelect(subtype.id)}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                        selectedAppSubtype === subtype.id
                          ? 'border-[#14ad9f] bg-[#14ad9f]'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedAppSubtype === subtype.id && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-semibold mb-1 ${
                          selectedAppSubtype === subtype.id ? 'text-[#14ad9f]' : 'text-gray-900'
                        }`}
                      >
                        {subtype.title}
                      </h3>
                      <p className="text-sm text-gray-600">{subtype.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* App-Plattform und App-Suche (nicht für Vorregistrierung) */}
        {selectedObjective === 'APP_DOWNLOADS' &&
          selectedCampaignType === 'app' &&
          selectedAppSubtype &&
          selectedAppSubtype !== 'app-pre-registration' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                {/* Plattform-Auswahl */}
                <fieldset className="mb-8">
                  <legend>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      App-Plattform auswählen
                    </h2>
                  </legend>

                  <div className="space-y-2">
                    {['android', 'ios'].map(platform => (
                      <div key={platform} className="flex items-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center cursor-pointer transition-colors ${
                            selectedAppPlatform === platform
                              ? 'border-[#14ad9f] bg-[#14ad9f]'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onClick={() => setSelectedAppPlatform(platform)}
                        >
                          {selectedAppPlatform === platform && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <label
                          className={`font-medium cursor-pointer ${
                            selectedAppPlatform === platform ? 'text-[#14ad9f]' : 'text-gray-900'
                          }`}
                          onClick={() => setSelectedAppPlatform(platform)}
                        >
                          {platform === 'android' ? 'Android' : 'iOS'}
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>

                {/* App-Suche */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">App suchen</h3>
                  <div className="relative mb-4">
                    <Search
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                        selectedAppPlatform ? 'text-gray-400' : 'text-gray-300'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="App-Name, Paketname, Publisher oder Play Store-URL eingeben"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none transition-colors ${
                        selectedAppPlatform
                          ? 'border-gray-300 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed text-gray-400'
                      }`}
                      disabled={!selectedAppPlatform}
                      readOnly={!selectedAppPlatform}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Sollten Sie die App nicht finden, erfahren Sie unter „
                    <a
                      href="https://support.google.com/google-ads/answer/13847084?hl=de"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      Google Ads Hilfe
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                        <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path>
                      </svg>
                    </a>
                    “, was Sie tun können.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Spezielle App-Suche für Vorregistrierung (nur Android) */}
        {selectedObjective === 'APP_DOWNLOADS' &&
          selectedCampaignType === 'app' &&
          selectedAppSubtype === 'app-pre-registration' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Für Vorregistrierung infrage kommende App suchen
                    </h2>
                    <div
                      className="w-5 h-5 text-gray-400 cursor-help"
                      title="Weitere Informationen"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-4 4a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-600">
                    Suchen Sie nach Apps, die für die Vorregistrierung auf Android verfügbar sind.
                  </p>
                </div>

                <div>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="App-Name, Paketname, Publisher oder Play Store-URL eingeben"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none"
                      aria-label="Für Vorregistrierung infrage kommende App suchen"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Sollten Sie die App nicht finden, erfahren Sie unter „
                    <a
                      href="https://support.google.com/google-ads/answer/13847084?hl=de"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      Google Ads Hilfe
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                        <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path>
                      </svg>
                    </a>
                    “, was Sie tun können.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Bekanntheit und Kaufbereitschaft Zielvorhaben */}
        {selectedObjective === 'AWARENESS_AND_CONSIDERATION' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Zielvorhaben „Bekanntheit“ und „Kaufbereitschaft“ auswählen
                </h2>
                <p className="text-gray-600">
                  Die einzelnen Kampagnen werden für unterschiedliche Zielvorhaben optimiert. Wählen
                  Sie das Zielvorhaben aus, das für den Erfolg Ihrer Kampagne am wichtigsten ist.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {[
                  {
                    id: 'reach',
                    title: 'Reichweite',
                    description: 'Die maximale Anzahl von Nutzern erreichen',
                  },
                  {
                    id: 'video-views',
                    title: 'Videoaufrufe',
                    description:
                      'Damit können Sie Nutzer dazu veranlassen, sich Ihre Videoanzeigen anzusehen',
                  },
                ].map(subtype => (
                  <div key={subtype.id} className="space-y-2">
                    <div
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedAwarenessSubtype === subtype.id
                          ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAwarenessSubtype(subtype.id)}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          selectedAwarenessSubtype === subtype.id
                            ? 'border-[#14ad9f] bg-[#14ad9f]'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedAwarenessSubtype === subtype.id && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`font-semibold text-base ${
                            selectedAwarenessSubtype === subtype.id
                              ? 'text-[#14ad9f]'
                              : 'text-gray-900'
                          }`}
                        >
                          {subtype.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">{subtype.description}</p>
                  </div>
                ))}
              </div>

              {/* Info-Callout */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-800">
                    Wenn Sie Demand Gen-Kampagnen für Klicks (oder Conversions) optimieren möchten,
                    verwenden Sie bitte das Zielvorhaben „Umsatz“, „Leads“ oder „Website-Traffic“
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lokale Ladenbesuche Flow */}
        {selectedObjective === 'LOCAL_STORE_VISITS' && (
          <div className="space-y-6">
            {/* Performance Max Campaign Type */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Wählen Sie einen Kampagnentyp aus
                  </h2>
                </div>

                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCampaignType === 'performance-max-local'
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCampaignType('performance-max-local')}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                        selectedCampaignType === 'performance-max-local'
                          ? 'border-[#14ad9f] bg-[#14ad9f]'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedCampaignType === 'performance-max-local' && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-[#14ad9f]" />
                        <h3
                          className={`font-semibold text-lg ${
                            selectedCampaignType === 'performance-max-local'
                              ? 'text-[#14ad9f]'
                              : 'text-gray-900'
                          }`}
                        >
                          Performance Max-Kampagne
                        </h3>
                      </div>
                      <p className="text-gray-600">
                        Mit Anzeigen in der Google Suche, auf YouTube, im Displaynetzwerk und auf
                        anderen Plattformen überall die richtigen Nutzer erreichen
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info-Callout über lokale Kampagnen */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-blue-100 rounded">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800">
                        Lokale Kampagnen wurden durch Performance Max-Kampagnen abgelöst. Dieser
                        Kampagnentyp bietet Ihnen dieselben Optimierungsmöglichkeiten und
                        Conversion-Aktionen, darunter Ladenbesuche, Anrufklicks oder Aufrufe der
                        Wegbeschreibung. So können Sie Ihre Offlineziele leichter erreichen.{' '}
                        <a
                          href="https://support.google.com/google-ads/answer/11605187?hl=de"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          Weitere Informationen
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Kampagnenfeeds */}
            {selectedCampaignType === 'performance-max-local' && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Kampagnenfeeds</h2>
                    <p className="text-gray-600">
                      Verfügbare Anzeigenformate erweitern, Anzeigen-Creatives optimieren und das
                      Targeting verbessern.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-6">
                        Welche Filialen sollen in Ihren Anzeigen beworben werden?
                      </h3>

                      {/* Exact Google Ads Layout */}
                      <div className="space-y-6">
                        {/* Top Level Radio Group */}
                        <div className="space-y-4">
                          {/* Meine Unternehmensstandorte - Selected */}
                          <label
                            className="flex items-center cursor-pointer"
                            onClick={() => setSelectedLocalBusinessType('google-business-profile')}
                          >
                            <div className="w-5 h-5 mr-4 flex items-center justify-center">
                              <div
                                className={`w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                                  selectedLocalBusinessType === 'google-business-profile'
                                    ? 'border-blue-600'
                                    : 'border-gray-400'
                                }`}
                              >
                                {selectedLocalBusinessType === 'google-business-profile' && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-sm font-normal ${
                                selectedLocalBusinessType === 'google-business-profile'
                                  ? 'text-gray-900'
                                  : 'text-gray-600'
                              }`}
                            >
                              Meine Unternehmensstandorte
                            </span>
                          </label>

                          {/* Affiliate-Standorte - Unselected */}
                          <label
                            className="flex items-center cursor-pointer"
                            onClick={() => setSelectedLocalBusinessType('affiliate-locations')}
                          >
                            <div className="w-5 h-5 mr-4 flex items-center justify-center">
                              <div
                                className={`w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                                  selectedLocalBusinessType === 'affiliate-locations'
                                    ? 'border-blue-600'
                                    : 'border-gray-400'
                                }`}
                              >
                                {selectedLocalBusinessType === 'affiliate-locations' && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-sm font-normal ${
                                selectedLocalBusinessType === 'affiliate-locations'
                                  ? 'text-gray-900'
                                  : 'text-gray-600'
                              }`}
                            >
                              Affiliate-Standorte
                            </span>
                          </label>
                        </div>

                        {/* Konto verknüpfen Link */}
                        <div className="ml-9">
                          {selectedLocalBusinessType === 'google-business-profile' && (
                            <>
                              {!isGoogleBusinessConnected ? (
                                <button
                                  type="button"
                                  onClick={() => setShowLocationModal(true)}
                                  className="text-blue-600 text-sm font-normal hover:underline focus:outline-none"
                                >
                                  Konto verknüpfen
                                </button>
                              ) : (
                                <div className="text-sm text-gray-600">
                                  ✓ Google Business Profile verbunden
                                </div>
                              )}
                            </>
                          )}

                          {selectedLocalBusinessType === 'affiliate-locations' && (
                            <>
                              {selectedAffiliateChains.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setShowAffiliateModal(true)}
                                  className="text-blue-600 text-sm font-normal hover:underline focus:outline-none"
                                >
                                  Standorte auswählen
                                </button>
                              ) : (
                                <div className="space-y-2">
                                  <div className="text-sm text-gray-600">
                                    ✓ {selectedAffiliateChains.length} Kette
                                    {selectedAffiliateChains.length !== 1 ? 'n' : ''} mit{' '}
                                    {selectedAffiliateChains
                                      .reduce((sum, chain) => sum + chain.locationCount, 0)
                                      .toLocaleString()}{' '}
                                    Standorten ausgewählt
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowAffiliateModal(true)}
                                    className="text-blue-600 text-sm font-normal hover:underline focus:outline-none"
                                  >
                                    Auswahl ändern
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Connection Status */}
                      {isLoadingGoogleBusiness && (
                        <div className="mt-4 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-sm text-gray-600">Verbinde...</span>
                        </div>
                      )}

                      {googleBusinessError && (
                        <div className="mt-4 text-sm text-red-600">{googleBusinessError}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversion-Zielvorhaben */}
            {selectedCampaignType === 'performance-max-local' && selectedLocalBusinessType && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Conversion-Zielvorhaben vom Typ „lokale ladenbesuche und werbeaktionen&quot;
                      auswählen
                    </h2>
                    <p className="text-gray-600">
                      Hier wählen Sie die Zielvorhaben vom Typ „lokale ladenbesuche und
                      werbeaktionen&quot; aus, auf die Sie sich konzentrieren möchten. Abhängig von
                      Ihrer Auswahl werden Ihre Anzeigen dann mithilfe von Smart Bidding den
                      richtigen Personen präsentiert, damit Sie Ihre Zielvorhaben erreichen.{' '}
                      <a
                        href="https://support.google.com/google-ads/answer/7065882?hl=de"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        Weitere Informationen zu Smart Bidding
                      </a>
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        id: 'contact',
                        title: 'Kontakt',
                        description:
                          'Anzeigen für Nutzer schalten, die mit höherer Wahrscheinlichkeit ein Unternehmen wie Ihres kontaktieren',
                        icon: Users,
                      },
                      {
                        id: 'directions',
                        title: 'Routenanfrage',
                        description:
                          'Anzeigen für Nutzer schalten, die mit höherer Wahrscheinlichkeit eine Wegbeschreibung zu einem Unternehmen wie Ihrem suchen',
                        icon: MapPin,
                      },
                    ].map(goal => {
                      const IconComponent = goal.icon;
                      return (
                        <div
                          key={goal.id}
                          className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            selectedLocalGoal === goal.id
                              ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedLocalGoal(goal.id)}
                        >
                          <div className="flex items-start gap-4 w-full">
                            <IconComponent className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
                            <div className="flex-1">
                              <h3
                                className={`font-semibold text-base mb-1 ${
                                  selectedLocalGoal === goal.id ? 'text-[#14ad9f]' : 'text-gray-900'
                                }`}
                              >
                                {goal.title}
                              </h3>
                              <p className="text-sm text-gray-600">{goal.description}</p>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                selectedLocalGoal === goal.id
                                  ? 'border-[#14ad9f] bg-[#14ad9f]'
                                  : 'border-gray-300'
                              }`}
                            >
                              {selectedLocalGoal === goal.id && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tactics Selection for Search Campaign */}
        {selectedCampaignType === 'search' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-base text-gray-700 font-medium">
                    Wählen Sie aus, wie Sie Ihr Zielvorhaben erreichen möchten
                  </h2>
                  <div className="text-gray-400 cursor-help" title="Weitere Informationen">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Website Visits */}
                <div>
                  <div
                    className="flex items-center gap-3 cursor-pointer mb-3"
                    onClick={() => {
                      if (selectedTactics.includes('website_visits')) {
                        setSelectedTactics(selectedTactics.filter(id => id !== 'website_visits'));
                      } else {
                        setSelectedTactics([...selectedTactics, 'website_visits']);
                      }
                    }}
                  >
                    <div
                      className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                        selectedTactics.includes('website_visits')
                          ? 'bg-[#14ad9f] text-white'
                          : 'border-2 border-gray-400'
                      }`}
                    >
                      {selectedTactics.includes('website_visits') && <Check className="w-4 h-4" />}
                    </div>
                    <span className="text-gray-900">Websitebesuche</span>
                  </div>

                  {selectedTactics.includes('website_visits') && (
                    <div className="ml-8">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LinkIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                          type="text"
                          value={businessData.websiteUrl}
                          onChange={e =>
                            setBusinessData({ ...businessData, websiteUrl: e.target.value })
                          }
                          placeholder="https://taskilo.de"
                          className="w-full pl-10 pr-4 py-3 border border-gray-400 rounded focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none text-gray-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Phone Calls */}
                <div>
                  <div
                    className="flex items-center gap-3 cursor-pointer mb-3"
                    onClick={() => {
                      if (selectedTactics.includes('phone_calls')) {
                        setSelectedTactics(selectedTactics.filter(id => id !== 'phone_calls'));
                      } else {
                        setSelectedTactics([...selectedTactics, 'phone_calls']);
                      }
                    }}
                  >
                    <div
                      className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                        selectedTactics.includes('phone_calls')
                          ? 'bg-[#14ad9f] text-white'
                          : 'border-2 border-gray-400'
                      }`}
                    >
                      {selectedTactics.includes('phone_calls') && <Check className="w-4 h-4" />}
                    </div>
                    <span className="text-gray-900">Anrufe</span>
                  </div>

                  {selectedTactics.includes('phone_calls') && (
                    <div className="ml-8">
                      <div className="flex gap-4 mb-1">
                        <div className="relative w-1/3">
                          <select
                            value={phoneCountry}
                            onChange={e => setPhoneCountry(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-400 rounded focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none appearance-none bg-white text-gray-900 truncate pr-8"
                          >
                            {COUNTRY_OPTIONS.map(country => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                        </div>
                        <div className="relative flex-1">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value)}
                            placeholder="Telefonnummer"
                            className="w-full px-4 py-3 border border-gray-400 rounded focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none text-gray-900"
                          />
                          <HelpCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 cursor-help" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Beispiel: (201) 555-0123</p>
                    </div>
                  )}
                </div>

                {/* Store Visits */}
                <div>
                  <div
                    className="flex items-center gap-3 cursor-pointer mb-2"
                    onClick={() => {
                      if (selectedTactics.includes('store_visits')) {
                        setSelectedTactics(selectedTactics.filter(id => id !== 'store_visits'));
                      } else {
                        setSelectedTactics([...selectedTactics, 'store_visits']);
                      }
                    }}
                  >
                    <div
                      className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                        selectedTactics.includes('store_visits')
                          ? 'bg-[#14ad9f] text-white'
                          : 'border-2 border-gray-400'
                      }`}
                    >
                      {selectedTactics.includes('store_visits') && <Check className="w-4 h-4" />}
                    </div>
                    <span className="text-gray-900">Ladenbesuche</span>
                  </div>

                  {selectedTactics.includes('store_visits') && (
                    <div className="ml-8">
                      <p className="text-gray-600">
                        Der Standort wird im nächsten Schritt eingegeben
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Website Input for Display Campaign */}
        {selectedCampaignType === 'display' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-base text-gray-700 font-medium">
                    Auf diese Website gelangen Nutzer, nachdem sie auf Ihre Anzeige geklickt haben
                  </h2>
                  <div className="text-gray-400 cursor-help" title="Weitere Informationen">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={businessData.websiteUrl}
                  onChange={e => setBusinessData({ ...businessData, websiteUrl: e.target.value })}
                  placeholder="Ihre Unternehmenswebsite"
                  className="w-full pl-10 pr-4 py-3 border border-gray-400 rounded focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none text-gray-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Shopping Campaign Merchant Center Section */}
        {selectedCampaignType === 'shopping' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Dieser Kampagne Produkte hinzufügen
                </h2>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-4 4a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 mb-3">
                      Wenn Sie eine Shopping-Kampagne verwenden möchten, müssen Sie ein Merchant
                      Center-Konto mit den Produkten erstellen, die beworben werden sollen. Sie
                      können das Konto jetzt erstellen und die Einrichtung abschließen, nachdem Sie
                      diese Kampagne veröffentlicht haben.
                    </p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 h-auto"
                      onClick={() => setShowMerchantCenterModal(true)}
                    >
                      Merchant Center-Konto erstellen
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversion Goals Selection for Search & Performance Max & Demand Gen & Display Campaign */}
        {(selectedCampaignType === 'search' ||
          selectedCampaignType === 'performance-max' ||
          selectedCampaignType === 'demand-gen' ||
          selectedCampaignType === 'display') && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Conversion-Zielvorhaben vom Typ „
                  {campaignObjectives.find(o => o.id === selectedObjective)?.title.toLowerCase()}“
                  auswählen
                </h2>
                <p className="text-gray-600">
                  Hier wählen Sie die Zielvorhaben vom Typ „
                  {campaignObjectives.find(o => o.id === selectedObjective)?.title.toLowerCase()}“
                  aus, auf die Sie sich konzentrieren möchten. Abhängig von Ihrer Auswahl werden
                  Ihre Anzeigen dann mithilfe von Smart Bidding den richtigen Personen präsentiert,
                  damit Sie Ihre Zielvorhaben erreichen.
                  <a
                    href="https://support.google.com/google-ads/answer/7065882?hl=de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 ml-1 hover:underline inline-flex items-center"
                  >
                    Weitere Informationen zu Smart Bidding
                    <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                      <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path>
                    </svg>
                  </a>
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    id: 'purchase',
                    title: 'Kauf',
                    description:
                      'Schalten Sie Ihre Anzeigen für Nutzer, die mit der größten Wahrscheinlichkeit Produkte von Ihrer Website, aus Ihrer App oder in Ihrem Geschäft kaufen werden.',
                    icon: CreditCard,
                    isPrimary: true,
                  },
                  {
                    id: 'subscribe',
                    title: 'Abokauf',
                    description:
                      'Anzeigen für Nutzer schalten, die am wahrscheinlichsten kostenpflichtige Abos für Ihre Dienstleistungen und/oder Produkte abschließen',
                    icon: Repeat,
                    isPrimary: true,
                  },
                  {
                    id: 'add_to_cart',
                    title: 'In den Einkaufswagen',
                    description:
                      'Anzeigen für Nutzer schalten, die Interesse an Ihren Produkten haben. Sie können dann Erinnerungen senden, um den Bezahlvorgang abzuschließen.',
                    icon: ShoppingCart,
                    isPrimary: false,
                  },
                  {
                    id: 'begin_checkout',
                    title: 'Bezahlvorgang starten',
                    description:
                      'Anzeigen für Nutzer schalten, die Interesse an Ihren Produkten haben. Sie können dann Erinnerungen senden, um den Bezahlvorgang abzuschließen.',
                    icon: ScanBarcode,
                    isPrimary: false,
                  },
                ]
                  .filter(goal => goal.isPrimary || showMoreConversionGoals)
                  .map(goal => {
                    const IconComponent = goal.icon;
                    const isSelected = selectedConversionGoals.includes(goal.id);
                    return (
                      <div
                        key={goal.id}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            // Deselect the goal
                            setSelectedConversionGoals([]);
                          } else {
                            // Select only this goal
                            setSelectedConversionGoals([goal.id]);
                          }
                        }}
                      >
                        <div className="flex items-start gap-4 w-full">
                          <IconComponent className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
                          <div className="flex-1">
                            <h3
                              className={`font-semibold text-base mb-1 ${
                                isSelected ? 'text-[#14ad9f]' : 'text-gray-900'
                              }`}
                            >
                              {goal.title}
                            </h3>
                            <p className="text-sm text-gray-600">{goal.description}</p>

                            {/* Render badges for selected events */}
                            {isSelected &&
                              conversionGoalConfigs[goal.id]?.events &&
                              conversionGoalConfigs[goal.id].events.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {conversionGoalConfigs[goal.id].events.map((event: string) => (
                                    <span
                                      key={event}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                    >
                                      {event}
                                    </span>
                                  ))}
                                </div>
                              )}

                            {/* Edit button for configurable goals */}
                            {isSelected &&
                              (goal.id === 'subscribe' ||
                                goal.id === 'add_to_cart' ||
                                goal.id === 'purchase' ||
                                goal.id === 'begin_checkout') && (
                                <div className="mt-3">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSelectedGoalForSetup(goal.id);
                                      setShowConversionSetupModal(true);
                                    }}
                                    className="flex items-center gap-1.5 text-sm font-medium text-[#14ad9f] hover:text-[#12998d] transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Bearbeiten
                                  </button>
                                </div>
                              )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-[#14ad9f] bg-[#14ad9f]' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Show More/Less Link */}
                <button
                  onClick={() => setShowMoreConversionGoals(!showMoreConversionGoals)}
                  className="text-sm text-blue-600 hover:underline font-medium transition-colors"
                >
                  {showMoreConversionGoals ? 'Weniger' : 'Mehr'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Demand Gen Introduction */}
        {selectedCampaignType === 'demand-gen' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <p className="text-gray-600 leading-relaxed">
                  Engagement und Aktionen können auf YouTube, YouTube Shorts, in Discover und Gmail
                  mit Demand Gen-Kampagnen erfasst werden. Sie sind ideal für Werbetreibende in den
                  sozialen Netzwerken, die visuell ansprechende, mehrformatige Anzeigen auf den
                  potentesten Plattformen von Google schalten möchten.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Conversions */}
        {selectedCampaignType === 'search' && selectedConversionGoals.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Erweiterte Conversions für Konto aktivieren
                </h2>
                <p className="text-gray-600">
                  Bei der Funktion „Erweiterte Conversions“ werden automatisch Daten erkannt und
                  verwendet, die Kunden auf Ihrer Website hinterlassen (z. B. E-Mail-Adressen). Sie
                  können genutzt werden, um bessere Analysen zu erhalten und Ihre Kampagne zu
                  optimieren. Diese Einstellung gilt für alle infrage kommenden Conversions in Ihrem
                  Konto.{' '}
                  <a
                    href="https://support.google.com/google-ads/answer/14170725?hl=de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 inline-flex items-center"
                  >
                    Weitere Informationen zu erweiterten Conversions
                    <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                      <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path>
                    </svg>
                  </a>
                </p>
              </div>

              <div className="space-y-4">
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setEnhancedConversionsEnabled(!enhancedConversionsEnabled)}
                >
                  <div
                    className={`w-5 h-5 mt-0.5 flex items-center justify-center rounded border transition-colors ${
                      enhancedConversionsEnabled
                        ? 'bg-[#14ad9f] border-[#14ad9f] text-white'
                        : 'border-gray-400 bg-white'
                    }`}
                  >
                    {enhancedConversionsEnabled && <Check className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-gray-900 font-medium">
                      Erweiterte Conversions aktivieren
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                  Mit einem Klick auf „Zustimmen und fortfahren“ bestätigen Sie, dass Sie die{' '}
                  <a
                    href="https://support.google.com/adspolicy/answer/7475709?hl=de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Richtlinien von Google
                  </a>{' '}
                  einhalten. Sie beauftragen Google, Ihre Daten wie im{' '}
                  <a
                    href="https://support.google.com/adspolicy/answer/9755941?hl=de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Artikel zur Google-Richtlinie zur Anzeigenausrichtung
                  </a>{' '}
                  beschrieben, zu verarbeiten. Für erweiterte Conversions gelten die{' '}
                  <a
                    href="https://privacy.google.com/businesses/processorterms/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Datenverarbeitungsbedingungen für Google Ads
                  </a>
                  .
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kampagnenname */}
        {((selectedObjective &&
          selectedCampaignType &&
          selectedCampaignType !== 'video' &&
          selectedCampaignType !== 'display') ||
          (selectedObjective === 'AWARENESS_AND_CONSIDERATION' && selectedAwarenessSubtype) ||
          (selectedObjective === 'LOCAL_STORE_VISITS' &&
            selectedCampaignType === 'performance-max-local' &&
            selectedLocalBusinessType &&
            selectedLocalGoal)) && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Kampagnenname</h2>
              </div>

              <div className="campaign-name-input">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Kampagnenname eingeben"
                    aria-label="Kampagnenname"
                    aria-required="true"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business Data Summary (if available) */}
        {businessData.businessName &&
          selectedCampaignType !== 'video' &&
          selectedCampaignType !== 'display' &&
          selectedCampaignType !== 'shopping' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-blue-100 rounded">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Unternehmensdaten</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>
                      <strong>Unternehmen:</strong> {businessData.businessName}
                    </p>
                    {businessData.websiteUrl && (
                      <p>
                        <strong>Website:</strong> {businessData.websiteUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Zurück
          </Button>

          <Button
            onClick={handleContinue}
            className="bg-[#14ad9f] hover:bg-[#129a8f] text-white px-6"
            disabled={
              !selectedObjective ||
              ((selectedObjective === 'SALES' ||
                selectedObjective === 'LEADS' ||
                selectedObjective === 'WEBSITE_TRAFFIC') &&
                !selectedCampaignType) ||
              (selectedObjective === 'APP_DOWNLOADS' &&
                selectedAppSubtype !== 'app-pre-registration' &&
                (!selectedCampaignType || !selectedAppSubtype || !selectedAppPlatform)) ||
              (selectedObjective === 'APP_DOWNLOADS' &&
                selectedAppSubtype === 'app-pre-registration' &&
                (!selectedCampaignType || !selectedAppSubtype)) ||
              (selectedObjective === 'AWARENESS_AND_CONSIDERATION' && !selectedAwarenessSubtype) ||
              (selectedObjective === 'LOCAL_STORE_VISITS' &&
                (!selectedCampaignType || !selectedLocalBusinessType || !selectedLocalGoal))
            }
          >
            Weiter
          </Button>
        </div>

        {/* Google Business Profile Status */}
        {googleBusinessError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-800">{googleBusinessError}</p>
            </div>
          </div>
        )}

        {/* Location Selection Modal */}
        <LocationSelectionModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onContinue={async () => {
            setShowLocationModal(false);
            await handleConnectGoogleBusiness();
          }}
          googleBusinessAccounts={googleBusinessAccounts}
        />

        {/* Affiliate Location Modal */}
        <AffiliateLocationModal
          isOpen={showAffiliateModal}
          onClose={() => setShowAffiliateModal(false)}
          onContinue={async selectedItems => {
            try {
              console.log('✅ Ausgewählte Affiliate-Standorte:', selectedItems);

              const summary = AffiliateLocationService.createSummary(selectedItems);
              console.log(`📊 Zusammenfassung:
              - ${selectedItems.length} Handelsketten ausgewählt
              - ${summary.totalLocations.toLocaleString()} Standorte insgesamt
              - ${summary.countries.length} Länder: ${summary.countries.join(', ')}
              - Top Ketten: ${summary.topChains.map(c => `${c.name} (${c.locations.toLocaleString()})`).join(', ')}`);

              // Speichere in Firestore
              const selectionId = await AffiliateLocationService.saveAffiliateSelection(
                companyId,
                selectedItems
              );

              console.log('💾 Affiliate-Standorte gespeichert mit ID:', selectionId);

              // Konvertiere zu Google Ads Format für spätere Verwendung
              const googleAdsFormat = AffiliateLocationService.convertToGoogleAdsFormat({
                id: selectionId,
                companyId,
                selectedChains: selectedItems.map(item => ({
                  chainId: item.chainId!,
                  chainName: item.chainName!,
                  placeId: item.placeId!,
                  countryId: item.countryId,
                  countryName: item.countryName,
                  countryCode: item.countryId || 'XX',
                  locationCount: item.locationCount,
                  category: item.category || 'retail',
                })),
                totalLocations: summary.totalLocations,
                countries: summary.countries,
                createdAt: new Date() as any,
                updatedAt: new Date() as any,
              });

              console.log('🎯 Google Ads Format:', googleAdsFormat);

              setShowAffiliateModal(false);

              // Optional: Zeige Erfolgsmeldung
              alert(
                `✅ ${selectedItems.length} Handelsketten mit ${summary.totalLocations.toLocaleString()} Standorten erfolgreich ausgewählt!`
              );
            } catch (error) {
              console.error('❌ Fehler beim Verarbeiten der Affiliate-Standorte:', error);
              alert('❌ Fehler beim Speichern der Standorte. Bitte versuchen Sie es erneut.');
            }
          }}
        />

        {/* Conversion Setup Modal */}
        <ConversionSetupModal
          isOpen={showConversionSetupModal}
          onClose={() => setShowConversionSetupModal(false)}
          onApply={(setupMethod, config) => {
            console.log('Setup method:', setupMethod);
            console.log('Setup config:', config);

            // Save configuration for the goal
            if (config) {
              setConversionGoalConfigs(prev => ({
                ...prev,
                [selectedGoalForSetup]: {
                  method: setupMethod,
                  ...config,
                },
              }));
            }

            setSelectedConversionGoals([selectedGoalForSetup]);
            setShowConversionSetupModal(false);
          }}
          goalType={selectedGoalForSetup}
        />

        {/* Merchant Center Creation Modal (for Shopping Campaigns) */}
        <MerchantCenterCreationModal
          isOpen={showMerchantCenterModal}
          onClose={() => setShowMerchantCenterModal(false)}
          onSave={async data => {
            console.log('Creating Merchant Center Account:', data);

            try {
              const response = await fetch('/api/merchant-center/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  companyId,
                  ...data,
                }),
              });

              const result = await response.json();

              if (result.success) {
                setShowMerchantCenterModal(false);
                showSuccess('Merchant Center-Konto erstellt und verknüpft!');
              } else {
                if (result.error === 'REQUIRES_REAUTH') {
                  if (
                    confirm(
                      'Neue Berechtigungen erforderlich: Um ein Merchant Center Konto zu erstellen, müssen Sie Taskilo zusätzliche Rechte gewähren. Möchten Sie die Berechtigungen jetzt aktualisieren?'
                    )
                  ) {
                    handleGoogleAdsReauth();
                  }
                } else if (result.error === 'NO_MCA_FOUND') {
                  alert(
                    'Wir konnten kein Unterkonto erstellen. Bitte erstellen Sie ein Merchant Center-Konto manuell unter merchants.google.com.'
                  );
                } else {
                  alert('Fehler: ' + (result.message || result.error));
                }
              }
            } catch (error) {
              console.error('Error:', error);
              alert('Ein unerwarteter Fehler ist aufgetreten.');
            }
          }}
          initialBusinessName={businessData.businessName}
          initialWebsiteUrl={businessData.websiteUrl}
        />
      </div>
    </div>
  );
}
