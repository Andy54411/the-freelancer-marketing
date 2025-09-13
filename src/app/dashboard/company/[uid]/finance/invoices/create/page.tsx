'use client';

import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ModalCard,
  ModalCardHeader,
  ModalCardTitle,
  ModalCardDescription,
  ModalCardContent,
  ModalCardSection,
  ModalCardActions,
} from '@/components/ui/modal-card';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calculator,
  FileText,
  Loader2,
  Eye,
  MoreVertical,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { InvoicePreview } from '@/components/finance/InvoicePreview';
import DocumentPreviewFrame from '@/components/templates/preview/DocumentPreviewFrame';
import ProfessionalBusinessTemplate from '@/components/templates/invoice-templates/ProfessionalBusinessTemplate';
import { InvoiceData } from '@/types/invoiceTypes';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAuth } from '@/contexts/AuthContext';
import { findOrCreateCustomer } from '@/utils/customerUtils';
// API Imports statt Firebase
import {
  getCompanyData,
  getCustomers,
  createInvoice,
  handleApiError,
} from '@/utils/api/companyApi';

interface Customer {
  id: string;
  customerNumber?: string;
  name: string;
  email: string;
  phone?: string;
  // Legacy address für Kompatibilität
  address?: string;
  // Strukturierte Adresse
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxNumber?: string;
  vatId?: string;
  vatValidated?: boolean;
  totalInvoices?: number;
  totalAmount?: number;
  createdAt?: string;
  contactPersons?: any[];
  companyId?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number; // Rabatt in Prozent (0-100)
  total: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Load company settings
  const {
    settings: companySettings,
    loading: companyLoading,
    error: companyError,
  } = useCompanySettings(uid);

  // Load company data and template via API instead of direct Firebase
  useEffect(() => {
    const loadCompanyDataAndTemplate = async () => {
      if (!uid) return;

      try {
        // Load Company data via API
        const response = await getCompanyData(uid);
        if (response.success && response.company) {
          const companyData = response.company;
          setFullCompanyData(companyData);

          // Prüfe Kleinunternehmer-Status aus der Datenbank
          const isKleinunternehmer =
            companyData.kleinunternehmer === 'ja' || companyData.step2?.kleinunternehmer === 'ja';

          // Prüfe ob die Company aus dem Ausland ist
          const companyCountry =
            companyData.companyCountry || companyData.step1?.personalCountry || '';
          const isGermanCompany =
            !companyCountry ||
            companyCountry.toUpperCase() === 'DE' ||
            companyCountry.toUpperCase() === 'DEUTSCHLAND' ||
            companyCountry.toUpperCase() === 'GERMANY';

          if (isKleinunternehmer) {
            setFormData(prev => ({
              ...prev,
              taxNote: 'kleinunternehmer',
              taxRate: '0',
            }));
          } else if (!isGermanCompany) {
            // Ausländische Company stellt Rechnung an deutsche Kunden
            setFormData(prev => ({
              ...prev,
              taxNote: 'reverse-charge',
              taxRate: '0',
            }));
          }
        }
      } catch (error) {
        toast.error('Fehler beim Laden der Firmendaten');
      }
    };

    loadCompanyDataAndTemplate();
  }, [uid]);

  // State für echte Kunden
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [fullCompanyData, setFullCompanyData] = useState<any>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    customerVatId: '', // VAT-ID des Kunden
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    description: '',
    taxRate: '19', // Standard German VAT
    taxNote: 'none', // Standard: Kein Steuerhinweis
    notes: '',
    paymentTerms: '', // Zahlungskonditionen
    // Skonto-Felder hinzufügen
    skontoEnabled: false,
    skontoDays: 3,
    skontoPercentage: 2.0,
    skontoText: '', // Text für Skonto-Bedingungen
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEInvoiceEnabled, setIsEInvoiceEnabled] = useState(false);
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [modalFormData, setModalFormData] = useState({
    companyName: '',
    companyStreet: '',
    companyCity: '',
    companyPostalCode: '',
    companyCountry: '',
    taxNumber: '',
    vatId: '',
    registrationNumber: '',
    iban: '',
    bic: '',
    contactEmail: '',
  });

  // Auto-fill modalFormData mit verfügbaren Firmendaten
  useEffect(() => {
    if (fullCompanyData && showEInvoiceModal) {
      setModalFormData(prev => ({
        ...prev,
        companyName: fullCompanyData.companyName || prev.companyName,
        companyStreet: fullCompanyData.companyStreet || prev.companyStreet,
        companyCity: fullCompanyData.companyCity || prev.companyCity,
        companyPostalCode: fullCompanyData.companyPostalCode || prev.companyPostalCode,
        companyCountry: fullCompanyData.companyCountry || prev.companyCountry,
        taxNumber: fullCompanyData.taxNumber || prev.taxNumber,
        vatId: fullCompanyData.vatId || prev.vatId,
        registrationNumber: fullCompanyData.registrationNumber || prev.registrationNumber,
        iban: fullCompanyData.bankDetails?.iban || prev.iban,
        bic: fullCompanyData.bankDetails?.bic || prev.bic,
        contactEmail:
          fullCompanyData.contactEmail ||
          fullCompanyData.email ||
          fullCompanyData.step1?.email ||
          prev.contactEmail,
      }));
    }
  }, [fullCompanyData, showEInvoiceModal]);

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_1',
      description: 'Leistung',
      quantity: 1,
      unitPrice: 50,
      discount: 0,
      total: 50,
    },
  ]);

  // Load customers via API instead of direct Firebase
  useEffect(() => {
    const loadCustomers = async () => {
      if (!uid || !user || user.uid !== uid) return;

      try {
        setLoadingCustomers(true);
        // Load customers via API
        const response = await getCustomers(uid);
        if (response.success && response.customers) {
          setCustomers(response.customers);
        }
      } catch (error) {
        toast.error('Fehler beim Laden der Kunden');
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, [uid, user]);

  // Lade Projektdaten aus URL-Parametern und fülle Formular vor
  useEffect(() => {
    if (!searchParams) return;

    const projectParam = searchParams.get('project');
    if (projectParam) {
      try {
        const projectData = JSON.parse(projectParam);

        // Fülle Formular mit Projektdaten vor
        setFormData(prev => ({
          ...prev,
          customerName: projectData.client || prev.customerName,
          description: `Rechnung für Projekt: ${projectData.projectName}${projectData.description ? `\n\n${projectData.description}` : ''}`,
        }));

        // Erstelle Items basierend auf den erfassten Stunden
        if (projectData.dailyLineItems && projectData.dailyLineItems.length > 0) {
          // Verwende tagesweise Aufschlüsselung
          const projectItems: InvoiceItem[] = projectData.dailyLineItems.map(
            (dayItem: any, index: number) => ({
              id: `day_${index}`,
              description: dayItem.description, // Format: "2025-01-19: Projektname (8.5h)"
              quantity: dayItem.hours,
              unitPrice: dayItem.hourlyRate,
              discount: 0,
              total: dayItem.amount,
            })
          );

          setItems(projectItems);
        } else if (projectData.totalHours > 0 && projectData.hourlyRate > 0) {
          // Fallback für alte Projektdaten ohne dailyLineItems
          const projectItems: InvoiceItem[] = [
            {
              id: 'project_hours',
              description: `Projektarbeit: ${projectData.projectName}`,
              quantity: projectData.totalHours,
              unitPrice: projectData.hourlyRate,
              discount: 0,
              total: projectData.revenue,
            },
          ];

          // Füge detaillierte Zeiteinträge hinzu, falls verfügbar
          if (projectData.timeEntries && projectData.timeEntries.length > 0) {
            const timeEntriesDescription = projectData.timeEntries
              .map(
                (entry: any) =>
                  `${entry.date}: ${entry.description} (${Math.round((entry.duration / 60) * 100) / 100}h)`
              )
              .join('\n');

            projectItems[0].description += `\n\nDetaillierte Zeiterfassung:\n${timeEntriesDescription}`;
          }

          setItems(projectItems);
        }
      } catch (error) {
        toast.error('Fehler beim Laden der Projektdaten');
      }
    }
  }, [searchParams]);

  // Initialize payment terms from company settings when component loads
  React.useEffect(() => {
    if (companySettings && companySettings.defaultPaymentTerms && !formData.paymentTerms) {
      const paymentDays = companySettings.defaultPaymentTerms.days || 14;
      const paymentText =
        companySettings.defaultPaymentTerms.text ||
        `Zahlbar binnen ${paymentDays} Tagen ohne Abzug`;
      const skontoEnabled = companySettings.defaultPaymentTerms.skontoEnabled || false;
      const skontoDays = companySettings.defaultPaymentTerms.skontoDays || 3;
      const skontoPercentage = companySettings.defaultPaymentTerms.skontoPercentage || 2.0;

      setFormData(prev => ({
        ...prev,
        paymentTerms: paymentText,
        skontoEnabled: skontoEnabled,
        skontoDays: skontoDays,
        skontoPercentage: skontoPercentage,
        skontoText: skontoEnabled
          ? `${skontoPercentage}% Skonto bei Zahlung binnen ${skontoDays} Tagen`
          : '',
      }));
    }
  }, [companySettings]);

  // Auto-generate invoice number only when finalizing (not for drafts)
  React.useEffect(() => {
    // Keine automatische Generierung der Rechnungsnummer für Entwürfe
    // Die Nummer wird erst beim Finalisieren erstellt
  }, [uid]); // Entferne die automatische Generierung komplett
  // Auto-set due date und payment terms basierend auf Company Settings
  React.useEffect(() => {
    if (companySettings && formData.issueDate) {
      const issueDate = new Date(formData.issueDate);
      const paymentDays = companySettings.defaultPaymentTerms?.days || 14;

      // Set payment terms if empty, default, or different from company settings
      const isDefaultPaymentTerms =
        !formData.paymentTerms ||
        formData.paymentTerms === '' ||
        (formData.paymentTerms.includes('Zahlbar binnen') &&
          formData.paymentTerms.includes('Tagen ohne Abzug')) ||
        formData.paymentTerms === 'Zahlbar binnen 14 Tagen ohne Abzug';

      if (isDefaultPaymentTerms) {
        const paymentText =
          companySettings.defaultPaymentTerms?.text ||
          `Zahlbar binnen ${paymentDays} Tagen ohne Abzug`;

        const skontoEnabled = companySettings.defaultPaymentTerms?.skontoEnabled || false;
        const skontoDays = companySettings.defaultPaymentTerms?.skontoDays || 3;
        const skontoPercentage = companySettings.defaultPaymentTerms?.skontoPercentage || 2.0;

        setFormData(prev => ({
          ...prev,
          paymentTerms: paymentText,
          skontoEnabled: skontoEnabled,
          skontoDays: skontoDays,
          skontoPercentage: skontoPercentage,
          skontoText: skontoEnabled
            ? `${skontoPercentage}% Skonto bei Zahlung binnen ${skontoDays} Tagen`
            : '',
          // Only update due date if not already set
          dueDate:
            prev.dueDate ||
            new Date(issueDate.getTime() + paymentDays * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
        }));
      }
    }
  }, [formData.issueDate, companySettings]);

  // Sicherheitsprüfung: Nur der Owner kann Rechnungen erstellen
  if (!user || user.uid !== uid) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 p-8 bg-gray-50">
          <h1 className="text-2xl font-bold mb-6">Nicht berechtigt</h1>
          <p className="text-gray-600">
            Sie sind nicht berechtigt, Rechnungen für diese Firma zu erstellen.
          </p>
        </div>
      </div>
    );
  }

  // Hilfsfunktion zur Erkennung von ausländischen Unternehmen für Reverse-Charge
  const isReverseChargeApplicable = (
    customer: Customer,
    customerVatId: string,
    companyData?: any
  ) => {
    // Prüfe zuerst ob die Company selbst aus dem Ausland ist
    if (companyData) {
      const companyCountry = companyData.companyCountry || companyData.step1?.personalCountry || '';
      const isGermanCompany =
        !companyCountry ||
        companyCountry.toUpperCase() === 'DE' ||
        companyCountry.toUpperCase() === 'DEUTSCHLAND' ||
        companyCountry.toUpperCase() === 'GERMANY';

      // Wenn ausländische Company, immer Reverse-Charge für deutsche Kunden
      if (!isGermanCompany) {
        return true;
      }
    }

    // Dann prüfe anhand der VAT-ID ob es ein ausländisches Unternehmen als Kunde ist
    if (customerVatId && customerVatId.trim() !== '') {
      const vatPrefix = customerVatId.substring(0, 2).toUpperCase();
      // Deutsche VAT-ID beginnt mit DE
      const isGermanVat = vatPrefix === 'DE';

      // Alle EU-Länder-Codes (ohne Deutschland) - für EU-Reverse-Charge
      const euCountryCodes = [
        'AT',
        'BE',
        'BG',
        'HR',
        'CY',
        'CZ',
        'DK',
        'EE',
        'FI',
        'FR',
        'GR',
        'HU',
        'IE',
        'IT',
        'LV',
        'LT',
        'LU',
        'MT',
        'NL',
        'PL',
        'PT',
        'RO',
        'SK',
        'SI',
        'ES',
        'SE',
      ];

      // Alle internationalen Länder-Codes (Auswahl der wichtigsten)
      const internationalCountryCodes = [
        'US',
        'CA',
        'GB',
        'CH',
        'NO',
        'AU',
        'NZ',
        'JP',
        'KR',
        'CN',
        'IN',
        'SG',
        'HK',
        'BR',
        'MX',
        'AR',
        'CL',
        'ZA',
        'IL',
        'TR',
        'RU',
        'UA',
        'BY',
        'MD',
        'RS',
        'BA',
        'ME',
        'MK',
        'AL',
        'XK',
      ];

      const isEUVat = euCountryCodes.includes(vatPrefix);
      const isInternationalVat = internationalCountryCodes.includes(vatPrefix);

      // Reverse-Charge gilt für alle ausländischen Unternehmen (EU + International) mit gültiger VAT-ID/Tax-ID
      return !isGermanVat && (isEUVat || isInternationalVat);
    }

    // Prüfe anhand der Adresse/Land - ALLE Länder außer Deutschland
    const customerCountry = customer.country?.toUpperCase().trim();
    if (
      customerCountry &&
      customerCountry !== '' &&
      customerCountry !== 'DE' &&
      customerCountry !== 'DEUTSCHLAND' &&
      customerCountry !== 'GERMANY'
    ) {
      // Umfassende Liste aller Länder (Auswahl der wichtigsten + alle EU)
      const allForeignCountries = [
        // EU-Länder
        'AT',
        'AUSTRIA',
        'ÖSTERREICH',
        'BE',
        'BELGIUM',
        'BELGIEN',
        'BG',
        'BULGARIA',
        'BULGARIEN',
        'HR',
        'CROATIA',
        'KROATIEN',
        'CY',
        'CYPRUS',
        'ZYPERN',
        'CZ',
        'CZECH REPUBLIC',
        'TSCHECHIEN',
        'CZECHIA',
        'DK',
        'DENMARK',
        'DÄNEMARK',
        'EE',
        'ESTONIA',
        'ESTLAND',
        'FI',
        'FINLAND',
        'FINNLAND',
        'FR',
        'FRANCE',
        'FRANKREICH',
        'GR',
        'GREECE',
        'GRIECHENLAND',
        'HU',
        'HUNGARY',
        'UNGARN',
        'IE',
        'IRELAND',
        'IRLAND',
        'IT',
        'ITALY',
        'ITALIEN',
        'LV',
        'LATVIA',
        'LETTLAND',
        'LT',
        'LITHUANIA',
        'LITAUEN',
        'LU',
        'LUXEMBOURG',
        'LUXEMBURG',
        'MT',
        'MALTA',
        'NL',
        'NETHERLANDS',
        'NIEDERLANDE',
        'HOLLAND',
        'PL',
        'POLAND',
        'POLEN',
        'PT',
        'PORTUGAL',
        'RO',
        'ROMANIA',
        'RUMÄNIEN',
        'SK',
        'SLOVAKIA',
        'SLOWAKEI',
        'SI',
        'SLOVENIA',
        'SLOWENIEN',
        'ES',
        'SPAIN',
        'SPANIEN',
        'SE',
        'SWEDEN',
        'SCHWEDEN',

        // Weitere europäische Länder
        'GB',
        'UK',
        'UNITED KINGDOM',
        'VEREINIGTES KÖNIGREICH',
        'ENGLAND',
        'BRITAIN',
        'CH',
        'SWITZERLAND',
        'SCHWEIZ',
        'NO',
        'NORWAY',
        'NORWEGEN',
        'IS',
        'ICELAND',
        'ISLAND',
        'LI',
        'LIECHTENSTEIN',
        'MC',
        'MONACO',
        'AD',
        'ANDORRA',
        'SM',
        'SAN MARINO',
        'VA',
        'VATICAN',
        'VATIKAN',
        'RS',
        'SERBIA',
        'SERBIEN',
        'BA',
        'BOSNIA',
        'BOSNIEN',
        'ME',
        'MONTENEGRO',
        'MK',
        'MACEDONIA',
        'MAZEDONIEN',
        'AL',
        'ALBANIA',
        'ALBANIEN',
        'XK',
        'KOSOVO',
        'MD',
        'MOLDOVA',
        'UA',
        'UKRAINE',
        'BY',
        'BELARUS',
        'WEISSRUSSLAND',
        'RU',
        'RUSSIA',
        'RUSSLAND',
        'TR',
        'TURKEY',
        'TÜRKEI',

        // Nordamerika
        'US',
        'USA',
        'UNITED STATES',
        'VEREINIGTE STAATEN',
        'AMERICA',
        'CA',
        'CANADA',
        'KANADA',
        'MX',
        'MEXICO',
        'MEXIKO',

        // Südamerika
        'BR',
        'BRAZIL',
        'BRASILIEN',
        'AR',
        'ARGENTINA',
        'ARGENTINIEN',
        'CL',
        'CHILE',
        'CO',
        'COLOMBIA',
        'KOLUMBIEN',
        'PE',
        'PERU',
        'VE',
        'VENEZUELA',
        'UY',
        'URUGUAY',
        'PY',
        'PARAGUAY',
        'BO',
        'BOLIVIA',
        'BOLIVIEN',
        'EC',
        'ECUADOR',
        'GY',
        'GUYANA',
        'SR',
        'SURINAME',

        // Asien
        'CN',
        'CHINA',
        'JP',
        'JAPAN',
        'KR',
        'KOREA',
        'SOUTH KOREA',
        'SÜDKOREA',
        'IN',
        'INDIA',
        'INDIEN',
        'SG',
        'SINGAPORE',
        'SINGAPUR',
        'HK',
        'HONG KONG',
        'HONGKONG',
        'TW',
        'TAIWAN',
        'TH',
        'THAILAND',
        'VN',
        'VIETNAM',
        'MY',
        'MALAYSIA',
        'ID',
        'INDONESIA',
        'INDONESIEN',
        'PH',
        'PHILIPPINES',
        'PHILIPPINEN',
        'BD',
        'BANGLADESH',
        'PK',
        'PAKISTAN',
        'AF',
        'AFGHANISTAN',
        'IR',
        'IRAN',
        'IQ',
        'IRAQ',
        'IRAK',
        'IL',
        'ISRAEL',
        'JO',
        'JORDAN',
        'JORDANIEN',
        'LB',
        'LEBANON',
        'LIBANON',
        'SY',
        'SYRIA',
        'SYRIEN',
        'SA',
        'SAUDI ARABIA',
        'SAUDI-ARABIEN',
        'AE',
        'UAE',
        'UNITED ARAB EMIRATES',
        'VEREINIGTE ARABISCHE EMIRATE',
        'QA',
        'QATAR',
        'KATAR',
        'KW',
        'KUWAIT',
        'BH',
        'BAHRAIN',
        'OM',
        'OMAN',
        'YE',
        'YEMEN',
        'JEMEN',
        'UZ',
        'UZBEKISTAN',
        'USBEKISTAN',
        'KZ',
        'KAZAKHSTAN',
        'KASACHSTAN',
        'KG',
        'KYRGYZSTAN',
        'KIRGISISTAN',
        'TJ',
        'TAJIKISTAN',
        'TADSCHIKISTAN',
        'TM',
        'TURKMENISTAN',
        'MN',
        'MONGOLIA',
        'MONGOLEI',

        // Afrika
        'ZA',
        'SOUTH AFRICA',
        'SÜDAFRIKA',
        'EG',
        'EGYPT',
        'ÄGYPTEN',
        'NG',
        'NIGERIA',
        'KE',
        'KENYA',
        'KENIA',
        'GH',
        'GHANA',
        'ET',
        'ETHIOPIA',
        'ÄTHIOPIEN',
        'MA',
        'MOROCCO',
        'MAROKKO',
        'DZ',
        'ALGERIA',
        'ALGERIEN',
        'TN',
        'TUNISIA',
        'TUNESIEN',
        'LY',
        'LIBYA',
        'LIBYEN',
        'SD',
        'SUDAN',
        'UG',
        'UGANDA',
        'TZ',
        'TANZANIA',
        'TANSANIA',
        'ZW',
        'ZIMBABWE',
        'SIMBABWE',
        'ZM',
        'ZAMBIA',
        'SAMBIA',
        'BW',
        'BOTSWANA',
        'BOTSUANA',
        'NA',
        'NAMIBIA',
        'SZ',
        'SWAZILAND',
        'ESWATINI',
        'LS',
        'LESOTHO',
        'MW',
        'MALAWI',
        'MZ',
        'MOZAMBIQUE',
        'MOSAMBIK',
        'AO',
        'ANGOLA',
        'CD',
        'CONGO',
        'KONGO',
        'CM',
        'CAMEROON',
        'KAMERUN',
        'CI',
        'IVORY COAST',
        'ELFENBEINKÜSTE',
        'SN',
        'SENEGAL',
        'ML',
        'MALI',
        'BF',
        'BURKINA FASO',
        'NE',
        'NIGER',
        'TD',
        'CHAD',
        'TSCHAD',
        'CF',
        'CENTRAL AFRICAN REPUBLIC',
        'ZENTRALAFRIKANISCHE REPUBLIK',
        'GA',
        'GABON',
        'GABUN',
        'GQ',
        'EQUATORIAL GUINEA',
        'ÄQUATORIALGUINEA',
        'ST',
        'SAO TOME',
        'SAO TOME UND PRINCIPE',
        'CV',
        'CAPE VERDE',
        'KAPVERDEN',
        'GM',
        'GAMBIA',
        'GW',
        'GUINEA-BISSAU',
        'GN',
        'GUINEA',
        'SL',
        'SIERRA LEONE',
        'LR',
        'LIBERIA',
        'TG',
        'TOGO',
        'BJ',
        'BENIN',
        'DJ',
        'DJIBOUTI',
        'DSCHIBUTI',
        'ER',
        'ERITREA',
        'SO',
        'SOMALIA',
        'SC',
        'SEYCHELLES',
        'SEYCHELLEN',
        'MU',
        'MAURITIUS',
        'MG',
        'MADAGASCAR',
        'MADAGASKAR',
        'KM',
        'COMOROS',
        'KOMOREN',
        'YT',
        'MAYOTTE',
        'RE',
        'REUNION',
        'RÉUNION',

        // Ozeanien
        'AU',
        'AUSTRALIA',
        'AUSTRALIEN',
        'NZ',
        'NEW ZEALAND',
        'NEUSEELAND',
        'FJ',
        'FIJI',
        'FIDSCHI',
        'PG',
        'PAPUA NEW GUINEA',
        'PAPUA-NEUGUINEA',
        'NC',
        'NEW CALEDONIA',
        'NEUKALEDONIEN',
        'PF',
        'FRENCH POLYNESIA',
        'FRANZÖSISCH-POLYNESIEN',
        'WS',
        'SAMOA',
        'TO',
        'TONGA',
        'VU',
        'VANUATU',
        'SB',
        'SOLOMON ISLANDS',
        'SALOMONEN',
        'FM',
        'MICRONESIA',
        'MIKRONESIEN',
        'MH',
        'MARSHALL ISLANDS',
        'MARSHALLINSELN',
        'PW',
        'PALAU',
        'NR',
        'NAURU',
        'KI',
        'KIRIBATI',
        'TV',
        'TUVALU',
        'CK',
        'COOK ISLANDS',
        'COOKINSELN',
        'NU',
        'NIUE',
        'TK',
        'TOKELAU',
        'AS',
        'AMERICAN SAMOA',
        'AMERIKANISCH-SAMOA',
        'GU',
        'GUAM',
        'MP',
        'NORTHERN MARIANA ISLANDS',
        'NÖRDLICHE MARIANEN',
      ];

      return allForeignCountries.includes(customerCountry);
    }

    return false;
  };

  const handleCustomerSelect = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    if (customer) {
      // Erstelle Adresse aus strukturierten Feldern oder verwende Legacy-Adresse
      const customerAddress =
        customer.street || customer.city || customer.postalCode || customer.country
          ? `${customer.street || ''}${customer.street ? '\n' : ''}${customer.postalCode || ''} ${customer.city || ''}${customer.city && customer.country ? '\n' : ''}${customer.country || ''}`
          : customer.address || '';

      const customerVatId = customer.vatId || '';

      // Prüfe Reverse-Charge-Anwendbarkeit
      const shouldApplyReverseCharge = isReverseChargeApplicable(
        customer,
        customerVatId,
        fullCompanyData
      );

      setFormData(prev => ({
        ...prev,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAddress: customerAddress,
        customerVatId: customerVatId,
        // Automatisch Reverse-Charge setzen wenn EU-Ausland erkannt
        taxNote: shouldApplyReverseCharge ? 'reverse-charge' : prev.taxNote,
        // Bei Reverse-Charge Steuersatz auf 0% setzen
        taxRate: shouldApplyReverseCharge ? '0' : prev.taxRate,
      }));

      // Benutzer informieren wenn Reverse-Charge automatisch gesetzt wurde
      if (shouldApplyReverseCharge) {
        toast.info(
          'Reverse-Charge-Verfahren erkannt: EU-Auslandsgeschäft mit Unternehmen. Steuersatz automatisch auf 0% gesetzt.'
        );
      }
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate total if quantity, unitPrice, or discount changed
          if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
            const baseTotal = updatedItem.quantity * updatedItem.unitPrice;
            const discountAmount = (baseTotal * updatedItem.discount) / 100;
            updatedItem.total = baseTotal - discountAmount;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    // Use formData.taxRate for VAT calculation (user's selected rate)
    let tax = 0;
    let total = subtotal;

    if (companySettings?.ust !== 'kleinunternehmer') {
      const taxRate = parseFloat(formData.taxRate || '19') / 100;
      tax = subtotal * taxRate;
      total = subtotal + tax;
    }

    return { subtotal, tax, total };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Funktion zum Prüfen ob eine Rechnungsnummer bereits existiert
  const checkInvoiceNumberExists = async (invoiceNumber: string): Promise<boolean> => {
    try {
      const allInvoices = await FirestoreInvoiceService.getInvoicesByCompany(uid);
      const exists = allInvoices.some(
        invoice => invoice.invoiceNumber === invoiceNumber || invoice.number === invoiceNumber
      );

      return exists;
    } catch (error) {
      return false;
    }
  };

  // Funktion zum Generieren der nächsten Rechnungsnummer - nutzt den korrekten Service
  const generateNextInvoiceNumber = async () => {
    try {
      const { sequentialNumber, formattedNumber } =
        await FirestoreInvoiceService.getNextInvoiceNumber(uid);

      return { number: formattedNumber, sequentialNumber };
    } catch (error) {
      // Fallback
      const year = new Date().getFullYear();
      const randomNumber = Math.floor(Math.random() * 1000) + 1;
      const fallbackNumber = `R-${year}-${randomNumber.toString().padStart(3, '0')}`;
      return { number: fallbackNumber, sequentialNumber: randomNumber };
    }
  };

  const handleSubmit = async (e: React.FormEvent, action: 'draft' | 'finalize') => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.customerName || !formData.issueDate || !formData.dueDate) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        setIsSubmitting(false);
        return;
      }

      // Rechnungsnummer-Logik für finalisierte Rechnungen
      if (action === 'finalize') {
        // Prüfe ob bereits eine Rechnungsnummer vorhanden ist (bei Draft-Bearbeitung)
        if (!formData.invoiceNumber) {
          // Generiere neue Rechnungsnummer nur wenn keine vorhanden ist
        } else {
          // Prüfe ob die vorhandene Rechnungsnummer eindeutig ist
          const numberExists = await checkInvoiceNumberExists(formData.invoiceNumber);
          if (numberExists) {
            toast.error(
              `Rechnungsnummer ${formData.invoiceNumber} ist bereits vergeben. Bitte verwenden Sie eine andere Nummer.`
            );
            setIsSubmitting(false);
            return;
          }
        }
      }

      const hasValidItems = items.some(
        item => item.description && item.quantity > 0 && item.unitPrice > 0
      );
      if (!hasValidItems) {
        toast.error('Bitte fügen Sie mindestens eine gültige Position hinzu');
        setIsSubmitting(false);
        return;
      }

      // Bei Finalisierung Rechnungsnummer verwalten
      let finalInvoiceNumber = formData.invoiceNumber || '';
      let sequentialNumber: number | undefined;

      // Nur für finale Rechnungen eine echte Rechnungsnummer generieren (wenn nicht bereits vorhanden)
      if (action === 'finalize' && !finalInvoiceNumber) {
        const result = await generateNextInvoiceNumber();
        finalInvoiceNumber = result.number;
        sequentialNumber = result.sequentialNumber;
      } else if (action === 'finalize' && finalInvoiceNumber) {
      } else {
        // Für Entwürfe keine Rechnungsnummer setzen
      } // Create invoice via API instead of direct Firebase
      const invoiceData = {
        invoiceNumber: finalInvoiceNumber,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        customerVatId: formData.customerVatId,
        description: formData.description,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        items: items.filter(item => item.description && item.quantity > 0),
        taxRate: formData.taxRate,
        taxNote: formData.taxNote,
        notes: formData.notes,
        paymentTerms: formData.paymentTerms, // Zahlungskonditionen
        // Skonto-Daten für Speicherung
        skontoEnabled: formData.skontoEnabled,
        skontoDays: formData.skontoDays,
        skontoPercentage: formData.skontoPercentage,
        skontoText: formData.skontoText,
        status: action === 'finalize' ? 'finalized' : 'draft',
      };

      // Create invoice via API
      const response = await createInvoice(uid, invoiceData);

      if (response.success) {
        if (action === 'finalize') {
          toast.success(`Rechnung ${finalInvoiceNumber} erfolgreich erstellt!`);
        } else {
          toast.success('Entwurf erfolgreich gespeichert!');
        }

        // Redirect to invoice overview
        router.push(`/dashboard/company/${uid}/finance/invoices`);
      } else {
        throw new Error(response.error || 'Fehler beim Erstellen der Rechnung');
      }
    } catch (error) {
      handleApiError(error);

      // User-friendly error messages
      if (error.message.includes('Netzwerk')) {
        toast.error('Netzwerkfehler - bitte prüfen Sie Ihre Internetverbindung');
      } else if (error.message.includes('Berechtigung')) {
        toast.error('Berechtigung verweigert - bitte kontaktieren Sie den Support');
      } else {
        toast.error(error.message || 'Unbekannter Fehler beim Speichern der Rechnung');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // E-Rechnung Validierung
  const validateEInvoiceRequirements = () => {
    if (!fullCompanyData)
      return { valid: false, missing: ['Firmendaten nicht geladen'], missingFields: ['all'] };

    const missing: string[] = [];
    const missingFields: string[] = [];

    // Pflichtfelder für E-Rechnung prüfen
    if (!fullCompanyData.companyName) {
      missing.push('Firmenname');
      missingFields.push('companyName');
    }
    if (!fullCompanyData.companyStreet) {
      missing.push('Firmenadresse');
      missingFields.push('companyStreet');
    }
    if (!fullCompanyData.companyCity) {
      missing.push('Stadt');
      missingFields.push('companyCity');
    }
    if (!fullCompanyData.companyPostalCode) {
      missing.push('Postleitzahl');
      missingFields.push('companyPostalCode');
    }
    if (!fullCompanyData.companyCountry) {
      missing.push('Land');
      missingFields.push('companyCountry');
    }
    if (!fullCompanyData.taxNumber && !fullCompanyData.vatId) {
      missing.push('Steuernummer oder USt-IdNr.');
      missingFields.push('taxNumber', 'vatId');
    }
    if (!fullCompanyData.registrationNumber) {
      missing.push('Handelsregisternummer');
      missingFields.push('registrationNumber');
    }
    if (!fullCompanyData.bankDetails?.iban) {
      missing.push('IBAN');
      missingFields.push('iban');
    }
    if (!fullCompanyData.bankDetails?.bic) {
      missing.push('BIC');
      missingFields.push('bic');
    }
    if (!fullCompanyData.contactEmail && !fullCompanyData.email && !fullCompanyData.step1?.email) {
      missing.push('Kontakt E-Mail');
      missingFields.push('contactEmail');
    }

    return { valid: missing.length === 0, missing, missingFields };
  };

  // Prüft ob ein Feld fehlt und angezeigt werden soll
  const isFieldMissing = (fieldName: string) => {
    const validation = validateEInvoiceRequirements();
    return validation.missingFields.includes(fieldName);
  };

  const handleEInvoiceToggle = (checked: boolean) => {
    if (checked) {
      const validation = validateEInvoiceRequirements();
      if (!validation.valid) {
        // Befülle Modal-Form mit vorhandenen Daten
        if (fullCompanyData) {
          setModalFormData({
            companyName: fullCompanyData.companyName || '',
            companyStreet: fullCompanyData.companyStreet || '',
            companyCity: fullCompanyData.companyCity || '',
            companyPostalCode: fullCompanyData.companyPostalCode || '',
            companyCountry: fullCompanyData.companyCountry || '',
            taxNumber: fullCompanyData.taxNumber || '',
            vatId: fullCompanyData.vatId || '',
            registrationNumber: fullCompanyData.registrationNumber || '',
            iban: fullCompanyData.bankDetails?.iban || '',
            bic: fullCompanyData.bankDetails?.bic || '',
            contactEmail:
              fullCompanyData.contactEmail ||
              fullCompanyData.email ||
              fullCompanyData.step1?.email ||
              '',
          });
        }
        setShowEInvoiceModal(true);
        return; // Toggle bleibt deaktiviert
      }
    }
    setIsEInvoiceEnabled(checked);
  };

  const handleSaveEInvoiceData = async () => {
    try {
      setIsSubmitting(true);

      // Update company data via API
      const response = await fetch(`/api/companies/${uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: modalFormData.companyName,
          companyStreet: modalFormData.companyStreet,
          companyCity: modalFormData.companyCity,
          companyPostalCode: modalFormData.companyPostalCode,
          companyCountry: modalFormData.companyCountry,
          taxNumber: modalFormData.taxNumber,
          vatId: modalFormData.vatId,
          registrationNumber: modalFormData.registrationNumber,
          contactEmail: modalFormData.contactEmail,
          bankDetails: {
            ...fullCompanyData?.bankDetails,
            iban: modalFormData.iban,
            bic: modalFormData.bic,
          },
        }),
      });

      if (response.ok) {
        // Update local data
        setFullCompanyData(prev => ({
          ...prev,
          ...modalFormData,
          bankDetails: {
            ...prev?.bankDetails,
            iban: modalFormData.iban,
            bic: modalFormData.bic,
          },
        }));

        // Aktiviere E-Rechnung
        setIsEInvoiceEnabled(true);
        setShowEInvoiceModal(false);
        toast.success('Firmendaten gespeichert - E-Rechnung aktiviert!');
      } else {
        // Versuche, detaillierte Fehlermeldung zu erhalten
        let errorMessage = 'Fehler beim Speichern der Firmendaten';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Falls JSON parsing fehlschlägt, verwende Status Text
          errorMessage = `Server Error: ${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      // Zeige spezifische Fehlermeldung oder generische Nachricht
      const errorMessage =
        error instanceof Error ? error.message : 'Unbekannter Fehler beim Speichern';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToInvoices = () => {
    router.push(`/dashboard/company/${uid}/finance/invoices`);
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={handleBackToInvoices}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Rechnungen
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Neue Rechnung erstellen</h1>
            <p className="text-gray-600">
              Erstellen Sie eine professionelle Rechnung für Ihre Kunden.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            {/* E-Rechnung Toggle */}
            <div className="flex items-center space-x-3">
              <Label htmlFor="e-invoice-toggle" className="text-sm font-medium">
                E-Rechnung
              </Label>
              <Switch
                id="e-invoice-toggle"
                checked={isEInvoiceEnabled}
                onCheckedChange={handleEInvoiceToggle}
              />
            </div>

            <Button
              variant="outline"
              className="text-sm"
              onClick={e => handleSubmit(e as any, 'draft')}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Speichern
            </Button>

            <Button
              className="text-sm bg-[#14ad9f] hover:bg-[#129488]"
              onClick={e => handleSubmit(e as any, 'finalize')}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Speichern und aktivieren
            </Button>

            {/* Dropdown Menu für weitere Aktionen */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: Aufgabe erstellen Funktionalität
                    toast.info('Aufgabe erstellen - Coming Soon');
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Aufgabe erstellen
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm('Möchten Sie die Rechnung wirklich löschen?')) {
                      router.push(`/dashboard/company/${uid}/finance/invoices`);
                    }
                  }}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Far Left Column: Sticky Large Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <Card className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4" />
                  Mini-Vorschau
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="bg-white rounded border mb-2 h-80 relative overflow-hidden">
                  <div className="absolute inset-[4px]">
                    <div
                      className="transform origin-top-left pointer-events-none"
                      style={{
                        scale: 0.22,
                        width: `${Math.round(100 / 0.22)}%`,
                        height: `${Math.round(100 / 0.22)}%`,
                      }}
                    >
                      <ProfessionalBusinessTemplate
                        data={{
                          documentNumber: formData.invoiceNumber || 'R-2025-000',
                          date: formData.issueDate || new Date().toISOString().split('T')[0],
                          dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
                          customer: {
                            name: formData.customerName || 'Kunden auswählen...',
                            email: formData.customerEmail || '',
                            address: {
                              street: (formData.customerAddress || '').split('\n')[0] || '',
                              zipCode:
                                (formData.customerAddress || '').split('\n')[1]?.split(' ')[0] ||
                                '',
                              city:
                                (formData.customerAddress || '')
                                  .split('\n')[1]
                                  ?.split(' ')
                                  .slice(1)
                                  .join(' ') || '',
                              country: 'Deutschland',
                            },
                          },
                          company: {
                            name: companySettings?.companyName || 'Ihr Unternehmen',
                            email: companySettings?.companyEmail || 'info@ihrunternehmen.de',
                            phone: companySettings?.companyPhone || '+49 123 456789',
                            address: {
                              street: (companySettings?.companyAddress || '').split('\n')[0] || '',
                              zipCode:
                                (companySettings?.companyAddress || '')
                                  .split('\n')[1]
                                  ?.split(' ')[0] || '',
                              city:
                                (companySettings?.companyAddress || '')
                                  .split('\n')[1]
                                  ?.split(' ')
                                  .slice(1)
                                  .join(' ') || '',
                              country: 'Deutschland',
                            },
                            taxNumber: companySettings?.taxNumber || '',
                            vatId: companySettings?.vatId || '',
                            bankDetails: {
                              iban: '',
                              bic: '',
                              accountHolder: '',
                            },
                          },
                          items:
                            items.length > 0
                              ? (items as any)
                              : ([
                                  {
                                    id: 'placeholder',
                                    description: 'Beispiel Dienstleistung',
                                    quantity: 1,
                                    unitPrice: 100.0,
                                    total: 100.0,
                                  },
                                ] as any),
                          subtotal: subtotal,
                          taxRate: Number(formData.taxRate || '19'),
                          taxAmount: tax,
                          total: total,
                          paymentTerms: formData.paymentTerms,
                          notes: formData.notes,
                          status: 'draft',
                          isSmallBusiness: formData.taxNote === 'kleinunternehmer',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Middle Column: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={e => e.preventDefault()} className="space-y-8">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Kundendaten</CardTitle>
                <CardDescription>Informationen zum Rechnungsempfänger</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Kunde auswählen</Label>
                    <Select onValueChange={handleCustomerSelect}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingCustomers
                              ? 'Kunden werden geladen...'
                              : customers.length === 0
                                ? 'Keine Kunden gefunden - erstellen Sie zuerst einen Kunden'
                                : 'Bestehenden Kunden wählen oder neu eingeben'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              <span className="text-xs text-gray-500">
                                {customer.customerNumber}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Firmenname *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, customerName: e.target.value }))
                      }
                      placeholder="Mustermann GmbH"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">E-Mail</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, customerEmail: e.target.value }))
                      }
                      placeholder="info@mustermann.de"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerAddress">Rechnungsadresse</Label>
                    <Textarea
                      id="customerAddress"
                      value={formData.customerAddress}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, customerAddress: e.target.value }))
                      }
                      placeholder="Musterstraße 123&#10;12345 Berlin&#10;Deutschland"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerVatId">USt-IdNr. / VAT-ID</Label>
                    <Input
                      id="customerVatId"
                      value={formData.customerVatId}
                      onChange={e => {
                        const vatId = e.target.value;

                        // Erstelle temporäres Customer-Objekt für Validierung
                        const tempCustomer: Customer = {
                          id: 'temp',
                          name: formData.customerName,
                          email: formData.customerEmail,
                          vatId: vatId,
                          // Versuche Land aus Adresse zu extrahieren
                          country: formData.customerAddress?.split('\n').pop()?.trim() || '',
                        };

                        // Prüfe Reverse-Charge bei VAT-ID Eingabe
                        const shouldApplyReverseCharge = isReverseChargeApplicable(
                          tempCustomer,
                          vatId,
                          fullCompanyData
                        );

                        setFormData(prev => ({
                          ...prev,
                          customerVatId: vatId,
                          // Nur automatisch setzen wenn noch kein spezifischer Steuerhinweis gesetzt ist
                          taxNote:
                            shouldApplyReverseCharge && prev.taxNote === 'none'
                              ? 'reverse-charge'
                              : prev.taxNote,
                          taxRate:
                            shouldApplyReverseCharge && prev.taxNote === 'none'
                              ? '0'
                              : prev.taxRate,
                        }));

                        // Benutzer informieren
                        if (shouldApplyReverseCharge && vatId.length >= 4) {
                          toast.info(
                            'EU-VAT-ID erkannt: Reverse-Charge-Verfahren wurde automatisch aktiviert.'
                          );
                        }
                      }}
                      placeholder="DE123456789"
                    />

                    <p className="text-xs text-gray-500">
                      Umsatzsteuer-Identifikationsnummer des Kunden (optional)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle>Rechnungsdetails</CardTitle>
                <CardDescription>Grundlegende Informationen zur Rechnung</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Rechnungsnummer</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="text-gray-500 font-medium">
                        Wird bei Finalisierung automatisch generiert
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Entwürfe erhalten noch keine finale Rechnungsnummer
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Rechnungsdatum *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={formData.issueDate}
                      onChange={e => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Fälligkeitsdatum *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Kurzbeschreibung</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="z.B. Beratungsleistungen für Projekt XYZ"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Rechnungspositionen</CardTitle>
                    <CardDescription>Fügen Sie Leistungen und Produkte hinzu</CardDescription>
                  </div>
                  <Button type="button" variant="outline" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Position hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-3 font-medium text-gray-700 dark:text-gray-300">
                          Produkt oder Service
                        </th>
                        <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300 w-20">
                          Menge
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-gray-700 dark:text-gray-300 w-28">
                          Preis
                        </th>
                        <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300 w-20">
                          Rabatt
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-gray-700 dark:text-gray-300 w-28">
                          Betrag
                        </th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="py-3 px-3">
                            <Input
                              value={item.description}
                              onChange={e => updateItem(item.id, 'description', e.target.value)}
                              placeholder="Leistungsbeschreibung eingeben..."
                              className="border-0 bg-transparent p-0 focus:ring-0 text-base"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={e =>
                                updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                              }
                              className="w-16 text-center mx-auto"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={e =>
                                  updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                                }
                                className="text-right pr-6 w-24"
                                placeholder="0,00"
                              />

                              <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                                €
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={item.discount}
                                onChange={e =>
                                  updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 text-center pr-5 mx-auto"
                                placeholder="0"
                              />

                              <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                                %
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="text-base font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(item.total)}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Row */}
                <div className="border-t pt-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="text-sm text-gray-600">
                      <p>
                        {(() => {
                          const { subtotal } = calculateTotals();
                          const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
                          return `${items.length} Position${items.length !== 1 ? 'en' : ''} • ${totalItems} Artikel • Netto: ${formatCurrency(subtotal)}`;
                        })()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {(() => {
                        const { subtotal, tax, total } = calculateTotals();
                        return (
                          <>
                            <div className="flex justify-between w-48">
                              <span className="text-sm text-gray-600">Zwischensumme:</span>
                              <span className="text-sm font-medium">
                                {formatCurrency(subtotal)}
                              </span>
                            </div>
                            <div className="flex justify-between w-48">
                              <span className="text-sm text-gray-600">
                                MwSt ({formData.taxRate}%):
                              </span>
                              <span className="text-sm font-medium">{formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between w-48 text-lg font-bold pt-2 border-t">
                              <span>Gesamtbetrag:</span>
                              <span className="text-[#14ad9f]">{formatCurrency(total)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Steuerhinweise */}
            <Card>
              <CardHeader>
                <CardTitle>Steuerhinweise</CardTitle>
                <CardDescription>
                  Wählen Sie einen passenden Steuerhinweis für Ihre Rechnung
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taxNote">Steuerhinweis</Label>
                  <Select
                    value={formData.taxNote}
                    onValueChange={value => {
                      setFormData(prev => ({
                        ...prev,
                        taxNote: value,
                        // Automatisch Steuersatz auf 0% setzen bei Kleinunternehmer
                        taxRate: value === 'kleinunternehmer' ? '0' : prev.taxRate,
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Steuerhinweis auswählen (optional)" />
                    </SelectTrigger>
                    <SelectContent className="max-w-md w-80">
                      <SelectItem value="none">Kein Steuerhinweis</SelectItem>
                      <SelectItem
                        value="kleinunternehmer"
                        className="whitespace-normal py-3 h-auto leading-relaxed"
                      >
                        <div className="text-sm">
                          Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="reverse-charge"
                        className="whitespace-normal py-3 h-auto leading-relaxed"
                      >
                        <div className="text-sm">
                          Nach dem Reverse-Charge-Prinzip §13b Abs.2 UStG schulden Sie als
                          Leistungsempfänger die Umsatzsteuer als Unternehmer.
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Anzeige des ausgewählten Steuerhinweises */}
                  {formData.taxNote && formData.taxNote !== 'none' && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border-l-4 border-[#14ad9f]">
                      <div className="text-sm text-gray-700">
                        <strong>Ausgewählter Steuerhinweis:</strong>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {formData.taxNote === 'kleinunternehmer' &&
                          'Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.'}
                        {formData.taxNote === 'reverse-charge' &&
                          'Nach dem Reverse-Charge-Prinzip §13b Abs.2 UStG schulden Sie als Leistungsempfänger die Umsatzsteuer als Unternehmer.'}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Zahlungskonditionen */}
            <Card>
              <CardHeader>
                <CardTitle>Zahlungskonditionen</CardTitle>
                <CardDescription>
                  Bearbeiten Sie die Zahlungskonditionen für diese Rechnung
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Zahlungskonditionen</Label>
                  <Textarea
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={e => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="z.B. Zahlbar binnen 14 Tagen ohne Abzug"
                    rows={2}
                  />

                  <p className="text-xs text-gray-500">
                    Automatisch basierend auf Ihren Firmeneinstellungen gesetzt. Sie können diese
                    für diese Rechnung anpassen.
                  </p>
                </div>

                {/* Schnellauswahl für Zahlungskonditionen */}
                <div className="space-y-2">
                  <Label>Schnellauswahl</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(() => {
                      const companyDays = companySettings?.defaultPaymentTerms?.days || 14;
                      const baseOptions = [
                        { days: 7, text: 'Zahlbar binnen 7 Tagen ohne Abzug' },
                        { days: 14, text: 'Zahlbar binnen 14 Tagen ohne Abzug' },
                        { days: 30, text: 'Zahlbar binnen 30 Tagen ohne Abzug' },
                        { days: 0, text: 'Sofort fällig bei Erhalt' },
                      ];

                      // Add company default if it's not already in the list
                      if (![7, 14, 30, 0].includes(companyDays)) {
                        baseOptions.unshift({
                          days: companyDays,
                          text:
                            companySettings?.defaultPaymentTerms?.text ||
                            `Zahlbar binnen ${companyDays} Tagen ohne Abzug`,
                        });
                      }

                      return baseOptions.map(option => (
                        <Button
                          key={option.days}
                          type="button"
                          variant={
                            // Highlight company default
                            option.days === companyDays ? 'default' : 'outline'
                          }
                          size="sm"
                          onClick={() => {
                            const issueDate = new Date(formData.issueDate);
                            const dueDate = new Date(
                              issueDate.getTime() + option.days * 24 * 60 * 60 * 1000
                            );
                            setFormData(prev => ({
                              ...prev,
                              paymentTerms: option.text,
                              dueDate: dueDate.toISOString().split('T')[0],
                            }));
                          }}
                          className={`text-xs justify-center ${
                            option.days === companyDays
                              ? 'bg-[#14ad9f] hover:bg-[#129488] text-white'
                              : ''
                          }`}
                        >
                          {option.days === 0 ? 'Sofort' : `${option.days} Tage`}
                          {option.days === companyDays && ' (Standard)'}
                        </Button>
                      ));
                    })()}
                  </div>
                </div>

                {/* Skonto-Einstellungen */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="skontoEnabled"
                      checked={formData.skontoEnabled}
                      onChange={e => {
                        const enabled = e.target.checked;
                        const skontoText = enabled
                          ? `${formData.skontoPercentage}% Skonto bei Zahlung binnen ${formData.skontoDays} Tagen`
                          : '';
                        setFormData(prev => ({
                          ...prev,
                          skontoEnabled: enabled,
                          skontoText: skontoText,
                        }));
                      }}
                      className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
                    />

                    <Label htmlFor="skontoEnabled" className="text-sm font-medium">
                      Skonto gewähren
                    </Label>
                  </div>

                  {formData.skontoEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="skontoDays">Skonto-Tage</Label>
                        <Input
                          id="skontoDays"
                          type="number"
                          min="1"
                          max="30"
                          value={formData.skontoDays}
                          onChange={e => {
                            const days = parseInt(e.target.value) || 3;
                            const skontoText = `${formData.skontoPercentage}% Skonto bei Zahlung binnen ${days} Tagen`;
                            setFormData(prev => ({
                              ...prev,
                              skontoDays: days,
                              skontoText: skontoText,
                            }));
                          }}
                          placeholder="3"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="skontoPercentage">Skonto-Prozentsatz (%)</Label>
                        <Input
                          id="skontoPercentage"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          value={formData.skontoPercentage}
                          onChange={e => {
                            const percentage = parseFloat(e.target.value) || 2.0;
                            const skontoText = `${percentage}% Skonto bei Zahlung binnen ${formData.skontoDays} Tagen`;
                            setFormData(prev => ({
                              ...prev,
                              skontoPercentage: percentage,
                              skontoText: skontoText,
                            }));
                          }}
                          placeholder="2.0"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="skontoText">Skonto-Text für Rechnung</Label>
                        <Input
                          id="skontoText"
                          value={formData.skontoText}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, skontoText: e.target.value }))
                          }
                          placeholder="2% Skonto bei Zahlung binnen 3 Tagen"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Zusätzliche Informationen</CardTitle>
                <CardDescription>Optionale Anmerkungen für die Rechnung</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notizen</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Zusätzliche Informationen oder Zahlungshinweise..."
                      rows={3}
                    />
                  </div>

                  {/* E-Rechnung Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <Label
                          htmlFor="eInvoiceEnabled"
                          className="text-sm font-medium text-blue-800"
                        >
                          E-Rechnung aktivieren
                        </Label>
                        <p className="text-xs text-blue-600 mt-1">
                          Für B2B-Rechnungen ab 250€ ab 01.01.2025 (Übergangszeit bis 31.12.2026)
                          <a
                            href="/blog/e-rechnung-leitfaden"
                            target="_blank"
                            className="block text-[#14ad9f] hover:underline mt-1 font-medium"
                          >
                            → Kompletter E-Rechnung Leitfaden
                          </a>
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="eInvoiceEnabled"
                      checked={isEInvoiceEnabled}
                      onCheckedChange={handleEInvoiceToggle}
                      className="data-[state=checked]:bg-[#14ad9f]"
                    />
                  </div>

                  {isEInvoiceEnabled && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center text-green-800">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">E-Rechnung aktiviert</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Diese Rechnung wird im E-Rechnung-Format (XRechnung/ZUGFeRD) erstellt.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleBackToInvoices}>
                Abbrechen
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={e => handleSubmit(e, 'draft')}
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Als Entwurf speichern
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={e => handleSubmit(e, 'finalize')}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Rechnung erstellen
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Aktionen & PDF Vorschau */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-3">
            {/* PDF Preview Button */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4" /> PDF/Vorschau & Druck
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-4">
                  <InvoicePreview
                    invoiceData={{
                      invoiceNumber: formData.invoiceNumber,
                      issueDate: formData.issueDate,
                      dueDate: formData.dueDate,
                      customerName: formData.customerName,
                      customerAddress: formData.customerAddress,
                      customerEmail: formData.customerEmail,
                      description: formData.description,
                      items: items,
                      amount: subtotal,
                      tax: tax,
                      total: total,
                      taxNote: (formData.taxNote !== 'none' ? formData.taxNote : undefined) as
                        | 'kleinunternehmer'
                        | 'reverse-charge'
                        | undefined,
                      paymentTerms: formData.paymentTerms,
                      // Skonto-Daten für PDF Preview
                      skontoEnabled: formData.skontoEnabled,
                      skontoDays: formData.skontoDays,
                      skontoPercentage: formData.skontoPercentage,
                      skontoText: formData.skontoText,
                    }}
                    companySettings={companySettings || undefined}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rechnungsübersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Positionen:</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Zwischensumme:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MwSt. ({formData.taxRate}%):</span>
                    <span className="font-medium">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Gesamtbetrag:</span>
                    <span className="font-bold text-[#14ad9f]">{formatCurrency(total)}</span>
                  </div>

                  {/* Tax Note Preview */}
                  {formData.taxNote && formData.taxNote !== 'none' && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-xs text-gray-600 font-medium mb-1">Steuerhinweis:</p>
                      <p className="text-xs text-gray-700">
                        {formData.taxNote === 'kleinunternehmer'
                          ? 'Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet.'
                          : 'Nach dem Reverse-Charge-Prinzip §13b Abs.2 UStG schulden Sie als Leistungsempfänger die Umsatzsteuer als Unternehmer.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* E-Rechnung Profil-Vervollständigung Modal */}
      <div className={showEInvoiceModal ? 'fixed inset-0 z-50' : 'hidden'}>
        {/* Custom overlay without blur */}
        <div className="fixed inset-0 bg-black/30" onClick={() => setShowEInvoiceModal(false)} />
        {/* Custom sheet content */}
        <div
          className="fixed right-0 top-0 h-full w-[90vw] max-w-[900px] bg-transparent z-10 overflow-y-auto p-0"
          style={{
            transform: showEInvoiceModal ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 300ms ease-in-out',
          }}
        >
          <div className="p-6 min-h-full !border-0" style={{ border: 'none', outline: 'none' }}>
            <ModalCard
              variant="elevated"
              className="w-full shadow-2xl !border-0 !outline-none !ring-0"
              style={{
                border: 'none',
                outline: 'none',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <ModalCardHeader icon={<AlertCircle className="h-5 w-5 text-amber-600" />}>
                <ModalCardTitle>E-Rechnung einrichten</ModalCardTitle>
                <ModalCardDescription>
                  Vervollständigen Sie Ihre Firmendaten für die E-Rechnung
                </ModalCardDescription>
              </ModalCardHeader>

              <ModalCardContent spacing="lg">
                {/* Firmeninformationen */}
                {(isFieldMissing('companyName') ||
                  isFieldMissing('companyStreet') ||
                  isFieldMissing('companyCity') ||
                  isFieldMissing('companyPostalCode') ||
                  isFieldMissing('companyCountry')) && (
                  <ModalCardSection title="Firmeninformationen" variant="default">
                    <div className="space-y-4">
                      {isFieldMissing('companyName') && (
                        <div>
                          <Label
                            htmlFor="modal-companyName"
                            className="text-sm font-medium text-gray-700"
                          >
                            Firmenname
                          </Label>
                          <Input
                            id="modal-companyName"
                            value={modalFormData.companyName}
                            onChange={e =>
                              setModalFormData(prev => ({ ...prev, companyName: e.target.value }))
                            }
                            placeholder="Mustermann GmbH"
                            className="rounded-xl mt-1"
                          />
                        </div>
                      )}

                      {isFieldMissing('companyStreet') && (
                        <div>
                          <Label
                            htmlFor="modal-companyStreet"
                            className="text-sm font-medium text-gray-700"
                          >
                            Straße und Hausnummer
                          </Label>
                          <Input
                            id="modal-companyStreet"
                            value={modalFormData.companyStreet}
                            onChange={e =>
                              setModalFormData(prev => ({ ...prev, companyStreet: e.target.value }))
                            }
                            placeholder="Musterstraße 123"
                            className="rounded-xl mt-1"
                          />
                        </div>
                      )}

                      {(isFieldMissing('companyPostalCode') || isFieldMissing('companyCity')) && (
                        <div className="grid grid-cols-2 gap-3">
                          {isFieldMissing('companyPostalCode') && (
                            <div>
                              <Label
                                htmlFor="modal-companyPostalCode"
                                className="text-sm font-medium text-gray-700"
                              >
                                PLZ
                              </Label>
                              <Input
                                id="modal-companyPostalCode"
                                value={modalFormData.companyPostalCode}
                                onChange={e =>
                                  setModalFormData(prev => ({
                                    ...prev,
                                    companyPostalCode: e.target.value,
                                  }))
                                }
                                placeholder="12345"
                                className="rounded-xl mt-1"
                              />
                            </div>
                          )}
                          {isFieldMissing('companyCity') && (
                            <div>
                              <Label
                                htmlFor="modal-companyCity"
                                className="text-sm font-medium text-gray-700"
                              >
                                Stadt
                              </Label>
                              <Input
                                id="modal-companyCity"
                                value={modalFormData.companyCity}
                                onChange={e =>
                                  setModalFormData(prev => ({
                                    ...prev,
                                    companyCity: e.target.value,
                                  }))
                                }
                                placeholder="Berlin"
                                className="rounded-xl mt-1"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {isFieldMissing('companyCountry') && (
                        <div>
                          <Label
                            htmlFor="modal-companyCountry"
                            className="text-sm font-medium text-gray-700"
                          >
                            Land
                          </Label>
                          <Input
                            id="modal-companyCountry"
                            value={modalFormData.companyCountry}
                            onChange={e =>
                              setModalFormData(prev => ({
                                ...prev,
                                companyCountry: e.target.value,
                              }))
                            }
                            placeholder="Deutschland"
                            className="rounded-xl mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </ModalCardSection>
                )}

                {/* Steuerinformationen */}
                {(isFieldMissing('taxNumber') ||
                  isFieldMissing('vatId') ||
                  isFieldMissing('registrationNumber')) && (
                  <ModalCardSection title="Steuerinformationen" variant="info">
                    <div className="space-y-4">
                      {(isFieldMissing('taxNumber') || isFieldMissing('vatId')) && (
                        <>
                          <div>
                            <Label
                              htmlFor="modal-taxNumber"
                              className="text-sm font-medium text-gray-700"
                            >
                              Steuernummer
                            </Label>
                            <Input
                              id="modal-taxNumber"
                              value={modalFormData.taxNumber}
                              onChange={e =>
                                setModalFormData(prev => ({ ...prev, taxNumber: e.target.value }))
                              }
                              placeholder="123/456/78901"
                              className="rounded-xl mt-1"
                            />
                          </div>

                          <div>
                            <Label
                              htmlFor="modal-vatId"
                              className="text-sm font-medium text-gray-700"
                            >
                              USt-IdNr.
                            </Label>
                            <Input
                              id="modal-vatId"
                              value={modalFormData.vatId}
                              onChange={e =>
                                setModalFormData(prev => ({ ...prev, vatId: e.target.value }))
                              }
                              placeholder="DE123456789"
                              className="rounded-xl mt-1"
                            />
                          </div>
                        </>
                      )}

                      {isFieldMissing('registrationNumber') && (
                        <div>
                          <Label
                            htmlFor="modal-registrationNumber"
                            className="text-sm font-medium text-gray-700"
                          >
                            Handelsregisternummer
                          </Label>
                          <Input
                            id="modal-registrationNumber"
                            value={modalFormData.registrationNumber}
                            onChange={e =>
                              setModalFormData(prev => ({
                                ...prev,
                                registrationNumber: e.target.value,
                              }))
                            }
                            placeholder="HRB 12345"
                            className="rounded-xl mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </ModalCardSection>
                )}

                {/* Bankdaten */}
                {(isFieldMissing('iban') || isFieldMissing('bic')) && (
                  <ModalCardSection title="Bankdaten" variant="warning">
                    <div className="space-y-4">
                      {isFieldMissing('iban') && (
                        <div>
                          <Label htmlFor="modal-iban" className="text-sm font-medium text-gray-700">
                            IBAN
                          </Label>
                          <Input
                            id="modal-iban"
                            value={modalFormData.iban}
                            onChange={e =>
                              setModalFormData(prev => ({ ...prev, iban: e.target.value }))
                            }
                            placeholder="DE89 3704 0044 0532 0130 00"
                            className="rounded-xl mt-1"
                          />
                        </div>
                      )}

                      {isFieldMissing('bic') && (
                        <div>
                          <Label htmlFor="modal-bic" className="text-sm font-medium text-gray-700">
                            BIC
                          </Label>
                          <Input
                            id="modal-bic"
                            value={modalFormData.bic}
                            onChange={e =>
                              setModalFormData(prev => ({ ...prev, bic: e.target.value }))
                            }
                            placeholder="COBADEFFXXX"
                            className="rounded-xl mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </ModalCardSection>
                )}

                {/* Kontaktdaten */}
                {isFieldMissing('contactEmail') && (
                  <ModalCardSection title="Kontaktdaten" variant="default">
                    <div>
                      <Label
                        htmlFor="modal-contactEmail"
                        className="text-sm font-medium text-gray-700"
                      >
                        E-Mail
                      </Label>
                      <Input
                        id="modal-contactEmail"
                        type="email"
                        value={modalFormData.contactEmail}
                        onChange={e =>
                          setModalFormData(prev => ({ ...prev, contactEmail: e.target.value }))
                        }
                        placeholder="info@mustermann.de"
                        className="rounded-xl mt-1"
                      />
                    </div>
                  </ModalCardSection>
                )}

                {/* Aktionen */}
                <ModalCardActions>
                  <Button
                    className="bg-[#14ad9f] hover:bg-[#129488] rounded-full py-3"
                    onClick={handleSaveEInvoiceData}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Speichern und E-Rechnung aktivieren
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-full py-3"
                    onClick={() => setShowEInvoiceModal(false)}
                    disabled={isSubmitting}
                  >
                    Abbrechen
                  </Button>
                </ModalCardActions>
              </ModalCardContent>
            </ModalCard>
          </div>
        </div>
      </div>
    </div>
  );
}
