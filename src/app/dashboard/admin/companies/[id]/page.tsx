// Admin Company Details Page
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import GoogleAdsIntegrationRequest from '@/components/admin/GoogleAdsIntegrationRequest';
import { CompanySubscriptionCard } from '@/components/admin/CompanySubscriptionCard';
import { PromoCodeCard } from '@/components/admin/PromoCodeCard';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
  FileText,
  Star,
  TrendingUp,
  Shield,
  Settings,
  Users,
  Calendar,
  Edit,
  Ban,
  CheckCircle,
  ExternalLink,
  Eye,
  Download,
  Image,
  FileImage,
  RefreshCw,
  Trash2,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface CompanyDetails {
  id: string;
  email: string;
  name: string;
  companyName: string;
  industry?: string;
  selectedSubcategory?: string;
  website?: string;
  phone?: string;
  phoneVerifiedFromWebmail?: boolean;
  phoneVerifiedAt?: string;
  status: 'active' | 'inactive' | 'suspended';
  profileStatus?: string;
  stripeVerificationStatus?: string;
  createdAt: string;
  lastLogin?: string; // Legacy-Kompatibilität
  onboardingCompletedAt?: string;
  updatedAt?: string;

  // Adressdaten
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  location?: string;
  lat?: number;
  lng?: number;
  personalAddress?: string;
  personalCity?: string;
  personalPostalCode?: string;
  personalCountry?: string;

  // Beschreibung und Services
  description?: string;
  skills?: string[];
  services?: string[]; // Legacy-Kompatibilität
  languages?: Array<{ language: string; proficiency: string }>;
  serviceAreas?: string[];

  // Stripe und Payment
  stripeAccountId?: string;
  stripeAccountChargesEnabled?: boolean;
  stripeAccountPayoutsEnabled?: boolean;
  stripeAccountDetailsSubmitted?: boolean;
  stripeAccountCreationDate?: string;

  // Taskilo E-Mail Integration
  taskiloEmailConnected?: boolean;
  taskiloEmail?: string;
  gmailConnected?: boolean;
  gmailEmail?: string;
  emailType?: string;

  // Geschäftsdaten
  businessType?: string;
  legalForm?: string;
  vatNumber?: string;
  vatId?: string;
  taxNumber?: string;
  taxRate?: string;
  kleinunternehmer?: string;

  // Kontaktperson
  accountHolder?: string;
  dateOfBirth?: string;

  // Bank und Finanzen
  iban?: string;
  bic?: string;
  bankName?: string;
  bankCountry?: string;
  employees?: string;
  hourlyRate?: number;
  priceInput?: string;
  profitMethod?: string;

  // Onboarding und Profile
  onboardingCompleted?: boolean;
  onboardingCompletionPercentage?: number;
  onboardingCurrentStep?: string;
  profileComplete?: boolean;
  documentsCompleted?: boolean;

  // Verfügbarkeit und Service
  availabilityType?: string;
  advanceBookingHours?: number;
  maxTravelDistance?: number;
  travelCosts?: boolean;
  travelCostPerKm?: number;
  radiusKm?: number;

  // Bilder und Medien
  profilePictureURL?: string;
  profileBannerImage?: string;
  profilePictureFirebaseUrl?: string;

  // Portfolio und Projekte
  portfolio?: Array<{
    id: string;
    imageUrl: string;
    additionalImages?: string[];
    title: string;
    description: string;
    category?: string;
    featured?: boolean;
    order?: number;
    createdAt?: string;
    technologies?: string[];
  }>;
  portfolioItems?: any[];
  certifications?: any[];

  // Dokumente
  identityFrontUrl?: string;
  identityBackUrl?: string;
  businessLicenseURL?: string;
  companyRegister?: string;
  hasIdentityDocuments?: boolean;
  hasBusinessLicense?: boolean;
  hasCompanyRegister?: boolean;

  // Management
  isManagingDirectorOwner?: boolean;

  // Platform-Daten
  totalOrders: number;
  totalRevenue: number;
  avgRating: number;
  reviewCount: number;
  verified: boolean;
  verificationStatus: string;
  lastVerificationUpdate?: string;

  // Detaillierte Statistiken (optional, von erweiterter API)
  auftraegeCount?: number;
  auftraegeRevenue?: number;
  quotesCount?: number;
  quotesRevenue?: number;
  completedOrders?: number;

  // Admin Approval System
  adminApproved?: boolean;
  adminApprovedAt?: string;
  adminApprovedBy?: string;
  adminNotes?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'needs_review';
  accountSuspended?: boolean;
  suspendedAt?: string;
  suspendedBy?: string;
  suspensionReason?: string;
}

interface SupportTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
}

export default function AdminCompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; title: string } | null>(
    null
  );
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const companyId = params?.id as string;

  // Vordefinierte Nachrichten-Templates
  const messageTemplates = [
    {
      label: 'Banner-Bild fehlt',
      subject: 'Bitte laden Sie ein Banner-Bild hoch',
      message: `Sehr geehrte Damen und Herren,

wir haben festgestellt, dass Ihr Firmenprofil noch kein Banner-Bild enthält. Ein professionelles Banner verbessert die Sichtbarkeit Ihres Unternehmens erheblich.

Bitte laden Sie ein Banner-Bild in Ihrem Dashboard unter Einstellungen > Profilbilder hoch.

Empfohlene Größe: 1200x400 Pixel
Format: JPG oder PNG

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Ihr Taskilo Team`,
    },
    {
      label: 'Dokumente unvollständig',
      subject: 'Fehlende Dokumente in Ihrem Profil',
      message: `Sehr geehrte Damen und Herren,

zur Verifizierung Ihres Accounts benötigen wir noch folgende Dokumente:

- Gewerbeschein / Handelsregisterauszug
- Ausweisdokument (Vorder- und Rückseite)

Bitte laden Sie diese im Onboarding-Bereich hoch.

Mit freundlichen Grüßen,
Ihr Taskilo Team`,
    },
    {
      label: 'Profil unvollständig',
      subject: 'Bitte vervollständigen Sie Ihr Profil',
      message: `Sehr geehrte Damen und Herren,

Ihr Firmenprofil ist noch nicht vollständig. Um alle Funktionen nutzen zu können, vervollständigen Sie bitte Ihr Profil.

Besuchen Sie dazu: Dashboard > Einstellungen > Profil

Mit freundlichen Grüßen,
Ihr Taskilo Team`,
    },
  ];

  // Manueller Webmail-Profil-Sync
  const handleSyncWebmailProfile = async () => {
    if (!company || !company.taskiloEmail) {
      alert('Keine Taskilo E-Mail verbunden');
      return;
    }

    setIsSyncingProfile(true);
    try {
      const response = await fetch('/api/admin/sync-webmail-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          taskiloEmail: company.taskiloEmail,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        let message = 'Sync erfolgreich!';
        if (result.verifiedPhone) {
          message += `\nVerifizierte Telefonnummer: ${result.verifiedPhone}`;
        }
        if (result.phoneUpdated) {
          message += '\nFirebase-Telefonnummer wurde aktualisiert.';
        }
        alert(message);
        await loadCompanyDetails();
      } else {
        alert(`Sync fehlgeschlagen: ${result.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      alert('Netzwerkfehler beim Sync');
    } finally {
      setIsSyncingProfile(false);
    }
  };

  const handleSendMessage = async () => {
    if (!company || !contactSubject.trim() || !contactMessage.trim()) return;

    setIsSendingMessage(true);
    try {
      // Multi-Channel Benachrichtigung senden
      const response = await fetch('/api/admin/contact-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          companyName: company.companyName,
          companyEmail: company.email,
          companyPhone: company.phone,
          taskiloEmail: company.taskiloEmail,
          title: contactSubject,
          message: contactMessage,
          priority: 'medium',
          category: 'admin-kontakt',
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Erfolgreich - Modal schließen und Tickets neu laden
        setShowContactModal(false);
        setContactSubject('');
        setContactMessage('');
        await loadCompanyDetails();
        
        // Detaillierte Erfolgsmeldung
        const { summary } = result;
        let alertMessage = `Ticket ${result.ticketId} erstellt.\n\n`;
        
        if (summary.successChannels.length > 0) {
          alertMessage += `Erfolgreich gesendet über:\n${summary.successChannels.map((c: string) => `  - ${c}`).join('\n')}\n`;
        }
        
        if (summary.failedChannels.length > 0) {
          alertMessage += `\nFehlgeschlagen:\n${summary.failedChannels.map((c: string) => `  - ${c}`).join('\n')}`;
        }
        
        alert(alertMessage);
      } else {
        alert(`Fehler: ${result.error || 'Nachricht konnte nicht gesendet werden'}`);
      }
    } catch (error) {
      alert('Netzwerkfehler beim Senden der Nachricht');
    } finally {
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadCompanyDetails();
    }
  }, [companyId]);

  const loadCompanyDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/companies/${companyId}?t=${Date.now()}`); // Cache-Busting
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
        setSupportTickets(data.supportTickets || []);
        setLastUpdated(new Date());
      } else {
        console.error('❌ Fehler beim Laden der Unternehmensdaten:', response.status);
      }
    } catch (error) {
      console.error('❌ Netzwerkfehler beim Laden der Unternehmensdaten:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDocument = (url: string, title: string) => {
    setSelectedDocument({ url, title });
  };

  const downloadDocument = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApprovalAction = async (
    action: 'approve' | 'reject' | 'suspend' | 'unsuspend',
    notes: string = ''
  ) => {
    if (!company) return;

    setIsUpdatingApproval(true);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes,
          adminId: 'current-admin', // TODO: Get from auth context
        }),
      });

      if (response.ok) {
        // Reload company details to get updated status
        await loadCompanyDetails();
        setAdminNotes('');
        const actionText = {
          approve: 'freigegeben',
          reject: 'abgelehnt',
          suspend: 'gesperrt',
          unsuspend: 'entsperrt',
        }[action];
        alert(`Unternehmen wurde erfolgreich ${actionText}.`);
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren des Status');
    } finally {
      setIsUpdatingApproval(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!company) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Unternehmen wurde erfolgreich gelöscht.');
        router.push('/dashboard/admin/companies');
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      alert('Fehler beim Löschen des Unternehmens');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getApprovalStatusBadge = (status?: string, adminApproved?: boolean) => {
    if (adminApproved) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Admin Freigegeben
        </Badge>
      );
    }

    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Freigegeben
          </Badge>
        );

      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800">
            <Ban className="h-3 w-3 mr-1" />
            Abgelehnt
          </Badge>
        );

      case 'needs_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Überprüfung erforderlich</Badge>;
      default:
        return <Badge className="bg-orange-100 text-orange-800">Ausstehende Freigabe</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Aktiv</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inaktiv</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Gesperrt</Badge>;
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verifiziert
          </Badge>
        );

      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Ausstehend</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Abgelehnt</Badge>;
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unternehmen nicht gefunden</h1>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{company.companyName}</h1>
            <div className="flex items-center space-x-4">
              <p className="text-gray-600">Unternehmen #{company.id}</p>
              {lastUpdated && (
                <p className="text-xs text-gray-500">
                  Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString('de-DE')}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(company.status)}
          {getVerificationBadge(company.verificationStatus)}
          {getApprovalStatusBadge(company.approvalStatus, company.adminApproved)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          onClick={loadCompanyDetails}
          disabled={loading}
          variant="outline"
          className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14ad9f] mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Lädt...' : 'Aktualisieren'}
        </Button>
        <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
          <Edit className="h-4 w-4 mr-2" />
          Bearbeiten
        </Button>
        <Button variant="outline">
          <Mail className="h-4 w-4 mr-2" />
          E-Mail senden
        </Button>
        <Button
          variant="outline"
          className={`${company.accountSuspended ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
          onClick={() =>
            handleApprovalAction(company.accountSuspended ? 'unsuspend' : 'suspend', '')
          }
          disabled={isUpdatingApproval}
        >
          <Ban className="h-4 w-4 mr-2" />
          {company.accountSuspended ? 'Entsperren' : 'Sperren'}
        </Button>
        <Button
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Löschen
        </Button>
        <Button
          variant="outline"
          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 border-teal-300"
          onClick={() => setShowContactModal(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Firma kontaktieren
        </Button>
      </div>

      {/* Contact Company Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-teal-600" />
              Firma kontaktieren
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Erstellen Sie ein Support-Ticket für <strong>{company.companyName}</strong>. 
                Die Firma wird im Dashboard darüber benachrichtigt.
              </p>
              
              {/* Notification Channels Status */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Benachrichtigungskanäle:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${company.email ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-gray-600">E-Mail: {company.email || 'Keine'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${company.taskiloEmail ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className="text-gray-600">Taskilo E-Mail: {company.taskiloEmail || 'Nicht verbunden'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${company.phone && company.phoneVerifiedFromWebmail ? 'bg-green-500' : company.phone ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                    <span className="text-gray-600">
                      SMS/WhatsApp: {company.phone || 'Keine Nummer'}
                      {company.phoneVerifiedFromWebmail && <span className="text-green-600 ml-1">(verifiziert)</span>}
                      {company.phone && !company.phoneVerifiedFromWebmail && <span className="text-yellow-600 ml-1">(nicht verifiziert)</span>}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-2 bg-green-500"></span>
                    <span className="text-gray-600">Dashboard: Immer aktiv</span>
                  </div>
                </div>
                {!company.phone && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    SMS/WhatsApp nicht möglich - keine Telefonnummer hinterlegt. Bitte Webmail-Profil synchronisieren.
                  </p>
                )}
              </div>
              
              {/* Quick Templates */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Schnellauswahl:</label>
                <div className="flex flex-wrap gap-2">
                  {messageTemplates.map((template, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setContactSubject(template.subject);
                        setContactMessage(template.message);
                      }}
                      className="text-xs"
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Betreff *</label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="Betreff der Nachricht..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nachricht *</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Ihre Nachricht an die Firma..."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowContactModal(false);
                  setContactSubject('');
                  setContactMessage('');
                }}
                disabled={isSendingMessage}
              >
                Abbrechen
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleSendMessage}
                disabled={isSendingMessage || !contactSubject.trim() || !contactMessage.trim()}
              >
                {isSendingMessage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Nachricht senden
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unternehmen löschen
            </h3>
            <p className="text-gray-600 mb-4">
              Möchten Sie <strong>{company.companyName}</strong> wirklich dauerhaft löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden und löscht alle zugehörigen 
              Daten (Kunden, Aufträge, Angebote, Rechnungen, etc.).
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Abbrechen
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteCompany}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Wird gelöscht...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Endgültig löschen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grundinformationen */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarif & Abonnement - nur anzeigen wenn Onboarding abgeschlossen */}
          {company.onboardingCompleted && (
            <>
              <CompanySubscriptionCard companyId={companyId} />
              {/* Testphase & Promo-Codes */}
              <PromoCodeCard companyId={companyId} />
            </>
          )}

          {/* Onboarding-Hinweis wenn nicht abgeschlossen */}
          {!company.onboardingCompleted && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-800">
                  <Settings className="h-5 w-5 mr-2 animate-spin" />
                  Onboarding nicht abgeschlossen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-amber-700">
                  Diese Firma hat das Onboarding noch nicht abgeschlossen. 
                  Tarif- und Abonnement-Informationen werden nach Abschluss des Onboardings angezeigt.
                </p>
                {company.onboardingCompletionPercentage !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-amber-600 mb-1">
                      <span>Fortschritt</span>
                      <span>{company.onboardingCompletionPercentage}%</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full transition-all" 
                        style={{ width: `${company.onboardingCompletionPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Grundinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Firmenname</label>
                  <p className="font-medium">{company.companyName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">E-Mail</label>
                  <p className="font-medium flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {company.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Branche</label>
                  <p className="font-medium">{company.industry || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Subkategorie</label>
                  <p className="font-medium">{company.selectedSubcategory || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telefon</label>
                  <p className="font-medium flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {company.phone || 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Website</label>
                  <p className="font-medium flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-gray-400" />
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#14ad9f] hover:underline"
                      >
                        {company.website}
                      </a>
                    ) : (
                      'Nicht angegeben'
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">USt-IdNr.</label>
                  <p className="font-medium">
                    {company.vatId || company.vatNumber || 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Steuernummer</label>
                  <p className="font-medium">
                    {company.taxNumber || company.taxNumberForBackend || 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Rechtsform</label>
                  <p className="font-medium">{company.legalForm || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mitarbeiter</label>
                  <p className="font-medium">{company.employees || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stundensatz</label>
                  <p className="font-medium">
                    {company.hourlyRate ? `${company.hourlyRate}€/h` : 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Kleinunternehmer</label>
                  <p className="font-medium">{company.kleinunternehmer === 'ja' ? 'Ja' : 'Nein'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Holder</label>
                  <p className="font-medium">{company.accountHolder || 'Nicht angegeben'}</p>
                </div>
              </div>

              {/* Taskilo E-Mail Integration */}
              <Separator />
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Taskilo E-Mail Integration
                </label>
                <div className="mt-2 space-y-3">
                  {company.taskiloEmailConnected ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verbunden
                        </Badge>
                        <span className="font-medium text-[#14ad9f]">{company.taskiloEmail}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSyncWebmailProfile}
                        disabled={isSyncingProfile}
                        className="flex items-center gap-2"
                      >
                        {isSyncingProfile ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {isSyncingProfile ? 'Synchronisiere...' : 'Webmail-Profil synchronisieren'}
                      </Button>
                      <p className="text-xs text-gray-500">
                        Synchronisiert Firebase-Daten mit dem Webmail-Server und holt die verifizierte Telefonnummer.
                      </p>
                    </>
                  ) : company.gmailConnected ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">Gmail verbunden</Badge>
                      <span className="font-medium">{company.gmailEmail}</span>
                    </div>
                  ) : company.emailType === 'skip' ? (
                    <Badge className="bg-gray-100 text-gray-600">Übersprungen</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">Nicht eingerichtet</Badge>
                  )}
                </div>
              </div>

              {company.description && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Beschreibung</label>
                    <p className="mt-1 text-gray-700">{company.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Adresse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Straße</label>
                  <p className="font-medium">{company.address || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stadt</label>
                  <p className="font-medium">{company.city || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">PLZ</label>
                  <p className="font-medium">{company.postalCode || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Land</label>
                  <p className="font-medium">{company.country || 'Nicht angegeben'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills und Services */}
          {((company.skills && company.skills.length > 0) ||
            (company.services && company.services.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Skills & Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.skills && company.skills.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {company.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {company.services && company.services.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      Services (Legacy)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {company.services.map((service, index) => (
                        <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {company.serviceAreas && company.serviceAreas.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      Service-Bereiche
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {company.serviceAreas.map((area, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-purple-50 text-purple-700"
                        >
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {company.languages && company.languages.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Sprachen</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {company.languages.map((lang, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center bg-gray-50 p-2 rounded"
                        >
                          <span className="font-medium">{lang.language}</span>
                          <Badge variant="outline" className="text-xs">
                            {lang.proficiency}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {company.availabilityType && (
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Verfügbarkeitstyp
                        </label>
                        <p className="font-medium">{company.availabilityType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Vorlaufzeit (Stunden)
                        </label>
                        <p className="font-medium">
                          {company.advanceBookingHours || 'Nicht gesetzt'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Max. Reiseentfernung
                        </label>
                        <p className="font-medium">
                          {company.maxTravelDistance
                            ? `${company.maxTravelDistance} km`
                            : 'Nicht gesetzt'}
                        </p>
                      </div>
                    </div>

                    {(company.travelCosts || company.travelCostPerKm) && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded border">
                        <h4 className="font-medium text-yellow-800 mb-2">Reisekosten</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm text-yellow-700">Reisekosten berechnen</label>
                            <p className="font-medium text-yellow-800">
                              {company.travelCosts ? 'Ja' : 'Nein'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm text-yellow-700">Kosten pro km</label>
                            <p className="font-medium text-yellow-800">
                              {company.travelCostPerKm
                                ? `${company.travelCostPerKm}€`
                                : 'Nicht gesetzt'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Profilbilder */}
          {(company.profilePictureURL || company.profileBannerImage) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Image className="h-5 w-5 mr-2" />
                  Profilbilder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.profilePictureURL && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Profilbild</h4>
                      <Badge className="bg-blue-100 text-blue-800">Verfügbar</Badge>
                    </div>
                    <div className="flex items-center space-x-4">
                      <img
                        src={company.profilePictureURL}
                        alt="Profilbild"
                        className="h-16 w-16 rounded-lg object-cover border"
                      />

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocument(company.profilePictureURL!, 'Profilbild')}
                          title="Vollbild anzeigen"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadDocument(company.profilePictureURL!, 'profilbild.jpg')
                          }
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {company.profileBannerImage && !company.profileBannerImage.startsWith('blob:') && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Banner-Bild</h4>
                      <Badge className="bg-blue-100 text-blue-800">Verfügbar</Badge>
                    </div>
                    <div className="flex items-center space-x-4">
                      <img
                        src={company.profileBannerImage}
                        alt="Banner-Bild"
                        className="h-16 w-24 rounded-lg object-cover border"
                        onError={(e) => {
                          // Verstecke das Bild wenn es nicht geladen werden kann
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocument(company.profileBannerImage!, 'Banner-Bild')}
                          title="Vollbild anzeigen"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadDocument(company.profileBannerImage!, 'banner.jpg')
                          }
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Portfolio */}
          {company.portfolio && company.portfolio.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileImage className="h-5 w-5 mr-2" />
                  Portfolio ({company.portfolio.length} Projekte)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.portfolio.map((project, index) => (
                  <div key={project.id || index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-4">
                      {/* Hauptbild */}
                      {project.imageUrl && (
                        <div className="shrink-0">
                          <img
                            src={project.imageUrl}
                            alt={project.title}
                            className="h-20 w-20 rounded-lg object-cover border cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() =>
                              openDocument(project.imageUrl, `${project.title} - Hauptbild`)
                            }
                          />
                        </div>
                      )}

                      {/* Projektinfo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 truncate">{project.title}</h4>
                          {project.featured && (
                            <Badge className="bg-yellow-100 text-yellow-800 ml-2">Featured</Badge>
                          )}
                          {project.category && (
                            <Badge variant="outline" className="ml-2">
                              {project.category}
                            </Badge>
                          )}
                        </div>

                        {project.description && (
                          <p
                            className="text-sm text-gray-600 mb-3"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {project.description}
                          </p>
                        )}

                        {/* Zusätzliche Bilder */}
                        {project.additionalImages && project.additionalImages.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500">
                              Zusätzliche Bilder ({project.additionalImages.length})
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {project.additionalImages.map((image, imgIndex) => (
                                <img
                                  key={imgIndex}
                                  src={image}
                                  alt={`${project.title} - Bild ${imgIndex + 1}`}
                                  className="h-12 w-12 rounded object-cover border cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() =>
                                    openDocument(image, `${project.title} - Bild ${imgIndex + 1}`)
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Technologien */}
                        {project.technologies && project.technologies.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {project.technologies.map((tech, techIndex) => (
                                <Badge key={techIndex} variant="outline" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Datum */}
                        {project.createdAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Erstellt: {new Date(project.createdAt).toLocaleDateString('de-DE')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Support-Tickets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Support-Tickets
                  {supportTickets.length > 0 && (
                    <Badge className="ml-2 bg-teal-100 text-teal-800">{supportTickets.length}</Badge>
                  )}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/admin/tickets?email=${company?.email}`)}
                >
                  Alle anzeigen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {supportTickets.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Keine Support-Tickets vorhanden</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supportTickets.map((ticket) => (
                    <div 
                      key={ticket.id} 
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/admin/tickets?id=${ticket.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate flex-1">
                          {ticket.title}
                        </h4>
                        <div className="flex gap-1 ml-2">
                          <Badge className={
                            ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                            ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {ticket.status === 'open' ? 'Offen' :
                             ticket.status === 'in-progress' ? 'In Bearbeitung' :
                             ticket.status === 'resolved' ? 'Gelöst' : 'Geschlossen'}
                          </Badge>
                          <Badge className={
                            ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {ticket.priority === 'urgent' ? 'Dringend' :
                             ticket.priority === 'high' ? 'Hoch' :
                             ticket.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Kategorie: {ticket.category}</span>
                        <span>{ticket.commentsCount} Kommentare</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Erstellt: {new Date(ticket.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Google Ads Integration Request */}
          <GoogleAdsIntegrationRequest companyId={companyId} />

          {/* Statistiken */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Statistiken
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Gesamtumsatz</label>
                <p className="text-2xl font-bold text-green-600">
                  €
                  {company.totalRevenue.toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                {(company.auftraegeRevenue || company.quotesRevenue) && (
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    {company.auftraegeRevenue && (
                      <div>
                        Aufträge: €
                        {company.auftraegeRevenue.toLocaleString('de-DE', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    )}
                    {company.quotesRevenue && (
                      <div>
                        Quotes: €
                        {company.quotesRevenue.toLocaleString('de-DE', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Gesamtbestellungen</label>
                <p className="text-2xl font-bold">{company.totalOrders}</p>
                {(company.auftraegeCount || company.quotesCount) && (
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    {company.auftraegeCount !== undefined && (
                      <div>Aufträge: {company.auftraegeCount}</div>
                    )}
                    {company.quotesCount !== undefined && (
                      <div>Bezahlte Quotes: {company.quotesCount}</div>
                    )}
                    {company.completedOrders !== undefined && (
                      <div>Abgeschlossen: {company.completedOrders}</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Durchschnittsbewertung</label>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 mr-1" />
                  <span className="text-2xl font-bold">{company.avgRating.toFixed(1)}</span>
                  <span className="text-gray-500 ml-2">({company.reviewCount} Bewertungen)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Zahlungsinfo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Stripe Account ID</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {company.stripeAccountId || 'Nicht verbunden'}
                </p>
              </div>

              {company.stripeAccountId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Charges aktiviert</span>
                    <Badge
                      className={
                        company.stripeAccountChargesEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {company.stripeAccountChargesEnabled ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payouts aktiviert</span>
                    <Badge
                      className={
                        company.stripeAccountPayoutsEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {company.stripeAccountPayoutsEnabled ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Details übermittelt</span>
                    <Badge
                      className={
                        company.stripeAccountDetailsSubmitted
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {company.stripeAccountDetailsSubmitted ? 'Ja' : 'Nein'}
                    </Badge>
                  </div>

                  {company.stripeAccountCreationDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account erstellt</label>
                      <p className="text-sm">
                        {new Date(company.stripeAccountCreationDate).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(company.iban || company.bic || company.bankName) && (
                <div className="border-t pt-3 space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Bankverbindung</h4>

                  {company.iban && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">IBAN</label>
                      <p className="font-mono text-sm bg-gray-100 p-2 rounded">{company.iban}</p>
                    </div>
                  )}

                  {company.bic && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">BIC</label>
                      <p className="font-mono text-sm bg-gray-100 p-2 rounded">{company.bic}</p>
                    </div>
                  )}

                  {company.bankName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bank</label>
                      <p className="text-sm bg-gray-100 p-2 rounded">{company.bankName}</p>
                    </div>
                  )}

                  {company.accountHolder && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Kontoinhaber</label>
                      <p className="text-sm bg-gray-100 p-2 rounded">{company.accountHolder}</p>
                    </div>
                  )}

                  {company.bankCountry && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Land</label>
                      <p className="text-sm">{company.bankCountry}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Geschäftsdaten & Steuerliche Informationen */}
          {(company.vatId ||
            company.taxNumber ||
            company.kleinunternehmer ||
            company.legalForm ||
            company.businessType ||
            company.accountHolder) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Geschäftsdaten & Steuern
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.legalForm && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Rechtsform</label>
                      <p className="font-medium">{company.legalForm}</p>
                    </div>
                  )}

                  {company.businessType && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Geschäftstyp</label>
                      <p className="font-medium">{company.businessType}</p>
                    </div>
                  )}

                  {company.accountHolder && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Kontoinhaber</label>
                      <p className="font-medium">{company.accountHolder}</p>
                    </div>
                  )}

                  {company.employees && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mitarbeiter</label>
                      <p className="font-medium">{company.employees}</p>
                    </div>
                  )}
                </div>

                {(company.vatId || company.taxNumber || company.kleinunternehmer) && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Steuerliche Informationen</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {company.vatId && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">USt-IdNr.</label>
                          <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                            {company.vatId}
                          </p>
                        </div>
                      )}

                      {company.taxNumber && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Steuernummer</label>
                          <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                            {company.taxNumber}
                          </p>
                        </div>
                      )}

                      {company.kleinunternehmer && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Kleinunternehmer (§19 UStG)
                          </label>
                          <Badge
                            className={
                              company.kleinunternehmer === 'ja'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {company.kleinunternehmer === 'ja' ? 'Ja' : 'Nein'}
                          </Badge>
                        </div>
                      )}

                      {company.taxRate && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Steuersatz</label>
                          <p className="font-medium">{company.taxRate}%</p>
                        </div>
                      )}

                      {company.priceInput && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Preiseingabe</label>
                          <Badge variant="outline">
                            {company.priceInput === 'netto' ? 'Netto' : 'Brutto'}
                          </Badge>
                        </div>
                      )}

                      {company.profitMethod && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Gewinnermittlung
                          </label>
                          <Badge variant="outline">
                            {company.profitMethod === 'euer' ? 'EÜR' : 'Bilanz'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Zertifikate */}
          {company.certifications && company.certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Zertifikate ({company.certifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.certifications.map((cert, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {cert.name || cert.title || `Zertifikat ${index + 1}`}
                        </h4>
                        {cert.issuer && (
                          <p className="text-sm text-gray-600">Ausgestellt von: {cert.issuer}</p>
                        )}
                        {cert.date && (
                          <p className="text-xs text-gray-500">
                            Datum: {new Date(cert.date).toLocaleDateString('de-DE')}
                          </p>
                        )}
                      </div>
                      {cert.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocument(cert.url, cert.name || 'Zertifikat')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Admin Freigabe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Admin Freigabe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  {getApprovalStatusBadge(company.approvalStatus, company.adminApproved)}
                </div>
              </div>

              {company.adminApprovedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Freigegeben am</label>
                  <p className="text-sm">
                    {new Date(company.adminApprovedAt).toLocaleDateString('de-DE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {company.adminApprovedBy && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Freigegeben von</label>
                  <p className="text-sm">{company.adminApprovedBy}</p>
                </div>
              )}

              {company.adminNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Notizen</label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{company.adminNotes}</p>
                </div>
              )}

              {!company.adminApproved && company.approvalStatus !== 'approved' && (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <label htmlFor="adminNotes" className="text-sm font-medium text-gray-700">
                      Notizen (optional)
                    </label>
                    <textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#14ad9f] focus:ring-[#14ad9f] sm:text-sm"
                      rows={3}
                      placeholder="Interne Notizen oder Begründung..."
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApprovalAction('approve', adminNotes)}
                      disabled={isUpdatingApproval}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isUpdatingApproval ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Freigeben
                    </Button>
                    <Button
                      onClick={() => handleApprovalAction('reject', adminNotes)}
                      disabled={isUpdatingApproval}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {isUpdatingApproval ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2" />
                      ) : (
                        <Ban className="h-4 w-4 mr-2" />
                      )}
                      Ablehnen
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account-Sperrung Verwaltung */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Account-Sperrung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.accountSuspended && (
                <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <Ban className="h-5 w-5 mr-2 text-red-600" />
                    <span className="font-medium text-red-800">Account ist gesperrt</span>
                  </div>

                  {company.suspendedAt && (
                    <div>
                      <label className="text-sm font-medium text-red-700">Gesperrt am</label>
                      <p className="text-sm text-red-600">
                        {new Date(company.suspendedAt).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}

                  {company.suspendedBy && (
                    <div>
                      <label className="text-sm font-medium text-red-700">Gesperrt von</label>
                      <p className="text-sm text-red-600">{company.suspendedBy}</p>
                    </div>
                  )}

                  {company.suspensionReason && (
                    <div>
                      <label className="text-sm font-medium text-red-700">Sperrgrund</label>
                      <p className="text-sm bg-red-100 p-2 rounded text-red-800">
                        {company.suspensionReason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label htmlFor="suspensionNotes" className="text-sm font-medium text-gray-700">
                    {company.accountSuspended ? 'Entsperrungs-Notizen' : 'Sperrgrund'} (optional)
                  </label>
                  <textarea
                    id="suspensionNotes"
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#14ad9f] focus:ring-[#14ad9f] sm:text-sm"
                    rows={3}
                    placeholder={
                      company.accountSuspended
                        ? 'Grund für Entsperrung...'
                        : 'Grund für Sperrung...'
                    }
                  />
                </div>

                <div className="flex space-x-2">
                  {company.accountSuspended ? (
                    <Button
                      onClick={() => handleApprovalAction('unsuspend', adminNotes)}
                      disabled={isUpdatingApproval}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isUpdatingApproval ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Account entsperren
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleApprovalAction('suspend', adminNotes)}
                      disabled={isUpdatingApproval}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {isUpdatingApproval ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2" />
                      ) : (
                        <Ban className="h-4 w-4 mr-2" />
                      )}
                      Account sperren
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Wichtige Daten & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Registriert</label>
                <p>{new Date(company.createdAt).toLocaleDateString('de-DE')}</p>
              </div>

              {company.onboardingCompletedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Onboarding abgeschlossen
                  </label>
                  <p>{new Date(company.onboardingCompletedAt).toLocaleDateString('de-DE')}</p>
                </div>
              )}

              {company.lastLogin && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Letzter Login</label>
                  <p>{new Date(company.lastLogin).toLocaleDateString('de-DE')}</p>
                </div>
              )}

              {company.lastVerificationUpdate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Letzte Verifizierung</label>
                  <p>{new Date(company.lastVerificationUpdate).toLocaleDateString('de-DE')}</p>
                </div>
              )}

              <Separator />

              {company.onboardingCompleted !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Onboarding Status</span>
                  <Badge
                    className={
                      company.onboardingCompleted
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {company.onboardingCompleted ? 'Abgeschlossen' : 'Ausstehend'}
                  </Badge>
                </div>
              )}

              {company.onboardingCompletionPercentage !== undefined && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Fortschritt</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#14ad9f] h-2 rounded-full"
                        style={{ width: `${company.onboardingCompletionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {company.onboardingCompletionPercentage}%
                    </span>
                  </div>
                </div>
              )}

              {company.profileComplete !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Profil vollständig</span>
                  <Badge
                    className={
                      company.profileComplete
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {company.profileComplete ? 'Ja' : 'Nein'}
                  </Badge>
                </div>
              )}

              {company.documentsCompleted !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Dokumente vollständig</span>
                  <Badge
                    className={
                      company.documentsCompleted
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {company.documentsCompleted ? 'Ja' : 'Nein'}
                  </Badge>
                </div>
              )}

              {(company.hasIdentityDocuments ||
                company.hasBusinessLicense ||
                company.hasCompanyRegister ||
                company.identityFrontUrl ||
                company.identityBackUrl ||
                company.businessLicenseURL ||
                company.companyRegister) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-500">
                      Hochgeladene Dokumente
                    </label>

                    {/* Ausweisdokumente */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          <FileImage className="h-4 w-4 mr-2 text-blue-600" />
                          Ausweisdokumente
                        </h4>
                        <Badge
                          className={
                            company.identityFrontUrl || company.identityBackUrl
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {company.identityFrontUrl || company.identityBackUrl
                            ? 'Hochgeladen'
                            : 'Fehlend'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {/* Ausweis Vorderseite */}
                        <div className="bg-white p-3 rounded border">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-sm text-gray-600 font-medium">
                              Ausweis Vorderseite
                            </span>
                            {company.identityFrontUrl ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openDocument(company.identityFrontUrl!, 'Ausweis Vorderseite')
                                  }
                                  className="shrink-0"
                                  title="Anzeigen"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    downloadDocument(
                                      company.identityFrontUrl!,
                                      'ausweis_vorderseite.jpg'
                                    )
                                  }
                                  className="shrink-0"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                Nicht hochgeladen
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Ausweis Rückseite */}
                        <div className="bg-white p-3 rounded border">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-sm text-gray-600 font-medium">
                              Ausweis Rückseite
                            </span>
                            {company.identityBackUrl ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openDocument(company.identityBackUrl!, 'Ausweis Rückseite')
                                  }
                                  className="shrink-0"
                                  title="Anzeigen"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    downloadDocument(
                                      company.identityBackUrl!,
                                      'ausweis_rueckseite.jpg'
                                    )
                                  }
                                  className="shrink-0"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                Nicht hochgeladen
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gewerbeschein */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-purple-600" />
                          Gewerbeschein
                        </h4>
                        <Badge
                          className={
                            company.businessLicenseURL
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {company.businessLicenseURL ? 'Hochgeladen' : 'Fehlend'}
                        </Badge>
                      </div>
                      {company.businessLicenseURL ? (
                        <div className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm text-gray-600">Gewerbeschein Dokument</span>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openDocument(company.businessLicenseURL!, 'Gewerbeschein')
                              }
                              title="Anzeigen"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                downloadDocument(company.businessLicenseURL!, 'gewerbeschein.pdf')
                              }
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-2 rounded border text-center">
                          <span className="text-sm text-gray-500">
                            Kein Gewerbeschein hochgeladen
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Handelsregister */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-green-600" />
                          Handelsregister
                        </h4>
                        <Badge
                          className={
                            company.companyRegister
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {company.companyRegister ? 'Eingetragen' : 'Optional'}
                        </Badge>
                      </div>
                      {company.companyRegister ? (
                        <div className="bg-white p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-gray-600">Handelsregister-Nummer</span>
                              <p className="font-mono text-sm font-medium">
                                {company.companyRegister}
                              </p>
                            </div>
                            {/* Prüfe ob es eine URL ist oder nur eine Nummer */}
                            {company.companyRegister.startsWith('http') ||
                            company.companyRegister.includes('.') ? (
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openDocument(company.companyRegister!, 'Handelsregister')
                                  }
                                  title="Anzeigen"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    downloadDocument(
                                      company.companyRegister!,
                                      'handelsregister.pdf'
                                    )
                                  }
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-green-600">
                                Nummer registriert
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-2 rounded border text-center">
                          <span className="text-sm text-gray-500">
                            Kein Handelsregister-Auszug hochgeladen (nur für bestimmte Rechtsformen
                            erforderlich)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Zusammenfassung */}
                    {!company.identityFrontUrl &&
                      !company.identityBackUrl &&
                      !company.businessLicenseURL &&
                      !company.companyRegister && (
                        <div className="text-center py-4 text-gray-500 bg-red-50 rounded-lg border border-red-200">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-red-400" />
                          <p className="text-sm font-medium text-red-600">
                            Keine Dokumente hochgeladen
                          </p>
                          <p className="text-xs text-red-500 mt-1">
                            Für die Freigabe sind mindestens Ausweisdokumente und Gewerbeschein
                            erforderlich
                          </p>
                        </div>
                      )}
                  </div>
                </>
              )}

              {/* Zeige Dokumenten-Sektion immer an, auch wenn keine Dokumente vorhanden */}
              {!(
                company.hasIdentityDocuments ||
                company.hasBusinessLicense ||
                company.hasCompanyRegister ||
                company.identityFrontUrl ||
                company.identityBackUrl ||
                company.businessLicenseURL ||
                company.companyRegister
              ) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-500">Dokumente Status</label>

                    <div className="text-center py-6 text-gray-500 bg-red-50 rounded-lg border border-red-200">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-red-400" />
                      <p className="text-lg font-medium text-red-600 mb-2">
                        Keine Dokumente hochgeladen
                      </p>
                      <p className="text-sm text-red-500">
                        Für die Freigabe sind folgende Dokumente erforderlich:
                      </p>
                      <ul className="text-sm text-red-500 mt-2 space-y-1">
                        <li>• Personalausweis (Vorder- und Rückseite)</li>
                        <li>• Gewerbeschein</li>
                        <li>• Handelsregister-Auszug (falls erforderlich)</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedDocument.title}</h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedDocument.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Neues Fenster
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDocument(null)}>
                  Schließen
                </Button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              {/* Verbesserte Dokument-Erkennung */}
              {selectedDocument.url.toLowerCase().includes('.pdf') ||
              selectedDocument.url.includes('application/pdf') ||
              selectedDocument.title.toLowerCase().includes('handelsregister') ||
              selectedDocument.title.toLowerCase().includes('gewerbeschein') ||
              selectedDocument.url.includes('firebasestorage') ? (
                <>
                  {/* Für Firebase Storage URLs oder PDFs - versuche iframe zuerst */}
                  <iframe
                    src={selectedDocument.url}
                    className="w-full h-[600px]"
                    title={selectedDocument.title}
                    onError={e => {
                      console.error('❌ Iframe-Fehler für:', selectedDocument.url);
                      // Fallback: Link zum direkten Öffnen
                      const container = e.currentTarget.parentElement;
                      if (container) {
                        container.innerHTML = `
                          <div class="p-8 text-center">
                            <div class="mb-4">
                              <svg class="h-16 w-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                              </svg>
                            </div>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Dokument kann nicht angezeigt werden</h3>
                            <p class="text-gray-600 mb-4">Das Dokument kann in diesem Viewer nicht dargestellt werden.</p>
                            <a href="${selectedDocument.url}" target="_blank" rel="noopener noreferrer" 
                               class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                              <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                              </svg>
                              Dokument in neuem Tab öffnen
                            </a>
                          </div>
                        `;
                      }
                    }}
                  />
                </>
              ) : (
                <div className="p-4 flex justify-center">
                  <img
                    src={selectedDocument.url}
                    alt={selectedDocument.title}
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: 'calc(90vh - 120px)' }}
                    onError={e => {
                      console.error('❌ Bild-Fehler für:', selectedDocument.url);
                      const img = e.currentTarget;
                      const container = img.parentElement;
                      if (container) {
                        container.innerHTML = `
                          <div class="text-center py-8">
                            <div class="mb-4">
                              <svg class="h-16 w-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                              </svg>
                            </div>
                            <h3 class="text-lg font-medium text-red-600 mb-2">Bild kann nicht geladen werden</h3>
                            <p class="text-gray-600 mb-4">Die Bild-URL ist möglicherweise ungültig oder das Format wird nicht unterstützt.</p>
                            <div class="bg-gray-100 p-3 rounded text-xs font-mono break-all">
                              ${selectedDocument.url}
                            </div>
                            <a href="${selectedDocument.url}" target="_blank" rel="noopener noreferrer" 
                               class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4">
                              Direktlink versuchen
                            </a>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
