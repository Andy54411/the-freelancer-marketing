'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase as FiBriefcase,
  User as FiUser,
  CreditCard as FiCreditCard,
  CheckCircle as FiCheckCircle,
  AlertCircle as FiAlertCircle,
  Shield as FiShield,
  Clock,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface OnboardingData {
  status: string;
  currentStep: number;
  completionPercentage: number;
  lastActivity: Date;
  stepsCompleted: number[];
  adminNotes?: string;
  isLegacyCompany?: boolean;
  registrationMethod?: string;
}

export function CompanyDetailClientPage({ data: combinedData }: CompanyDetailClientPageProps) {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);

  // Lade Onboarding-Daten
  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        const response = await fetch('/api/admin/companies/onboarding', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const company = result.companies.find((c: any) => c.uid === combinedData.id);
            if (company) {
              setOnboardingData({
                status: company.onboardingStatus,
                currentStep: company.currentStep,
                completionPercentage: company.completionPercentage,
                lastActivity: new Date(company.lastActivity),
                stepsCompleted: company.stepsCompleted,
                adminNotes: company.adminNotes,
                isLegacyCompany: company.isLegacyCompany,
                registrationMethod: company.registrationMethod,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      } finally {
        setLoadingOnboarding(false);
      }
    };

    loadOnboardingData();
  }, [combinedData.id]);

  // Genehmigen-Funktion
  const handleApprove = async () => {
    try {
      const response = await fetch('/api/admin/companies/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: combinedData.id }),
      });

      if (response.ok) {
        // Onboarding-Daten neu laden
        setOnboardingData(prev => (prev ? { ...prev, status: 'approved' } : null));
        alert('Unternehmen erfolgreich genehmigt!');
      } else {
        alert('Fehler beim Genehmigen des Unternehmens.');
      }
    } catch (error) {
      console.error('Error approving company:', error);
      alert('Fehler beim Genehmigen des Unternehmens.');
    }
  };

  // Ablehnen-Funktion
  const handleReject = async () => {
    const reason = prompt('Grund für die Ablehnung (optional):');
    try {
      const response = await fetch('/api/admin/companies/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: combinedData.id,
          reason: reason || 'Keine Begründung angegeben',
        }),
      });

      if (response.ok) {
        setOnboardingData(prev => (prev ? { ...prev, status: 'rejected' } : null));
        alert('Unternehmen erfolgreich abgelehnt!');
      } else {
        alert('Fehler beim Ablehnen des Unternehmens.');
      }
    } catch (error) {
      console.error('Error rejecting company:', error);
      alert('Fehler beim Ablehnen des Unternehmens.');
    }
  };

  // Status-Badge-Funktion
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Genehmigt</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Wartet auf Freigabe</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Bearbeitung</Badge>;
      case 'pending_onboarding':
        return <Badge className="bg-orange-100 text-orange-800">Warten auf Start</Badge>;
      case 'grandfathered':
        return <Badge className="bg-purple-100 text-purple-800">Legacy (Bestandsschutz)</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
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
          status={status}
        />
      </div>

      {/* Onboarding Status Sektion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Onboarding Status
          </CardTitle>
          <CardDescription>
            Übersicht über den Onboarding-Fortschritt und Freigabe-Optionen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOnboarding ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            </div>
          ) : onboardingData ? (
            <div className="space-y-6">
              {/* Status Übersicht */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div>{getStatusBadge(onboardingData.status)}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Fortschritt</div>
                  <div className="text-xl font-semibold">
                    {onboardingData.completionPercentage}%
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Aktueller Schritt</div>
                  <div className="text-xl font-semibold">{onboardingData.currentStep}/5</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Letzte Aktivität</div>
                  <div className="text-sm">
                    {new Date(onboardingData.lastActivity).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Fortschrittsbalken */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Onboarding-Fortschritt</span>
                  <span className="text-sm text-gray-500">
                    {onboardingData.completionPercentage}%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-[#14ad9f] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${onboardingData.completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Schritte-Übersicht */}
              <div>
                <div className="text-sm font-medium mb-3">Onboarding-Schritte</div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(step => {
                    const isCompleted = onboardingData.stepsCompleted.includes(step);
                    const isCurrent = step === onboardingData.currentStep;
                    return (
                      <div
                        key={step}
                        className={`p-3 rounded-lg text-center text-sm ${
                          isCompleted
                            ? 'bg-green-100 text-green-800'
                            : isCurrent
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <div className="font-medium">Schritt {step}</div>
                        <div className="text-xs mt-1">
                          {isCompleted ? '✓ Abgeschlossen' : isCurrent ? 'Aktuell' : 'Ausstehend'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legacy Unternehmen Info */}
              {onboardingData.isLegacyCompany && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <FiShield className="w-4 h-4" />
                    <span className="font-semibold">Legacy Unternehmen</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Dieses Unternehmen wurde vor der Einführung des Onboarding-Prozesses registriert
                    und erhält automatisch Bestandsschutz.
                  </p>
                  <div className="mt-2">
                    <span className="font-medium">Registrierungsmethode:</span>{' '}
                    {onboardingData.registrationMethod}
                  </div>
                </div>
              )}

              {/* Admin Notizen */}
              {onboardingData.adminNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="font-semibold text-blue-800 mb-2">Admin Notizen</div>
                  <p className="text-sm text-blue-700">{onboardingData.adminNotes}</p>
                </div>
              )}

              {/* Freigabe-Aktionen */}
              {onboardingData.status === 'completed' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                    <FiCheckCircle className="w-4 h-4 mr-2" />
                    Unternehmen genehmigen
                  </Button>
                  <Button onClick={handleReject} variant="destructive">
                    <FiAlertCircle className="w-4 h-4 mr-2" />
                    Ablehnen
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Keine Onboarding-Daten verfügbar</div>
          )}
        </CardContent>
      </Card>

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
                <span className="font-medium text-gray-500">Profil-URL:</span>{' '}
                {combinedData.taskiloProfileUrl ? (
                  <a
                    href={combinedData.taskiloProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline"
                  >
                    {combinedData.taskiloProfileUrl}
                  </a>
                ) : (
                  'N/A'
                )}
              </div>
              {combinedData.companyWebsite && (
                <div>
                  <span className="font-medium text-gray-500">Firmen-Website:</span>{' '}
                  <a
                    href={combinedData.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline"
                  >
                    {combinedData.companyWebsite}
                  </a>
                </div>
              )}
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
              {/* Dokumente aus Firebase Storage */}
              {documents.length > 0 &&
                documents.map((doc: { name: string; url: string }) => (
                  <DocumentViewer
                    key={doc.name}
                    label={getDocumentLabel(doc.name)}
                    fileUrl={doc.url}
                    stripeFileId={null}
                  />
                ))}

              {/* Dokumente aus Firestore-Daten */}
              {combinedData.profilePictureFirebaseUrl && (
                <DocumentViewer
                  key="profilePicture"
                  label="Profilbild"
                  fileUrl={combinedData.profilePictureFirebaseUrl}
                  stripeFileId={combinedData.profilePictureStripeFileId}
                />
              )}

              {combinedData.businessLicenseFirebaseUrl && (
                <DocumentViewer
                  key="businessLicense"
                  label="Gewerbeschein"
                  fileUrl={combinedData.businessLicenseFirebaseUrl}
                  stripeFileId={combinedData.businessLicenseStripeId}
                />
              )}

              {combinedData.identityFrontFirebaseUrl && (
                <DocumentViewer
                  key="identityFront"
                  label="Ausweis Vorderseite"
                  fileUrl={combinedData.identityFrontFirebaseUrl}
                  stripeFileId={combinedData.identityFrontUrlStripeId}
                />
              )}

              {combinedData.identityBackFirebaseUrl && (
                <DocumentViewer
                  key="identityBack"
                  label="Ausweis Rückseite"
                  fileUrl={combinedData.identityBackFirebaseUrl}
                  stripeFileId={combinedData.identityBackUrlStripeId}
                />
              )}

              {combinedData.masterCraftsmanCertificateFirebaseUrl && (
                <DocumentViewer
                  key="masterCraftsmanCertificate"
                  label="Meisterbrief"
                  fileUrl={combinedData.masterCraftsmanCertificateFirebaseUrl}
                  stripeFileId={combinedData.masterCraftsmanCertificateStripeId}
                />
              )}

              {/* Fallback wenn keine Dokumente gefunden werden */}
              {documents.length === 0 &&
                !combinedData.profilePictureFirebaseUrl &&
                !combinedData.businessLicenseFirebaseUrl &&
                !combinedData.identityFrontFirebaseUrl &&
                !combinedData.identityBackFirebaseUrl && (
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
