// Admin Company Details Page
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
}

export default function AdminCompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; title: string } | null>(
    null
  );
  const companyId = params?.id as string;

  useEffect(() => {
    if (companyId) {
      loadCompanyDetails();
    }
  }, [companyId]);

  const loadCompanyDetails = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
      } else {
        console.error('Failed to load company details');
      }
    } catch (error) {
      console.error('Error loading company details:', error);
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
            <p className="text-gray-600">Unternehmen #{company.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(company.status)}
          {getVerificationBadge(company.verificationStatus)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
          <Edit className="h-4 w-4 mr-2" />
          Bearbeiten
        </Button>
        <Button variant="outline">
          <Mail className="h-4 w-4 mr-2" />
          E-Mail senden
        </Button>
        <Button variant="outline" className="text-red-600 hover:text-red-700">
          <Ban className="h-4 w-4 mr-2" />
          Sperren
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grundinformationen */}
        <div className="lg:col-span-2 space-y-6">
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
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Vollbild
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadDocument(company.profilePictureURL!, 'profilbild.jpg')
                          }
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {company.profileBannerImage && (
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
                      />
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocument(company.profileBannerImage!, 'Banner-Bild')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Vollbild
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadDocument(company.profileBannerImage!, 'banner.jpg')
                          }
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                  €{company.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Gesamtbestellungen</label>
                <p className="text-2xl font-bold">{company.totalOrders}</p>
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

              {company.iban && (
                <div className="border-t pt-3">
                  <label className="text-sm font-medium text-gray-500">IBAN</label>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded">{company.iban}</p>
                </div>
              )}
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
                    {(company.identityFrontUrl || company.identityBackUrl) && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <FileImage className="h-4 w-4 mr-2 text-blue-600" />
                            Ausweisdokumente
                          </h4>
                          <Badge className="bg-green-100 text-green-800">Hochgeladen</Badge>
                        </div>
                        <div className="space-y-2">
                          {company.identityFrontUrl && (
                            <div className="flex items-center justify-between bg-white p-2 rounded border">
                              <span className="text-sm text-gray-600">Ausweis Vorderseite</span>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openDocument(company.identityFrontUrl!, 'Ausweis Vorderseite')
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Anzeigen
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
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          )}
                          {company.identityBackUrl && (
                            <div className="flex items-center justify-between bg-white p-2 rounded border">
                              <span className="text-sm text-gray-600">Ausweis Rückseite</span>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openDocument(company.identityBackUrl!, 'Ausweis Rückseite')
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Anzeigen
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
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Gewerbeschein */}
                    {company.businessLicenseURL && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-purple-600" />
                            Gewerbeschein
                          </h4>
                          <Badge className="bg-green-100 text-green-800">Hochgeladen</Badge>
                        </div>
                        <div className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm text-gray-600">Gewerbeschein Dokument</span>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openDocument(company.businessLicenseURL!, 'Gewerbeschein')
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Anzeigen
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                downloadDocument(company.businessLicenseURL!, 'gewerbeschein.pdf')
                              }
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Handelsregister */}
                    {company.companyRegister && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-green-600" />
                            Handelsregister
                          </h4>
                          <Badge className="bg-green-100 text-green-800">Hochgeladen</Badge>
                        </div>
                        <div className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm text-gray-600">Handelsregister Auszug</span>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openDocument(company.companyRegister!, 'Handelsregister')
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Anzeigen
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                downloadDocument(company.companyRegister!, 'handelsregister.pdf')
                              }
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status für fehlende Dokumente */}
                    {!company.identityFrontUrl &&
                      !company.identityBackUrl &&
                      !company.businessLicenseURL &&
                      !company.companyRegister && (
                        <div className="text-center py-4 text-gray-500">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Keine Dokumente hochgeladen</p>
                        </div>
                      )}
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
              {selectedDocument.url.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={selectedDocument.url}
                  className="w-full h-[600px]"
                  title={selectedDocument.title}
                />
              ) : (
                <div className="p-4 flex justify-center">
                  <img
                    src={selectedDocument.url}
                    alt={selectedDocument.title}
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: 'calc(90vh - 120px)' }}
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
