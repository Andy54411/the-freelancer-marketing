import React from 'react';
import { resolveLogoUrl } from '../utils/logoUtils';
import { formatCurrency as formatCurrencyEUR } from '@/lib/utils';

interface ReminderData {
  companyLogo?: string;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyCountry: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  bankDetails?: {
    iban?: string;
    bic?: string;
    bankName?: string;
    accountHolder?: string;
  };
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerZip: string;
  customerCountry: string;
  reminderNumber: string;
  reminderDate: string;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  dueDate: string;
  // Leistungsangaben (rechtlich wichtig)
  serviceDate?: string; // Einzelnes Leistungsdatum
  servicePeriodFrom?: string; // Leistungszeitraum Beginn
  servicePeriodTo?: string; // Leistungszeitraum Ende
  reminderLevel: 1 | 2 | 3;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  reminderFee: number;
  total: number;
}

interface TemplateProps {
  data: ReminderData;
  preview?: boolean;
  // leichte Farbvarianten für andere Designs
  themeVariant?: 'professional' | 'executive' | 'corporate' | 'minimalist' | 'modern' | 'tech';
}

/**
 * Professional Reminder Template - Modern & Firm
 * Features: Professional reminder design, clear urgency indicators
 */
export const ProfessionalReminderTemplate: React.FC<TemplateProps> = ({
  data,
  preview = false,
  themeVariant = 'professional',
}) => {
  const safeFormatDate = (input?: string) => {
    if (!input) return '';
    const d = new Date(input);
    if (isNaN(d.getTime())) return input; // Bereits formatiert (z. B. 13.09.2025)
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  };

  const formatCurrency = (value?: number) =>
    formatCurrencyEUR(typeof value === 'number' ? value : 0, 'EUR');

  const logoUrl = resolveLogoUrl(undefined, undefined, {
    companyLogo: data.companyLogo,
    profilePictureURL: undefined,
  });

  // Dezent, aber klar unterscheidbare Akzente pro Variante
  const theme = (() => {
    switch (themeVariant) {
      case 'executive':
        return {
          headingText: 'text-slate-900',
          headingTransform: 'uppercase tracking-wide',
          badgeText: 'text-slate-700',
          badgeBorder: 'border-slate-300',
          badgeShape: 'rounded-md',
          headerDivider: 'border-slate-200',
          headerBorderThickness: 'border-b-2',
          headerDirection: 'flex-row',
          headerJustify: 'justify-between',
          titleAlign: 'text-right',
          logoClass: 'h-12 w-auto',
          sectionBg: 'bg-white',
          sectionBorder: 'border-slate-200',
          rounded: 'rounded-lg',
          tableHeaderBg: 'bg-slate-50',
          tableBorder: 'border-slate-300',
          amountFont: '',
          noticeAccentLeft: 'border-l-4 border-slate-400 pl-4',
          tableHeaderText: 'uppercase tracking-wider',
          rowStriping: '',
          sectionShadow: '',
          topAccentBar: '',
          headerLayout: 'classic',
          headerBg: '',
          footerLayout: 'two-col',
          footerBg: 'bg-gray-50',
          footerBorder: 'border-t border-slate-200',
        };
      case 'corporate':
        return {
          headingText: 'text-stone-900',
          headingTransform: 'tracking-wide',
          badgeText: 'text-stone-700',
          badgeBorder: 'border-stone-300',
          badgeShape: 'rounded-sm',
          headerDivider: 'border-stone-300',
          headerBorderThickness: 'border-b-2',
          headerDirection: 'flex-row-reverse',
          headerJustify: 'justify-between',
          titleAlign: 'text-left',
          logoClass: 'h-12 w-auto',
          sectionBg: 'bg-white',
          sectionBorder: 'border-stone-300',
          rounded: 'rounded-md',
          tableHeaderBg: 'bg-stone-100',
          tableBorder: 'border-stone-300',
          amountFont: '',
          noticeAccentLeft: 'border-l-4 border-stone-400 pl-4',
          tableHeaderText: 'uppercase tracking-wide',
          rowStriping: 'odd:bg-stone-50',
          sectionShadow: '',
          topAccentBar: 'bg-stone-300',
          headerLayout: 'reverse',
          headerBg: '',
          footerLayout: 'three-col',
          footerBg: 'bg-gray-50',
          footerBorder: 'border-t border-stone-300',
        };
      case 'minimalist':
        return {
          headingText: 'text-zinc-900',
          headingTransform: '',
          badgeText: 'text-zinc-700',
          badgeBorder: 'border-zinc-200',
          badgeShape: 'rounded-sm',
          headerDivider: 'border-zinc-100',
          headerBorderThickness: 'border-b',
          headerDirection: 'flex-row',
          headerJustify: 'justify-between',
          titleAlign: 'text-right',
          logoClass: 'h-10 w-auto',
          sectionBg: 'bg-white',
          sectionBorder: 'border-zinc-100',
          rounded: 'rounded-md',
          tableHeaderBg: 'bg-white',
          tableBorder: 'border-zinc-200',
          amountFont: '',
          noticeAccentLeft: '',
          tableHeaderText: '',
          rowStriping: '',
          sectionShadow: '',
          topAccentBar: '',
          headerLayout: 'stacked',
          headerBg: 'bg-white',
          footerLayout: 'centered',
          footerBg: 'bg-white',
          footerBorder: 'border-t border-zinc-100',
        };
      case 'modern':
        return {
          headingText: 'text-neutral-900',
          headingTransform: '',
          badgeText: 'text-neutral-700',
          badgeBorder: 'border-neutral-300',
          badgeShape: 'rounded-full',
          headerDivider: 'border-neutral-200',
          headerBorderThickness: 'border-b',
          headerDirection: 'flex-row',
          headerJustify: 'justify-between',
          titleAlign: 'text-center',
          logoClass: 'h-12 w-auto',
          sectionBg: 'bg-neutral-50',
          sectionBorder: 'border-neutral-200',
          rounded: 'rounded-xl',
          tableHeaderBg: 'bg-neutral-100',
          tableBorder: 'border-neutral-300',
          amountFont: '',
          noticeAccentLeft: 'border-l-4 border-neutral-400 pl-4',
          tableHeaderText: '',
          rowStriping: 'odd:bg-neutral-50',
          sectionShadow: 'shadow-sm',
          topAccentBar: '',
          headerLayout: 'classic',
          headerBg: 'bg-neutral-50',
          footerLayout: 'three-col',
          footerBg: 'bg-neutral-50',
          footerBorder: 'border-t border-neutral-200',
        };
      case 'tech':
        return {
          headingText: 'text-slate-900',
          headingTransform: '',
          badgeText: 'text-slate-700',
          badgeBorder: 'border-slate-300',
          badgeShape: 'rounded-full',
          headerDivider: 'border-slate-200',
          headerBorderThickness: 'border-b-2',
          headerDirection: 'flex-row',
          headerJustify: 'justify-between',
          titleAlign: 'text-right',
          logoClass: 'h-12 w-auto',
          sectionBg: 'bg-white',
          sectionBorder: 'border-slate-200',
          rounded: 'rounded-lg',
          tableHeaderBg: 'bg-slate-100',
          tableBorder: 'border-slate-300',
          amountFont: 'font-mono',
          noticeAccentLeft: 'border-l-4 border-slate-400 pl-4',
          tableHeaderText: 'tracking-wide',
          rowStriping: 'odd:bg-slate-50',
          sectionShadow: '',
          topAccentBar: '',
          headerLayout: 'classic',
          headerBg: '',
          footerLayout: 'strip',
          footerBg: 'bg-white',
          footerBorder: 'border-t border-slate-200',
        };
      default:
        return {
          headingText: 'text-gray-900',
          headingTransform: '',
          badgeText: 'text-gray-700',
          badgeBorder: 'border-gray-300',
          badgeShape: 'rounded-md',
          headerDivider: 'border-gray-200',
          headerBorderThickness: 'border-b',
          headerDirection: 'flex-row',
          headerJustify: 'justify-between',
          titleAlign: 'text-right',
          logoClass: 'h-12 w-auto',
          sectionBg: 'bg-white',
          sectionBorder: 'border-gray-200',
          rounded: 'rounded-lg',
          tableHeaderBg: 'bg-gray-50',
          tableBorder: 'border-gray-300',
          amountFont: '',
          noticeAccentLeft: '',
          tableHeaderText: '',
          rowStriping: '',
          sectionShadow: '',
          topAccentBar: '',
          headerLayout: 'classic',
          headerBg: '',
          footerLayout: 'two-col',
          footerBg: 'bg-gray-50',
          footerBorder: 'border-t border-gray-200',
        };
    }
  })();

  const renderServiceInfo = () => {
    const from = data.servicePeriodFrom;
    const to = data.servicePeriodTo;
    const single = data.serviceDate;
    if (from && to) {
      return (
        <p>
          Leistung: <span className="font-medium">{safeFormatDate(from)}</span> –{' '}
          <span className="font-medium">{safeFormatDate(to)}</span>
        </p>
      );
    }
    if (single) {
      return (
        <p>
          Leistungsdatum: <span className="font-medium">{safeFormatDate(single)}</span>
        </p>
      );
    }
    return null;
  };

  const renderBankInfo = () => {
    const b = data.bankDetails;
    if (!b || (!b.iban && !b.bic && !b.bankName && !b.accountHolder)) return null;
    return (
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Zahlung & Bankverbindung</h4>
        <div className="text-sm text-gray-800 grid grid-cols-1 gap-1">
          {b.accountHolder && (
            <p>
              Kontoinhaber: <span className="font-medium">{b.accountHolder}</span>
            </p>
          )}
          {b.bankName && (
            <p>
              Bank: <span className="font-medium">{b.bankName}</span>
            </p>
          )}
          {b.iban && (
            <p>
              IBAN: <span className="font-medium">{b.iban}</span>
            </p>
          )}
          {b.bic && (
            <p>
              BIC: <span className="font-medium">{b.bic}</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderHeader = () => {
    const companyBlock = (
      <div className="flex items-center gap-4">
        {logoUrl && <img src={logoUrl} alt={data.companyName} className={theme.logoClass} />}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{data.companyName}</h2>
          <div className="text-gray-600 text-xs">
            <p>{data.companyAddress}</p>
            <p>
              {data.companyZip} {data.companyCity}
            </p>
            {(data.companyEmail || data.companyPhone) && (
              <p>{[data.companyEmail, data.companyPhone].filter(Boolean).join(' • ')}</p>
            )}
          </div>
        </div>
      </div>
    );

    const titleBlock = (
      <div className={`${theme.titleAlign}`}>
        <div
          className={`inline-flex items-center gap-2 border ${theme.badgeShape} px-2 py-1 text-xs ${theme.badgeText} ${theme.badgeBorder}`}
        >
          <span className="font-medium">Mahnstufe</span>
          <span className="font-semibold">{data.reminderLevel}</span>
        </div>
        <h1 className={`text-2xl font-bold mt-3 ${theme.headingText} ${theme.headingTransform}`}>
          Mahnung
        </h1>
        <div className="text-gray-700 text-sm mt-1">
          <p>
            <span className="text-gray-600">Nummer:</span> {data.reminderNumber}
          </p>
          <p>
            <span className="text-gray-600">Datum:</span> {safeFormatDate(data.reminderDate)}
          </p>
        </div>
      </div>
    );

    if (theme.headerLayout === 'reverse') {
      return (
        <div
          className={`p-8 ${theme.headerBorderThickness} ${theme.headerDivider} ${theme.headerBg} mb-0`}
        >
          <div className={`flex items-start ${theme.headerJustify} gap-6 flex-row-reverse`}>
            {companyBlock}
            {titleBlock}
          </div>
        </div>
      );
    }

    if (theme.headerLayout === 'stacked') {
      return (
        <div
          className={`p-8 ${theme.headerBorderThickness} ${theme.headerDivider} ${theme.headerBg} mb-0`}
        >
          <div className="flex items-start justify-between gap-6">{companyBlock}</div>
          <div className="mt-4 flex justify-end">{titleBlock}</div>
        </div>
      );
    }

    // classic default
    return (
      <div
        className={`p-8 ${theme.headerBorderThickness} ${theme.headerDivider} ${theme.headerBg} mb-0`}
      >
        <div className={`flex items-start ${theme.headerJustify} gap-6 ${theme.headerDirection}`}>
          {companyBlock}
          {titleBlock}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (theme.footerLayout === 'centered') {
      return (
        <div className={`${theme.footerBg} p-6 mt-auto ${theme.footerBorder}`}>
          <div className="text-center text-xs text-gray-600">
            <p className="font-semibold">{data.companyName}</p>
            <p>
              {data.companyAddress} • {data.companyZip} {data.companyCity}
            </p>
            <p>
              {[data.companyEmail, data.companyPhone, data.companyWebsite]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
        </div>
      );
    }

    if (theme.footerLayout === 'three-col') {
      return (
        <div className={`${theme.footerBg} p-6 mt-auto ${theme.footerBorder}`}>
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
            <div>
              <p className="font-semibold">{data.companyName}</p>
              <p>{data.companyAddress}</p>
              <p>
                {data.companyZip} {data.companyCity}
              </p>
            </div>
            <div>
              {data.companyEmail && <p>E-Mail: {data.companyEmail}</p>}
              {data.companyPhone && <p>Tel.: {data.companyPhone}</p>}
            </div>
            <div className="text-right">
              {data.companyWebsite && <p>Web: {data.companyWebsite}</p>}
              <p className="text-[10px] text-gray-500">
                Bitte Zahlungsreferenz: {data.reminderNumber}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (theme.footerLayout === 'strip') {
      const strip = [
        data.companyName,
        `${data.companyZip} ${data.companyCity}`,
        data.companyWebsite,
        data.companyEmail,
        data.companyPhone,
      ]
        .filter(Boolean)
        .join(' • ');
      return (
        <div className={`${theme.footerBg} p-4 mt-auto ${theme.footerBorder}`}>
          <div className="text-center text-[11px] text-gray-600 font-mono truncate">{strip}</div>
        </div>
      );
    }

    // two-col default
    return (
      <div className={`${theme.footerBg} p-6 mt-auto ${theme.footerBorder}`}>
        <div className="flex justify-between text-xs text-gray-600">
          <div>
            <p className="font-semibold">{data.companyName}</p>
            <p>
              {data.companyAddress} • {data.companyZip} {data.companyCity}
            </p>
          </div>
          <div className="text-right">
            {data.companyEmail && <p>{data.companyEmail}</p>}
            {data.companyPhone && <p>{data.companyPhone}</p>}
            {data.companyWebsite && <p>{data.companyWebsite}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full min-h-[842px] bg-white font-sans text-sm leading-normal flex flex-col mx-auto">
      {renderHeader()}
      {theme.topAccentBar && <div className={`h-1 w-full ${theme.topAccentBar} mb-6`} />}

      {/* Customer Info */}
      <div className="px-8 mb-8">
        <div
          className={`${theme.sectionBg} border ${theme.sectionBorder} p-6 ${theme.rounded} ${theme.sectionShadow}`}
        >
          <h3 className="text-base font-semibold mb-3 text-gray-800">Empfänger</h3>
          <div className="text-gray-800 text-sm">
            <p className="font-semibold">{data.customerName}</p>
            <p>{data.customerAddress}</p>
            <p>
              {data.customerZip} {data.customerCity}
            </p>
            <p>{data.customerCountry}</p>
          </div>
        </div>
      </div>

      {/* Reminder Notice */}
      <div className="px-8 mb-8">
        <div
          className={`border ${theme.sectionBorder} bg-white p-6 ${theme.rounded} ${theme.noticeAccentLeft} ${theme.sectionShadow}`}
        >
          <h3 className={`text-base font-semibold mb-3 ${theme.headingText}`}>
            Zahlungserinnerung
          </h3>
          <div className="text-gray-700 text-sm space-y-1">
            <p>
              Bezug: Rechnung <span className="font-medium">{data.originalInvoiceNumber}</span> vom{' '}
              <span className="font-medium">{safeFormatDate(data.originalInvoiceDate)}</span>,
              fällig am <span className="font-medium">{safeFormatDate(data.dueDate)}</span>.
            </p>
            {renderServiceInfo()}
            <p>
              Bitte begleichen Sie den ausstehenden Betrag umgehend. Sollte die Zahlung bereits
              erfolgt sein, betrachten Sie dieses Schreiben als gegenstandslos.
            </p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="px-8 mb-8 flex-1">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className={`text-left py-3 px-3 border ${theme.tableBorder} ${theme.tableHeaderBg} ${theme.tableHeaderText} font-medium text-gray-800`}
              >
                Beschreibung
              </th>
              <th
                className={`text-right py-3 px-3 border ${theme.tableBorder} ${theme.tableHeaderBg} ${theme.tableHeaderText} font-medium text-gray-800 w-20`}
              >
                Menge
              </th>
              <th
                className={`text-right py-3 px-3 border ${theme.tableBorder} ${theme.tableHeaderBg} ${theme.tableHeaderText} font-medium text-gray-800 w-28`}
              >
                Einzelpreis
              </th>
              <th
                className={`text-right py-3 px-3 border ${theme.tableBorder} ${theme.tableHeaderBg} ${theme.tableHeaderText} font-semibold text-gray-900 w-32`}
              >
                Gesamt
              </th>
            </tr>
          </thead>
          <tbody className={`${theme.rowStriping}`}>
            {data.items.map((item, index) => (
              <tr key={index} className="bg-white">
                <td className={`py-3 px-3 border-b ${theme.sectionBorder}`}>{item.description}</td>
                <td className={`text-right py-3 px-3 border-b ${theme.sectionBorder}`}>
                  {item.quantity}
                </td>
                <td
                  className={`text-right py-3 px-3 border-b ${theme.sectionBorder} ${theme.amountFont}`}
                >
                  {formatCurrency(item.price)}
                </td>
                <td
                  className={`text-right py-3 px-3 border-b ${theme.sectionBorder} font-semibold text-gray-900 ${theme.amountFont}`}
                >
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
            {data.reminderFee > 0 && (
              <tr className="bg-white">
                <td
                  className={`py-3 px-3 border-b ${theme.sectionBorder} font-medium text-gray-800`}
                >
                  Mahngebühr
                </td>
                <td className={`text-right py-3 px-3 border-b ${theme.sectionBorder}`}>1</td>
                <td
                  className={`text-right py-3 px-3 border-b ${theme.sectionBorder} ${theme.amountFont}`}
                >
                  {formatCurrency(data.reminderFee)}
                </td>
                <td
                  className={`text-right py-3 px-3 border-b ${theme.sectionBorder} font-semibold text-gray-900 ${theme.amountFont}`}
                >
                  {formatCurrency(data.reminderFee)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summenbereich – neutral */}
        <div className="mt-6 flex justify-end">
          <div
            className={`w-80 ${theme.sectionBg} border ${theme.sectionBorder} ${theme.rounded} p-4`}
          >
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-700">Zwischensumme:</span>
              <span className={`text-gray-900 ${theme.amountFont}`}>
                {formatCurrency(data.subtotal)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-700">Umsatzsteuer ({data.taxRate}%):</span>
              <span className={`text-gray-900 ${theme.amountFont}`}>
                {formatCurrency(data.taxAmount)}
              </span>
            </div>
            {data.reminderFee > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-700">Mahngebühr:</span>
                <span className={`text-gray-900 ${theme.amountFont}`}>
                  {formatCurrency(data.reminderFee)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="flex justify-between font-semibold text-base">
                <span className="text-gray-900">Fälliger Gesamtbetrag:</span>
                <span className={`text-gray-900 ${theme.amountFont}`}>
                  {formatCurrency(data.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rechtliche Hinweise & Zahlungsinformation */}
        <div className="mt-6">
          <div className="border border-gray-200 bg-white rounded-lg p-4 text-sm text-gray-700 space-y-2">
            <p>
              Bitte zahlen Sie den fälligen Gesamtbetrag umgehend, spätestens jedoch innerhalb von
              <span className="font-medium"> 7 Kalendertagen</span> nach Zugang dieser Mahnung unter
              Angabe der Mahnungsnummer <span className="font-medium">{data.reminderNumber}</span>.
            </p>
            <p>
              Hinweis: Nach § 286 BGB befinden Sie sich mit Ablauf der in der Rechnung genannten
              Zahlungsfrist im Verzug. Eine Geldschuld ist während des Verzugs mit Verzugszinsen zu
              verzinsen (§ 288 BGB). Bei Rechtsgeschäften ohne Verbraucher beträgt der
              Verzugszinssatz <span className="font-medium">9 Prozentpunkte</span> über dem
              Basiszinssatz; im Übrigen <span className="font-medium">5 Prozentpunkte</span> über
              dem Basiszinssatz.
            </p>
            <p className="text-xs text-gray-600">
              Bei reinen B2B-Geschäften kann zusätzlich eine Verzugspauschale in Höhe von 40,00 €
              geltend gemacht werden (§ 288 Abs. 5 BGB).
            </p>
          </div>

          {renderBankInfo()}
        </div>
      </div>

      {/* Footer */}
      {renderFooter()}
    </div>
  );
};
