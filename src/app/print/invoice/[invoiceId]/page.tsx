'use client';

import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import {
  InvoiceTemplateRenderer,
  DEFAULT_INVOICE_TEMPLATE,
  AVAILABLE_TEMPLATES,
} from '@/components/finance/InvoiceTemplates';
import { db } from '@/firebase/clients';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  collectionGroup,
} from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InvoiceData } from '@/types/invoiceTypes';

/**
 * Gibt den deutschen Text für eine Steuerregel zurück
 */
function getTaxRuleLabel(taxRule: string): string {
  switch (taxRule) {
    case 'DE_TAXABLE':
      return 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)';
    case 'DE_REDUCED':
      return 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 2 UStG)';
    case 'DE_EXEMPT':
      return 'Steuerfreier Umsatz (§ 4 UStG)';
    case 'DE_SMALL_BUSINESS':
      return 'Umsatzsteuerbefreit nach § 19 UStG (Kleinunternehmerregelung)';
    case 'DE_REVERSE_CHARGE':
      return 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)';
    case 'DE_INTRACOMMUNITY':
      return 'Innergemeinschaftliche Lieferung (§ 4 Nr. 1b UStG)';
    case 'DE_EXPORT':
      return 'Ausfuhrlieferung (§ 4 Nr. 1a UStG)';
    default:
      return taxRule;
  }
}

/**
 * Sucht eine Rechnung global über alle Companies hinweg
 * VERBESSERT: Verwendet keine collectionGroup Query, sondern direkte Pfad-Suche
 */
async function findInvoiceGlobally(invoiceId: string): Promise<InvoiceData | null> {
  try {
    console.log('Searching for invoice globally:', invoiceId);

    // STRATEGIE: Versuche alle bekannten Companies zu durchsuchen
    // Da collectionGroup nicht erlaubt ist, durchsuchen wir systematisch alle Companies
    const companiesQuery = query(collection(db, 'companies'));
    const companiesSnapshot = await getDocs(companiesQuery);

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      try {
        const invoiceRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (invoiceSnap.exists()) {
          console.log('Invoice found in company:', companyId, invoiceId);
          const data = invoiceSnap.data();

          // Transformiere die Daten in das erwartete Format
          const invoice: InvoiceData = {
            id: invoiceSnap.id,
            companyId: data.companyId,
            customerName: data.customerName,
            customerAddress: data.customerAddress,
            // Parse customerAddress into structured format
            customer: data.customerAddress
              ? {
                  name: data.customerName || '',
                  email: data.customerEmail || '',
                  address: (() => {
                    // Bereinige customerAddress von Zeilenumbrüchen
                    const cleanedAddress = (data.customerAddress || '')
                      .replace(/<br\s*\/?>/gi, ' ') // HTML <br> Tags
                      .replace(/\r\n/g, ' ') // Windows Zeilenumbrüche
                      .replace(/\n/g, ' ') // Unix Zeilenumbrüche
                      .replace(/\r/g, ' ') // Mac Zeilenumbrüche
                      .replace(/\t/g, ' ') // Tabs
                      .replace(/\f/g, ' ') // Form feeds
                      .replace(/\v/g, ' ') // Vertical tabs
                      .replace(/\s+/g, ' ') // Mehrere Leerzeichen
                      .trim(); // Trim

                    console.log('DEBUG customerAddress parsing:', {
                      original: data.customerAddress,
                      cleaned: cleanedAddress,
                    });

                    // Intelligente Parsing für: "Siedlung am Wald 6 18586 Sellin Deutschland"
                    const parts = cleanedAddress.split(' ').filter(p => p.length > 0);
                    if (parts.length >= 4) {
                      // Finde PLZ (numerisch) - meist 5-stellig
                      let plzIndex = -1;
                      for (let i = 0; i < parts.length; i++) {
                        if (/^\d{4,5}$/.test(parts[i])) {
                          plzIndex = i;
                          break;
                        }
                      }

                      if (plzIndex > 0) {
                        const street = parts.slice(0, plzIndex).join(' ');
                        const zipCode = parts[plzIndex];
                        const city = parts[plzIndex + 1] || '';
                        const country = parts.slice(plzIndex + 2).join(' ') || 'Deutschland';
                        return { street, zipCode, city, country };
                      }
                    }

                    // Fallback für Format: "Street City Deutschland"
                    if (parts.length >= 2) {
                      const country =
                        parts[parts.length - 1] === 'Deutschland' ? 'Deutschland' : 'Deutschland';
                      const cityStart =
                        parts.length >= 3 && parts[parts.length - 1] === 'Deutschland'
                          ? parts.length - 2
                          : parts.length - 1;

                      // Suche nach PLZ in den letzten Teilen
                      let plzFound = '';
                      let cityEnd = cityStart;
                      for (let i = Math.max(0, cityStart - 2); i <= cityStart; i++) {
                        if (/^\d{4,5}$/.test(parts[i])) {
                          plzFound = parts[i];
                          cityEnd = i + 1;
                          break;
                        }
                      }

                      return {
                        street: parts
                          .slice(0, plzFound ? parts.indexOf(plzFound) : cityEnd)
                          .join(' '),
                        zipCode: plzFound,
                        city: plzFound
                          ? parts.slice(parts.indexOf(plzFound) + 1, cityStart + 1).join(' ')
                          : parts[cityStart] || '',
                        country: country,
                      };
                    }

                    // Absoluter Fallback
                    return {
                      street: cleanedAddress,
                      zipCode: '',
                      city: '',
                      country: 'Deutschland',
                    };
                  })(),
                  vatId: (data as any).customerVatId || data.customerVatId || undefined,
                  taxNumber: (data as any).customerTaxNumber || data.customerTaxNumber || undefined,
                }
              : undefined,
            items: data.items || [],
            total: data.total || 0,
            status: data.status || 'draft',
            invoiceNumber: data.invoiceNumber,
            number: data.number,
            sequentialNumber: data.sequentialNumber,
            documentNumber: data.documentNumber || data.invoiceNumber || data.number,
            date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            issueDate: data.issueDate,
            dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : data.dueDate,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : data.createdAt instanceof Date
                ? data.createdAt
                : new Date(),
            stornoDate: data.stornoDate?.toDate
              ? data.stornoDate.toDate()
              : data.stornoDate instanceof Date
                ? data.stornoDate
                : undefined,
            description: data.description,
            customerEmail: data.customerEmail,
            companyName: data.companyName,
            companyAddress: data.companyAddress,
            companyEmail: data.companyEmail,
            companyPhone: data.companyPhone,
            companyWebsite: data.companyWebsite,
            companyVatId: data.companyVatId,
            companyTaxNumber: data.companyTaxNumber,
            companyLogo: data.companyLogo,
            bankDetails: data.bankDetails,
            amount: data.amount,
            tax: data.tax,
            currency: data.currency || 'EUR',
            vatRate: data.vatRate || 19,
            isSmallBusiness: data.isSmallBusiness || false,
            notes: data.notes,
            headTextHtml: data.headTextHtml,
            footerText: data.footerText,
            paymentTerms: data.paymentTerms,
            deliveryTerms: data.deliveryTerms,
            contactPersonName: data.contactPersonName,
            priceInput: data.priceInput || 'netto',
            taxRuleType: data.taxRuleType || 'DE_TAXABLE',
            taxRule: data.taxRule || data.taxRuleType || 'DE_TAXABLE',
            year: data.year || new Date().getFullYear(),
            isStorno: data.isStorno || false,
            // Delivery date information
            deliveryDate: data.deliveryDate,
            deliveryDateType: data.deliveryDateType,
            deliveryDateRange: data.deliveryDateRange,
            // E-Invoice Daten hinzufügen
            eInvoice: data.eInvoice,
            eInvoiceData: data.eInvoiceData,
            // Referenznummer hinzufügen
            reference: (data as any).reference,
            // Skonto-Daten hinzufügen
            skontoEnabled: data.skontoEnabled || false,
            skontoDays: data.skontoDays || 0,
            skontoPercentage: data.skontoPercentage || 0,
            skontoText: data.skontoText || '',
          };

          console.log('DEBUG findInvoiceGlobally delivery data:', {
            deliveryDate: data.deliveryDate,
            deliveryDateType: data.deliveryDateType,
            deliveryDateRange: data.deliveryDateRange,
          });

          console.log('DEBUG findInvoiceGlobally full data object:', data);
          return invoice;
        }
      } catch (companyError) {
        console.log('Error checking company', companyId, ':', companyError);
        // Continue to next company
      }
    }

    console.log('Invoice not found in any company:', invoiceId);
    return null;
  } catch (error) {
    console.error('Error finding invoice globally:', error);
    return null;
  }
}

interface PrintInvoicePageProps {
  params: Promise<{ invoiceId: string }>;
}

/**
 * Dedizierte Client-Rendered Seite für saubere PDF-Generierung
 * Diese Seite zeigt nur die Rechnung ohne Navigation, Header oder andere UI-Elemente
 * Optimiert für Puppeteer-basierte PDF-Generierung
 * KEINE CACHE - Lädt IMMER frische Daten!
 */
export default function PrintInvoicePage({ params }: PrintInvoicePageProps) {
  // CACHE KILLER - Erzwinge Reload bei jedem Aufruf
  useEffect(() => {
    // Entferne alle Cache-Header
    if (typeof window !== 'undefined') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Cache-Control';
      meta.content = 'no-cache, no-store, must-revalidate';
      document.head.appendChild(meta);

      const meta2 = document.createElement('meta');
      meta2.httpEquiv = 'Pragma';
      meta2.content = 'no-cache';
      document.head.appendChild(meta2);

      const meta3 = document.createElement('meta');
      meta3.httpEquiv = 'Expires';
      meta3.content = '0';
      document.head.appendChild(meta3);
    }
  }, []);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [userTemplate, setUserTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { invoiceId } = await params;

      try {
        // 1. Versuche globale Suche zuerst (findet Rechnung in jeder Company)
        const data = await findInvoiceGlobally(invoiceId);

        if (!data) {
          console.error('Invoice not found globally:', invoiceId);
          return notFound();
        }

        // 2. Lade vollständige Firmendaten und merge sie mit Rechnungsdaten - FRISCH AUS DB!
        if (data.companyId) {
          try {
            const companyDoc = await getDoc(doc(db, 'companies', data.companyId));
            if (companyDoc.exists()) {
              const companyData = companyDoc.data();

              // Template laden
              const preferredTemplate = companyData.preferredInvoiceTemplate as string | undefined;
              if (preferredTemplate) {
                const isKnown = AVAILABLE_TEMPLATES.some(t => t.id === preferredTemplate);
                setUserTemplate(isKnown ? preferredTemplate : DEFAULT_INVOICE_TEMPLATE);
              }

              // 3. Lade Kundendaten falls customerVatId oder customerTaxNumber fehlen
              let customerVatId = (data as any).customerVatId || '';
              let customerTaxNumber = (data as any).customerTaxNumber || '';

              if ((!customerVatId || !customerTaxNumber) && data.customerName) {
                try {
                  // Versuche zuerst exakte Übereinstimmung
                  const customersQuery = query(
                    collection(db, 'companies', data.companyId, 'customers'),
                    where('name', '==', data.customerName)
                  );
                  let customersSnapshot = await getDocs(customersQuery);

                  // Wenn keine exakte Übereinstimmung, versuche Teilstring-Suche
                  if (customersSnapshot.empty) {
                    console.log(
                      '🔍 Exact match failed, trying substring search for:',
                      data.customerName
                    );
                    const allCustomersQuery = query(
                      collection(db, 'companies', data.companyId, 'customers')
                    );
                    const allCustomersSnapshot = await getDocs(allCustomersQuery);

                    // Finde Kunden mit ähnlichem Namen
                    const matchingCustomers = allCustomersSnapshot.docs.filter(doc => {
                      const customerData = doc.data();
                      const customerName = customerData.name || '';
                      return (
                        customerName.toLowerCase().includes(data.customerName.toLowerCase()) ||
                        data.customerName.toLowerCase().includes(customerName.toLowerCase())
                      );
                    });

                    if (matchingCustomers.length > 0) {
                      customersSnapshot = { docs: matchingCustomers, empty: false } as any;
                      console.log(
                        '🔍 Found customer with substring match:',
                        matchingCustomers[0].data().name
                      );
                    }
                  }

                  if (!customersSnapshot.empty) {
                    const customerData = customersSnapshot.docs[0].data();
                    customerVatId = customerData.vatId || customerVatId;
                    customerTaxNumber = customerData.taxNumber || customerTaxNumber;
                    console.log('✅ Customer data loaded from DB:', {
                      customerName: data.customerName,
                      foundCustomerName: customerData.name,
                      customerVatId,
                      customerTaxNumber,
                    });
                  } else {
                    console.log('❌ No customer found in DB for name:', data.customerName);
                  }
                } catch (customerError) {
                  console.log('❌ Error loading customer data:', customerError);
                }
              }

              // VOLLSTÄNDIGE Firmendaten in Rechnung einbetten
              const enrichedData: any = {
                ...data,
                // RECHNUNGSNUMMER - KRITISCH!
                invoiceNumber: data.invoiceNumber || data.number || '',
                number: data.number || data.invoiceNumber || '',
                sequentialNumber: data.sequentialNumber || 2, // Fallback für Testzwecke

                // BETRÄGE UND STEUERN - KORRIGIERT FÜR TEMPLATE
                total: data.total || 0,
                amount: data.amount || 0, // Nettobetrag
                tax: data.tax || 0,
                vatRate: data.vatRate || 19,
                priceInput: data.priceInput || 'netto',

                // FIRMENDATEN
                companyName: companyData.companyName || data.companyName || '',
                companyLogo:
                  companyData.companyLogo ||
                  companyData.profilePictureURL ||
                  companyData.step3?.profilePictureURL ||
                  data.companyLogo ||
                  '',
                profilePictureURL:
                  companyData.profilePictureURL ||
                  companyData.step3?.profilePictureURL ||
                  companyData.companyLogo ||
                  data.profilePictureURL ||
                  '',

                // FIRMENADRESSE - LIVE DATEN!
                companyAddress:
                  [
                    companyData.companyStreet && companyData.companyHouseNumber
                      ? `${companyData.companyStreet} ${companyData.companyHouseNumber}`
                      : companyData.companyStreet,
                    `${companyData.companyPostalCode || ''} ${companyData.companyCity || ''}`.trim(),
                    companyData.companyCountry || 'DE',
                  ]
                    .filter(Boolean)
                    .join('\n') ||
                  data.companyAddress ||
                  '',

                // Strukturierte Firmenadresse für Templates
                company: {
                  name: companyData.companyName || data.companyName || '',
                  email: companyData.email || companyData.contactEmail || data.companyEmail || '',
                  phone:
                    companyData.phoneNumber ||
                    companyData.companyPhoneNumber ||
                    data.companyPhone ||
                    '',
                  website:
                    companyData.website ||
                    companyData.companyWebsiteForBackend ||
                    data.companyWebsite ||
                    '',
                  address: {
                    street:
                      companyData.companyStreet && companyData.companyHouseNumber
                        ? `${companyData.companyStreet} ${companyData.companyHouseNumber}`
                            .replace(/\s+/g, ' ')
                            .trim()
                        : (companyData.companyStreet || '').replace(/\s+/g, ' ').trim(),
                    zipCode: companyData.companyPostalCode || '',
                    city: companyData.companyCity || '',
                    country: companyData.companyCountry || 'DE',
                  },
                  taxNumber: companyData.step3?.taxNumber || companyData.taxNumber || '',
                  vatId: companyData.vatId || companyData.step3?.vatId || '',
                  bankDetails: {
                    iban: companyData.step4?.iban || companyData.bankDetails?.iban || '',
                    bic: companyData.step4?.bic || companyData.bankDetails?.bic || 'DETESTEE',
                    accountHolder:
                      companyData.step4?.accountHolder || companyData.accountHolder || '',
                  },
                },

                // KONTAKTDATEN - LIVE DATEN!
                companyEmail:
                  companyData.email || companyData.contactEmail || data.companyEmail || '',
                companyPhone:
                  companyData.phoneNumber ||
                  companyData.companyPhoneNumber ||
                  data.companyPhone ||
                  '',
                companyWebsite:
                  companyData.website ||
                  companyData.companyWebsiteForBackend ||
                  data.companyWebsite ||
                  '',

                // STEUERDATEN - LIVE DATEN!
                companyVatId: companyData.vatId || companyData.step3?.vatId || '',
                companyTaxNumber: companyData.step3?.taxNumber || companyData.taxNumber || '',

                // RECHTLICHE DATEN - LIVE DATEN!
                legalForm: companyData.step2?.legalForm || companyData.legalForm || '',
                companyRegister:
                  companyData.step3?.companyRegister || companyData.companyRegister || '',
                districtCourt: companyData.step3?.districtCourt || companyData.districtCourt || '',

                // KLEINUNTERNEHMER STATUS
                isSmallBusiness:
                  companyData.kleinunternehmer === 'ja' ||
                  companyData.step2?.kleinunternehmer === 'ja' ||
                  data.isSmallBusiness ||
                  false,

                // BANKDATEN - LIVE AUS COMPANY DB!
                bankDetails: {
                  iban: companyData.step4?.iban || companyData.bankDetails?.iban || '',
                  bic: companyData.step4?.bic || companyData.bankDetails?.bic || 'DETESTEE',
                  accountHolder:
                    companyData.step4?.accountHolder || companyData.accountHolder || '',
                  bankName: companyData.step4?.bankName || companyData.bankDetails?.bankName || '',
                },

                // KUNDENDATEN - LIVE DATEN!
                customerVatId: customerVatId,
                customerTaxNumber: customerTaxNumber,

                // !! COMPANY STEPS FÜR TEMPLATE !!
                step1: companyData.step1 || {},
                step2: companyData.step2 || {},
                step3: companyData.step3 || {},
                step4: companyData.step4 || {},
                managingDirectors: companyData.step1?.managingDirectors || [],

                // DIREKTE FELDER FÜR FOOTER

                // REFERENZ - AUS RECHNUNG LADEN
                reference: (data as any).reference || '',

                // E-INVOICE DATEN - AUS RECHNUNG ÜBERTRAGEN
                eInvoice: data.eInvoice || undefined,
                eInvoiceData: data.eInvoiceData || undefined,

                // REVERSE CHARGE - AUS RECHNUNG ÜBERTRAGEN
                reverseCharge: !!data.reverseChargeInfo,

                // SKONTO DATEN - AUS RECHNUNG ÜBERTRAGEN
                skontoText: data.skontoText || undefined,
                skontoDays: data.skontoDays || undefined,
                skontoPercentage: data.skontoPercentage || undefined,

                // SERVICE PERIOD - AUS DELIVERY DATE RANGE BERECHNEN
                servicePeriod: data.deliveryDateRange
                  ? (() => {
                      try {
                        const range = data.deliveryDateRange as any; // Type assertion to avoid TypeScript issues
                        // Handle both string format ("21.09.2025 - 27.09.2025") and object format ({ from: "...", to: "..." })
                        if (typeof range === 'string') {
                          const [start, end] = range.split(' - ');
                          if (start && end) {
                            const startDate = new Date(start);
                            const endDate = new Date(end);
                            return `${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}`;
                          }
                        } else if (range && typeof range === 'object' && range.from && range.to) {
                          const startDate = new Date(range.from);
                          const endDate = new Date(range.to);
                          return `${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}`;
                        }
                      } catch (error) {
                        console.log('Error parsing delivery date range:', error);
                      }
                      return undefined;
                    })()
                  : undefined,

                // STEUERREGEL LABEL
                taxRuleLabel: getTaxRuleLabel(
                  (data as any).taxRule || (data as any).taxRuleType || 'DE_TAXABLE'
                ),
              };

              console.log('📊 ENRICHED DATA FOR TEMPLATE:', {
                customerVatId: enrichedData.customerVatId,
                customerTaxNumber: enrichedData.customerTaxNumber,
                hasCustomerData: !!enrichedData.customerVatId || !!enrichedData.customerTaxNumber,
              });

              setInvoiceData(enrichedData);
            } else {
              setInvoiceData(data);
            }
          } catch (error) {
            setInvoiceData(data);
          }
        } else {
          setInvoiceData(data);
        }
      } catch (error) {
        notFound();
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const initializePage = async () => {
      const resolvedParams = await params;
      document.body.classList.add('print-page');
    };

    initializePage();

    const handleLoad = () => {};
    window.addEventListener('load', handleLoad);

    return () => {
      document.body.classList.remove('print-page');
      window.removeEventListener('load', handleLoad);
    };
  }, [params]);

  // Automatisch Druckdialog öffnen wenn die Rechnung geladen ist
  useEffect(() => {
    if (invoiceData && !loading) {
      // Kurze Verzögerung damit die Seite vollständig gerendert ist
      const timer = setTimeout(() => {
        window.print();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [invoiceData, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <p className="mt-2 text-gray-600">Rechnung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return <div>Rechnung nicht gefunden</div>;
  }

  return (
    <>
      {/* Print-spezifische CSS-Optimierungen für A4-Format */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @media print {
          @page {
            margin: 0mm;
            size: A4;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Print Button ausblenden */
          .print\\:hidden {
            display: none !important;
          }

          /* A4-Layout mit Footer am Ende der Seite */
          .invoice-print-content {
            display: flex !important;
            flex-direction: column !important;
            min-height: 267mm !important;
            max-height: 267mm !important;
            overflow: hidden !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            page-break-inside: avoid !important;
          }

          /* Content-Bereich flex-grow */
          .invoice-content {
            flex-grow: 1 !important;
          }

          /* Footer immer am Ende der A4-Seite */
          .invoice-footer {
            margin-top: auto !important;
            flex-shrink: 0 !important;
            page-break-inside: avoid !important;
            font-size: 11px !important;
            padding-top: 10px !important;
          }

          /* Andere Flexbox-Elemente normal lassen */
          .flex.flex-col:not(.invoice-print-content) {
            display: block !important;
            min-height: auto !important;
            height: auto !important;
          }

          .flex-1:not(.invoice-content) {
            flex: none !important;
          }

          /* Kompakte Abstände */
          .mb-6,
          .my-6,
          .mt-6 {
            margin-top: 8px !important;
            margin-bottom: 8px !important;
          }

          .mb-4,
          .my-4,
          .mt-4 {
            margin-top: 6px !important;
            margin-bottom: 6px !important;
          }

          .p-6 {
            padding: 12px !important;
          }

          /* Tabellen kompakter aber sauber */
          table {
            page-break-inside: avoid;
          }

          /* Template-spezifische Kompaktierung */
          h1,
          h2,
          h3 {
            margin-top: 8px !important;
            margin-bottom: 6px !important;
            line-height: 1.2 !important;
          }

          /* Header kompakter */
          .invoice-header {
            margin-bottom: 12px !important;
          }

          /* Tabellen-Zellen kompakter */
          td,
          th {
            padding: 4px 8px !important;
            font-size: 11px !important;
          }

          /* Logo kleiner */
          img {
            max-height: 60px !important;
          }
        }

        body.print-page {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #fff !important;
          font-family:
            'Inter',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
          line-height: 1.4;
          font-size: 14px;
          width: 100%;
          height: auto !important;
          min-height: auto !important;
        }

        body.print-page * {
          visibility: hidden !important;
        }

        body.print-page .invoice-print-content,
        body.print-page .invoice-print-content * {
          visibility: visible !important;
        }

        body.print-page > *:not(.invoice-print-content) {
          display: none !important;
        }

        .invoice-print-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 15mm !important;
          background: white !important;
          box-sizing: border-box;
          min-height: auto !important;
          height: auto !important;
          max-height: none !important;
        }

        .bg-\\[\\#14ad9f\\] {
          background-color: #14ad9f !important;
        }

        .text-\\[\\#14ad9f\\] {
          color: #14ad9f !important;
        }
      `}</style>

      {/* Print Button - nur am Bildschirm sichtbar */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-[#14ad9f] hover:bg-[#129488] text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          <span>Drucken</span>
        </button>
      </div>

      {/* Sauberer Invoice Content - NUR die Rechnung */}
      <div className="invoice-print-content">
        {/* Minimales A4-optimiertes Layout */}
        <div className="print-invoice-wrapper">
          <InvoiceTemplateRenderer
            data-template-renderer
            template={
              (userTemplate && AVAILABLE_TEMPLATES.some(t => t.id === userTemplate)
                ? (userTemplate as any)
                : DEFAULT_INVOICE_TEMPLATE) as any
            }
            data={(() => {
              const templateData = {
                ...invoiceData,
                // Template-kompatible Felder hinzufügen
                subtotal: invoiceData.amount || 0,
                taxAmount: invoiceData.tax || 0,
                taxRate: invoiceData.vatRate || 19,
                // Tax-Regel Informationen
                taxRule: (invoiceData as any).taxRule || 'DE_TAXABLE',
                taxRuleLabel:
                  (invoiceData as any).taxRuleLabel ||
                  getTaxRuleLabel((invoiceData as any).taxRule || 'DE_TAXABLE'),
                // Dynamischer Dokumenttyp und Titel
                documentType: invoiceData.isStorno ? 'storno' : 'invoice',
                documentTitle: invoiceData.isStorno ? 'STORNO-RECHNUNG' : 'Rechnung',
                isStorno: invoiceData.isStorno,
                // NUR Datenbankdaten - KEINE hardcodierten Fallbacks!
                company: invoiceData.companyName
                  ? {
                      name: invoiceData.companyName,
                      address: invoiceData.companyAddress
                        ? {
                            street: invoiceData.companyAddress.split('\n')[0] || '',
                            zipCode: invoiceData.companyAddress.split('\n')[1]?.split(' ')[0] || '',
                            city:
                              invoiceData.companyAddress
                                .split('\n')[1]
                                ?.split(' ')
                                .slice(1)
                                .join(' ') || '',
                            country: invoiceData.companyAddress.split('\n')[2] || '',
                          }
                        : undefined,
                      email: invoiceData.companyEmail || undefined,
                      phone: invoiceData.companyPhone || undefined,
                      website: invoiceData.companyWebsite || undefined,
                      vatId: invoiceData.companyVatId || undefined,
                      taxNumber: invoiceData.companyTaxNumber || undefined,
                      bankDetails: {
                        iban:
                          (invoiceData as any).iban || (invoiceData as any).bankDetails?.iban || '',
                        bic:
                          (invoiceData as any).bic || (invoiceData as any).bankDetails?.bic || '',
                        accountHolder:
                          (invoiceData as any).accountHolder ||
                          (invoiceData as any).bankDetails?.accountHolder ||
                          '',
                        bankName:
                          (invoiceData as any).bankName ||
                          (invoiceData as any).bankDetails?.bankName ||
                          '',
                      },
                    }
                  : undefined,
                // Verwende die bereits korrekt geparste customer-Struktur aus invoiceData
                customer:
                  invoiceData.customer &&
                  invoiceData.customer.address &&
                  invoiceData.customer.address.street
                    ? invoiceData.customer // Verwende die korrekt geparste Struktur aus findInvoiceGlobally
                    : invoiceData.customerName
                      ? {
                          name: invoiceData.customerName,
                          email: invoiceData.customerEmail || undefined,
                          address: invoiceData.customerAddress
                            ? (() => {
                                // Intelligente Parsing-Logik als Fallback
                                const cleanedAddress = (invoiceData.customerAddress || '')
                                  .replace(/<br\s*\/?>/gi, ' ')
                                  .replace(/\r\n/g, ' ')
                                  .replace(/\n/g, ' ')
                                  .replace(/\r/g, ' ')
                                  .replace(/\t/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim();

                                const parts = cleanedAddress.split(' ').filter(p => p.length > 0);
                                if (parts.length >= 4) {
                                  // Finde PLZ (numerisch)
                                  let plzIndex = -1;
                                  for (let i = 0; i < parts.length; i++) {
                                    if (/^\d{4,5}$/.test(parts[i])) {
                                      plzIndex = i;
                                      break;
                                    }
                                  }

                                  if (plzIndex > 0) {
                                    return {
                                      street: parts.slice(0, plzIndex).join(' '),
                                      zipCode: parts[plzIndex],
                                      city: parts[plzIndex + 1] || '',
                                      country: parts.slice(plzIndex + 2).join(' ') || 'Deutschland',
                                    };
                                  }
                                }

                                // Fallback: Einfache Aufteilung
                                if (parts.length >= 3) {
                                  return {
                                    street: parts.slice(0, -2).join(' '),
                                    zipCode: parts[parts.length - 2],
                                    city: parts[parts.length - 1],
                                    country: 'Deutschland',
                                  };
                                }

                                return {
                                  street: cleanedAddress,
                                  zipCode: '',
                                  city: '',
                                  country: 'Deutschland',
                                };
                              })()
                            : undefined,
                          vatId: (invoiceData as any).customerVatId || undefined,
                          taxNumber: (invoiceData as any).customerTaxNumber || undefined,
                        }
                      : undefined,
                profilePictureURL:
                  invoiceData.companyLogo || invoiceData.profilePictureURL || undefined,
                // !! LIVE COMPANY DATEN FÜR FOOTER !!
                managingDirectors: (invoiceData as any).managingDirectors || undefined,
                step1: (invoiceData as any).step1 || undefined,
                step2: (invoiceData as any).step2 || undefined,
                step3: (invoiceData as any).step3 || undefined,
                step4: (invoiceData as any).step4 || undefined,
                firstName: (invoiceData as any).firstName || undefined,
                lastName: (invoiceData as any).lastName || undefined,

                // DIREKTE COMPANY DATEN FÜR FOOTER
                companyName: invoiceData.companyName,
                companyEmail: invoiceData.companyEmail,
                companyPhone: invoiceData.companyPhone,
                companyWebsite: invoiceData.companyWebsite,
                companyVatId: invoiceData.companyVatId,
                companyTaxNumber: invoiceData.companyTaxNumber,

                // E-INVOICE DATEN
                eInvoice: invoiceData.eInvoice,
                eInvoiceData: invoiceData.eInvoiceData,

                // SERVICE DATE & PERIOD (aus gespeicherten Delivery-Daten berechnen)
                serviceDate:
                  (invoiceData as any).deliveryDateType === 'single'
                    ? invoiceData.deliveryDate
                    : undefined,
                servicePeriod: (() => {
                  const deliveryType = (invoiceData as any).deliveryDateType;
                  const deliveryRange = (invoiceData as any).deliveryDateRange;
                  console.log('DEBUG Delivery Data:', { deliveryType, deliveryRange });

                  if (deliveryType === 'range' && deliveryRange?.from && deliveryRange?.to) {
                    const fromDate = new Date(deliveryRange.from).toLocaleDateString('de-DE');
                    const toDate = new Date(deliveryRange.to).toLocaleDateString('de-DE');
                    const result = `${fromDate} - ${toDate}`;
                    console.log('DEBUG servicePeriod calculated:', result);
                    return result;
                  }
                  return undefined;
                })(),

                // ZUSÄTZLICHE FELDER FÜR TEMPLATE-ANZEIGE
                contactPersonName: invoiceData.contactPersonName || undefined,
                deliveryTerms: invoiceData.deliveryTerms || undefined,
                skontoText: invoiceData.skontoText || undefined,
                skontoDays: invoiceData.skontoDays || undefined,
                skontoPercentage: invoiceData.skontoPercentage || undefined,
                isSmallBusiness: invoiceData.isSmallBusiness || false,
              };

              console.log('DEBUG templateData for template:', {
                servicePeriod: templateData.servicePeriod,
                serviceDate: templateData.serviceDate,
                deliveryDateType: templateData.deliveryDateType,
                deliveryDateRange: templateData.deliveryDateRange,
              });

              return templateData;
            })()}
            preview={false}
          />
        </div>
      </div>
    </>
  );
}
