'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

interface CustomerInfo {
  name: string;
  type: 'user' | 'company';
  email?: string;
  avatar?: string;
  uid: string;
}

interface QuoteRequest {
  id: string;
  title: string;
  description: string;
  customerUid?: string;
  customerCompanyUid?: string;
  providerUid: string;
  budget?: {
    min: number;
    max: number;
  };
  deadline?: string;
  status: 'pending' | 'accepted' | 'declined' | 'responded';
  createdAt: Date;
  customer?: CustomerInfo;
  location?: string;
  priority?: 'low' | 'medium' | 'high';
  providerResponse?: string;
  respondedAt?: Date;
  requirements?: string[];
  serviceType?: string;
}

export default function IncomingQuoteDetailPage() {
  const { user, firebaseUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.quoteId as string;

  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!firebaseUser || !user?.uid || !quoteId) return;

    fetchQuoteDetails();
  }, [firebaseUser, user, quoteId]);

  const fetchQuoteDetails = async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/company/${user?.uid}/quotes/incoming/${quoteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quote details');
      }

      const data = await response.json();
      if (data.success) {
        setQuote(data.quote);
      }
    } catch (error) {
      setError('Fehler beim Laden der Angebots-Details');
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteAction = async (action: 'accept' | 'decline') => {
    if (!firebaseUser || !user?.uid) return;

    setActionLoading(true);
    try {
      const token = await firebaseUser.getIdToken();

      const apiResponse = await fetch(`/api/company/${user.uid}/quotes/incoming/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          message: response.trim(),
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to ${action} quote`);
      }

      // Refresh quote details
      await fetchQuoteDetails();

      // Clear response field
      setResponse('');

      // Show success message or redirect
      router.push(`/dashboard/company/${user.uid}/orders/incoming/quotes?success=${action}`);
    } catch (error) {
      setError(`Fehler beim ${action === 'accept' ? 'Annehmen' : 'Ablehnen'} der Anfrage`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Wartend
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Angenommen
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Abgelehnt
          </Badge>
        );
      case 'responded':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Beantwortet
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;

    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Hoch</Badge>;
      case 'medium':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Mittel
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Niedrig
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatBudget = (budget?: { min: number; max: number }) => {
    if (!budget) return 'Nicht angegeben';
    return `${budget.min}€ - ${budget.max}€`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
            <p className="text-gray-600">Lade Angebots-Details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Angebots-Anfrage nicht gefunden'}</p>
            <Link href={`/dashboard/company/${user?.uid}/orders/incoming/quotes`}>
              <Button variant="outline">Zurück zur Übersicht</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/dashboard/company/${user?.uid}/orders/incoming/quotes`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          {getStatusBadge(quote.status)}
          {getPriorityBadge(quote.priority)}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{quote.title}</h1>
        <p className="text-gray-600">Angebots-Anfrage vom {formatDate(quote.createdAt)}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Hauptinhalt */}
        <div className="lg:col-span-2 space-y-6">
          {/* Beschreibung */}
          <Card>
            <CardHeader>
              <CardTitle>Projektbeschreibung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
            </CardContent>
          </Card>

          {/* Anforderungen */}
          {quote.requirements && quote.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Anforderungen</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {quote.requirements.map((requirement, index) => (
                    <li key={index} className="text-gray-700">
                      {requirement}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Antwort-Bereich */}
          {quote.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>Auf Anfrage antworten</CardTitle>
                <CardDescription>
                  Teilen Sie dem Kunden mit, ob Sie die Anfrage annehmen oder ablehnen möchten.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label
                    htmlFor="response"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nachricht an den Kunden (optional)
                  </label>
                  <Textarea
                    id="response"
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="Zusätzliche Informationen oder Nachfragen..."
                    rows={4}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleQuoteAction('accept')}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Wird bearbeitet...' : 'Anfrage annehmen'}
                  </Button>
                  <Button
                    onClick={() => handleQuoteAction('decline')}
                    disabled={actionLoading}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Wird bearbeitet...' : 'Anfrage ablehnen'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Antwort anzeigen */}
          {quote.providerResponse && (
            <Card>
              <CardHeader>
                <CardTitle>Ihre Antwort</CardTitle>
                <CardDescription>
                  Beantwortet am {quote.respondedAt ? formatDate(quote.respondedAt) : 'Unbekannt'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.providerResponse}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Seitenleiste */}
        <div className="space-y-6">
          {/* Kundeninformationen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {quote.customer?.type === 'company' ? (
                  <Building2 className="h-5 w-5 mr-2" />
                ) : (
                  <User className="h-5 w-5 mr-2" />
                )}
                Kundeninformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">{quote.customer?.name || 'Unbekannter Kunde'}</span>
                <div className="text-sm text-gray-600">
                  {quote.customer?.type === 'company' ? 'Unternehmen' : 'Privatperson'}
                </div>
              </div>

              {quote.customer?.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{quote.customer.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projektdetails */}
          <Card>
            <CardHeader>
              <CardTitle>Projektdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quote.serviceType && (
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Service-Art:</span>
                  <span className="text-gray-600">{quote.serviceType}</span>
                </div>
              )}

              <div className="flex items-center text-sm">
                <DollarSign className="h-4 w-4 mr-2" />
                <span className="font-medium mr-2">Budget:</span>
                <span className="text-gray-600">{formatBudget(quote.budget)}</span>
              </div>

              {quote.deadline && (
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="font-medium mr-2">Deadline:</span>
                  <span className="text-gray-600">
                    {new Date(quote.deadline).toLocaleDateString('de-DE')}
                  </span>
                </div>
              )}

              {quote.location && (
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="font-medium mr-2">Ort:</span>
                  <span className="text-gray-600">{quote.location}</span>
                </div>
              )}

              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2" />
                <span className="font-medium mr-2">Erstellt:</span>
                <span className="text-gray-600">{formatDate(quote.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
