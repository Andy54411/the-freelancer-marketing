'use client';

import {
  Briefcase as FiBriefcase,
  User as FiUser,
  CreditCard as FiCreditCard,
  CheckCircle as FiCheckCircle,
  AlertCircle as FiAlertCircle,
  Shield as FiShield,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { DocumentViewer } from './DocumentViewer';
import ActionButtons from './ActionButtons';
import type { CompanyDetailData } from '../types';

// Hilfsfunktion, um einen Link zum Stripe-Dashboard zu erstellen
const getStripeDashboardLink = (stripeAccountId: string) => {
  return `https://dashboard.stripe.com/accounts/${stripeAccountId}`;
};

// Erzeugt ein benutzerfreundliches Label aus dem Dateinamen des Dokuments
const getDocumentLabel = (fileName: string): string => {
  const nameOnly = fileName.substring(fileName.lastIndexOf('/') + 1);

  if (nameOnly.startsWith('identity_document_')) return 'Ausweisdokument';
  if (nameOnly.startsWith('business_license_')) return 'Gewerbeschein';
  if (nameOnly.startsWith('business_icon_')) return 'Firmenlogo';
  if (nameOnly.startsWith('master_craftsman_certificate_')) return 'Meisterbrief';
  if (nameOnly.startsWith('additional_verification_')) return 'Zusätzliches Dokument';

  // Fallback für unbekannte oder benutzerdefinierte Dateinamen
  return (
    nameOnly
      .split('_')
      .join(' ')
      .replace(/\.[^/.]+$/, '') || 'Unbenanntes Dokument'
  );
};

interface CompanyDetailClientPageProps {
  data: CompanyDetailData;
}

export function CompanyDetailClientPage({ data: combinedData }: CompanyDetailClientPageProps) {
  const createdAt = combinedData.createdAt
    ? new Date(combinedData.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'N/A'; // Fallback, falls das Datum null oder ungültig ist

  const stripeAccountId = combinedData.stripeAccountId;
  const isLocked = combinedData.status === 'locked';
  const companyId = combinedData.id;
  const documents = combinedData.documents ?? [];
  const status = combinedData.status || 'unknown';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {combinedData.companyName ?? 'Unbenannte Firma'}
            </h1>
            {isLocked && <Badge variant="destructive">Gesperrt</Badge>}
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">ID: {companyId}</p>
        </div>
        <ActionButtons
          companyId={companyId}
          companyName={combinedData.companyName ?? 'Unbenannte Firma'}
        />
      </div>

      {/* Haupt-Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Linke Spalte: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Firmendetails */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4">
              <FiBriefcase /> Firmendetails
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">Firma:</span>{' '}
                {combinedData.companyName ?? 'N/A'}
              </div>
              <div>
                <span className="font-medium text-gray-500">Rechtsform:</span>{' '}
                {combinedData.legalForm ?? 'N/A'}
              </div>
              <div>
                <span className="font-medium text-gray-500">Adresse:</span>{' '}
                {`${combinedData.companyStreet ?? ''} ${combinedData.companyHouseNumber ?? ''}, ${combinedData.companyPostalCode ?? ''} ${combinedData.companyCity ?? ''}`}
              </div>
              <div>
                <span className="font-medium text-gray-500">Webseite:</span>{' '}
                <a
                  href={combinedData.companyWebsite ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline"
                >
                  {combinedData.companyWebsite ?? 'N/A'}
                </a>
              </div>
              <div>
                <span className="font-medium text-gray-500">Telefon:</span>{' '}
                {combinedData.companyPhoneNumber ?? 'N/A'}
              </div>
              <div>
                <span className="font-medium text-gray-500">Registriert seit:</span> {createdAt}
              </div>
            </div>
          </div>

          {/* Ansprechpartner */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4">
              <FiUser /> Ansprechpartner
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">Name:</span>{' '}
                {`${combinedData.firstName ?? ''} ${combinedData.lastName ?? ''}`}
              </div>
              <div>
                <span className="font-medium text-gray-500">E-Mail:</span>{' '}
                <a href={`mailto:${combinedData.email}`} className="text-teal-600 hover:underline">
                  {combinedData.email}
                </a>
              </div>
              <div>
                <span className="font-medium text-gray-500">Telefon (privat):</span>{' '}
                {combinedData.phoneNumber ?? 'N/A'}
              </div>
            </div>
          </div>

          {/* Stripe-Details */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4">
              <FiCreditCard /> Stripe-Verbindung
            </h3>
            {stripeAccountId ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FiCheckCircle />
                  <span>Stripe Account ist verbunden.</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Stripe Account ID:</span>{' '}
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
                    {stripeAccountId}
                  </code>
                </div>
                <Link
                  href={getStripeDashboardLink(stripeAccountId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Im Stripe Dashboard ansehen
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <FiAlertCircle />
                <span>Kein Stripe Account verbunden.</span>
              </div>
            )}
          </div>
        </div>

        {/* Rechte Spalte: Dokumente */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4">
              <FiShield /> Verifizierungsdokumente
            </h3>
            <div className="space-y-3">
              {documents.length > 0 ? (
                documents.map((doc: { name: string; url: string }) => (
                  <DocumentViewer
                    key={doc.name}
                    label={getDocumentLabel(doc.name)}
                    fileUrl={doc.url}
                    stripeFileId={null}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Keine Dokumente hochgeladen.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
