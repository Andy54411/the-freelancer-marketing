'use client';

import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Calculator, FileText, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceTemplate, InvoiceTemplateRenderer } from '@/components/finance/InvoiceTemplates';
import { InvoicePreview } from '@/components/finance/InvoicePreview';
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

          const savedTemplate = companyData.preferredInvoiceTemplate;
          if (savedTemplate) {
            setSelectedTemplate(savedTemplate as InvoiceTemplate);
            console.log('✅ Template aus API geladen:', savedTemplate);
          } else {
            console.log('⚠️ Kein Template in Datenbank gefunden, verwende Standard');
          }

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
            console.log(
              '✅ Kleinunternehmer-Status erkannt - Steuerhinweis und Steuersatz automatisch gesetzt'
            );
          } else if (!isGermanCompany) {
            // Ausländische Company stellt Rechnung an deutsche Kunden
            setFormData(prev => ({
              ...prev,
              taxNote: 'reverse-charge',
              taxRate: '0',
            }));
            console.log('✅ Ausländische Company erkannt - Reverse-Charge automatisch aktiviert:', {
              companyCountry: companyCountry,
              isGermanCompany: isGermanCompany,
            });
          }

          console.log('✅ Vollständige Firmendaten via API geladen:', {
            logo:
              companyData.companyLogo ||
              companyData.profilePictureURL ||
              companyData.step3?.profilePictureURL,
            logoDebug: {
              companyLogo: companyData.companyLogo,
              profilePictureURL: companyData.profilePictureURL,
              step3ProfilePictureURL: companyData.step3?.profilePictureURL,
              step3Full: companyData.step3,
            },
            name: companyData.companyName,
            template: savedTemplate,
            kleinunternehmer: isKleinunternehmer,
            kleinunternehmerField: companyData.kleinunternehmer,
            step2Kleinunternehmer: companyData.step2?.kleinunternehmer,
            companyCountry: companyCountry,
            isGermanCompany: isGermanCompany,
            companyLocation: {
              companyCountry: companyData.companyCountry,
              step1PersonalCountry: companyData.step1?.personalCountry,
            },
          });
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Firmendaten via API:', error);
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>('german-standard');

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_1',
      description: 'Leistung',
      quantity: 1,
      unitPrice: 50,
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
          console.log('✅ Kunden via API geladen:', response.customers.length);
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Kunden via API:', error);
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

        console.log('✅ Projektdaten erfolgreich in Rechnung übertragen:', projectData);
      } catch (error) {
        console.error('❌ Fehler beim Parsen der Projektdaten:', error);
        toast.error('Fehler beim Laden der Projektdaten');
      }
    }
  }, [searchParams]);

  // Auto-generate invoice number only when finalizing (not for drafts)
  React.useEffect(() => {
    // Keine automatische Generierung der Rechnungsnummer für Entwürfe
    // Die Nummer wird erst beim Finalisieren erstellt
  }, [uid]); // Entferne die automatische Generierung komplett

  // Auto-set due date (14 days from issue date)
  React.useEffect(() => {
    if (formData.issueDate && !formData.dueDate) {
      const issueDate = new Date(formData.issueDate);
      const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split('T')[0],
      }));
    }
  }, [formData.issueDate, formData.dueDate]);

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
        console.log('🌍 Ausländische Company erkannt - Reverse-Charge für alle Kunden');
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
        console.log('✅ Reverse-Charge automatisch gesetzt für:', {
          customer: customer.name,
          country: customer.country,
          vatId: customerVatId,
          reason: customerVatId ? 'EU-VAT-ID erkannt' : 'EU-Land in Adresse erkannt',
        });
      }
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
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

          // Recalculate total if quantity or unitPrice changed
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
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
      }

      // Create invoice via API instead of direct Firebase
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
        template: selectedTemplate,
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
      console.error('❌ Fehler beim Erstellen der Rechnung:', error);
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

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Neue Rechnung erstellen</h1>
          <p className="text-gray-600">
            Erstellen Sie eine professionelle Rechnung für Ihre Kunden.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
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
                          console.log('✅ Reverse-Charge durch VAT-ID-Eingabe aktiviert:', vatId);
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
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg"
                    >
                      <div className="col-span-12 md:col-span-5">
                        <Label htmlFor={`description_${item.id}`}>Beschreibung</Label>
                        <Input
                          id={`description_${item.id}`}
                          value={item.description}
                          onChange={e => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Leistungsbeschreibung"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label htmlFor={`quantity_${item.id}`}>Menge</Label>
                        <Input
                          id={`quantity_${item.id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={e =>
                            updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label htmlFor={`unitPrice_${item.id}`}>Einzelpreis (€)</Label>
                        <Input
                          id={`unitPrice_${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e =>
                            updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <Label>Gesamt</Label>
                        <div className="text-lg font-medium text-gray-900 mt-2">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2">
                      <div className="flex justify-between">
                        <span>Zwischensumme:</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span>MwSt.:</span>
                          <Select
                            value={formData.taxRate.toString()}
                            onValueChange={value => {
                              // Verhindere Änderung bei Kleinunternehmer
                              if (formData.taxNote === 'kleinunternehmer') {
                                toast.error(
                                  'Bei Kleinunternehmerregelung ist der Steuersatz 0% und kann nicht geändert werden.'
                                );
                                return;
                              }
                              // Verhindere Änderung bei Reverse-Charge
                              if (formData.taxNote === 'reverse-charge') {
                                toast.error(
                                  'Bei Reverse-Charge-Verfahren ist der Steuersatz 0% und kann nicht geändert werden.'
                                );
                                return;
                              }
                              console.log('MwSt changed to:', value);
                              setFormData(prev => ({ ...prev, taxRate: value }));
                            }}
                            disabled={
                              formData.taxNote === 'kleinunternehmer' ||
                              formData.taxNote === 'reverse-charge'
                            }
                          >
                            <SelectTrigger
                              className={`w-20 h-8 ${formData.taxNote === 'kleinunternehmer' || formData.taxNote === 'reverse-charge' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <SelectValue placeholder="19%" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="7">7%</SelectItem>
                              <SelectItem value="19">19%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <span className="font-medium">{formatCurrency(tax)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Gesamtbetrag:</span>
                        <span className="text-[#14ad9f]">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
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

        {/* Right Column: Live Preview & PDF Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            {/* Live Invoice Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Vorschau
                </CardTitle>
                <CardDescription>Echtzeitvorschau Ihrer Rechnung</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Live Template Renderer */}
                  <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <div className="h-96 overflow-hidden relative">
                      <div className="transform scale-[0.55] origin-top-left w-[260%] h-[260%] pointer-events-none">
                        <InvoiceTemplateRenderer
                          template={selectedTemplate}
                          data={
                            {
                              id: 'preview',
                              number: formData.invoiceNumber || 'R-2025-000',
                              invoiceNumber: formData.invoiceNumber || 'R-2025-000',
                              sequentialNumber: 0,
                              date: formData.issueDate || new Date().toISOString().split('T')[0],
                              issueDate:
                                formData.issueDate || new Date().toISOString().split('T')[0],
                              dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
                              customerName: formData.customerName || 'Kunden auswählen...',
                              customerAddress:
                                formData.customerAddress || 'Kundenadresse wird hier angezeigt',
                              customerEmail: formData.customerEmail || '',
                              description: formData.description || '',
                              companyName:
                                fullCompanyData?.companyName ||
                                companySettings?.companyName ||
                                'Ihr Unternehmen',
                              companyAddress:
                                fullCompanyData?.companyAddress ||
                                (fullCompanyData
                                  ? [
                                      fullCompanyData.companyStreet &&
                                      fullCompanyData.companyHouseNumber
                                        ? `${fullCompanyData.companyStreet} ${fullCompanyData.companyHouseNumber}`
                                        : fullCompanyData.companyStreet,
                                      fullCompanyData.companyPostalCode &&
                                      fullCompanyData.companyCity
                                        ? `${fullCompanyData.companyPostalCode} ${fullCompanyData.companyCity}`
                                        : undefined,
                                      fullCompanyData.companyCountry,
                                    ]
                                      .filter(Boolean)
                                      .join('\n')
                                  : companySettings?.companyAddress) ||
                                'Ihre Firmenadresse',
                              companyEmail:
                                fullCompanyData?.email ||
                                companySettings?.companyEmail ||
                                'info@ihrunternehmen.de',
                              companyPhone:
                                fullCompanyData?.companyPhoneNumber ||
                                companySettings?.companyPhone ||
                                '+49 123 456789',
                              companyWebsite:
                                fullCompanyData?.companyWebsite ||
                                companySettings?.companyWebsite ||
                                '',
                              companyLogo: (() => {
                                let logo =
                                  fullCompanyData?.companyLogo ||
                                  fullCompanyData?.profilePictureURL ||
                                  fullCompanyData?.step3?.profilePictureURL ||
                                  companySettings?.companyLogo ||
                                  '';

                                // URL dekodieren falls nötig
                                if (logo) {
                                  try {
                                    // Prüfe ob URL encoded ist und dekodiere sie
                                    if (logo.includes('%2F')) {
                                      logo = decodeURIComponent(logo);
                                    }
                                  } catch (error) {
                                    console.warn('🖼️ Fehler beim URL-Dekodieren:', error);
                                  }
                                }

                                console.log('🖼️ Live Preview Logo Debug:', {
                                  originalLogo:
                                    fullCompanyData?.companyLogo ||
                                    fullCompanyData?.profilePictureURL ||
                                    fullCompanyData?.step3?.profilePictureURL ||
                                    companySettings?.companyLogo ||
                                    '',
                                  decodedLogo: logo,
                                  companyLogo: fullCompanyData?.companyLogo,
                                  profilePictureURL: fullCompanyData?.profilePictureURL,
                                  step3ProfilePictureURL: fullCompanyData?.step3?.profilePictureURL,
                                  companySettingsLogo: companySettings?.companyLogo,
                                  fullCompanyDataAvailable: !!fullCompanyData,
                                });
                                return logo;
                              })(),
                              companyVatId: fullCompanyData?.vatId || companySettings?.vatId || '',
                              companyTaxNumber:
                                fullCompanyData?.taxNumber || companySettings?.taxNumber || '',
                              companyRegister:
                                fullCompanyData?.companyRegister ||
                                companySettings?.companyRegister ||
                                '',
                              districtCourt:
                                fullCompanyData?.districtCourt ||
                                companySettings?.districtCourt ||
                                '',
                              legalForm:
                                fullCompanyData?.legalForm || companySettings?.legalForm || '',
                              items: items.filter(item => item.description && item.quantity > 0),
                              amount: subtotal,
                              tax: tax,
                              total: total,
                              status: 'draft' as const,
                              notes: formData.notes,
                              createdAt: new Date(),
                              year: new Date().getFullYear(),
                              companyId: 'preview',
                              isStorno: false,
                              isSmallBusiness: companySettings?.ust === 'kleinunternehmer' || false,
                              vatRate: parseFloat(formData.taxRate),
                              priceInput: 'netto' as const,
                              taxNote: (() => {
                                const taxNote =
                                  formData.taxNote !== 'none' ? formData.taxNote : undefined;
                                console.log('🔍 Invoice Create Debug - taxNote:', {
                                  formDataTaxNote: formData.taxNote,
                                  processedTaxNote: taxNote,
                                  isNotNone: formData.taxNote !== 'none',
                                });
                                return taxNote as 'kleinunternehmer' | 'reverse-charge' | undefined;
                              })(),
                            } as InvoiceData
                          }
                          preview={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* PDF Preview Button */}
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
                    }}
                    template={selectedTemplate}
                    companySettings={companySettings || undefined}
                    trigger={
                      <Button
                        variant="outline"
                        className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Vollbild PDF-Vorschau
                      </Button>
                    }
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
    </div>
  );
}
