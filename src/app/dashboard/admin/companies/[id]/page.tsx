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
} from 'lucide-react';

interface CompanyDetails {
  id: string;
  email: string;
  name: string;
  companyName: string;
  industry?: string;
  website?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  description?: string;
  services?: string[];
  stripeAccountId?: string;
  verified: boolean;
  businessType?: string;
  vatNumber?: string;
  registrationNumber?: string;
  totalOrders: number;
  totalRevenue: number;
  avgRating: number;
  reviewCount: number;
  verificationStatus: string;
  lastVerificationUpdate?: string;
}

export default function AdminCompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
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
                  <p className="font-medium">{company.vatNumber || 'Nicht angegeben'}</p>
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

          {/* Services */}
          {company.services && company.services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Angebotene Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.services.map((service, index) => (
                    <Badge key={index} variant="outline">
                      {service}
                    </Badge>
                  ))}
                </div>
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
            <CardContent>
              <div>
                <label className="text-sm font-medium text-gray-500">Stripe Account ID</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {company.stripeAccountId || 'Nicht verbunden'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Wichtige Daten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Registriert</label>
                <p>{new Date(company.createdAt).toLocaleDateString('de-DE')}</p>
              </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
