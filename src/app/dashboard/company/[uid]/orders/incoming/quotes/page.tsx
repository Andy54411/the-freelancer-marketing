'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, User, Building2, Mail, Phone } from 'lucide-react';
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
}

export default function IncomingQuotesPage() {
  const { user, firebaseUser } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser || !user?.uid) return;

    fetchIncomingQuotes();
  }, [firebaseUser, user]);

  const fetchIncomingQuotes = async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/company/${user?.uid}/quotes/incoming`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch incoming quotes');
      }

      const data = await response.json();
      if (data.success) {
        setQuotes(data.quotes);
      }
    } catch (error) {
      console.error('Error fetching incoming quotes:', error);
      setError('Fehler beim Laden der Angebots-Anfragen');
    } finally {
      setLoading(false);
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
        return (
          <Badge variant="destructive" className="ml-2">
            Hoch
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-700 border-orange-200">
            Mittel
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-700 border-gray-200">
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
            <p className="text-gray-600">Lade Angebots-Anfragen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchIncomingQuotes} variant="outline">
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Eingehende Angebots-Anfragen</h1>
        <p className="text-gray-600">
          Übersicht über alle eingehenden Anfragen für Angebote von Kunden und anderen Unternehmen.
        </p>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Angebots-Anfragen</h3>
              <p className="text-gray-500">
                Sie haben noch keine eingehenden Angebots-Anfragen erhalten.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {quotes.map(quote => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-900 mb-1">
                      {quote.title}
                      {getPriorityBadge(quote.priority)}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {quote.description.length > 150
                        ? `${quote.description.substring(0, 150)}...`
                        : quote.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 ml-4">{getStatusBadge(quote.status)}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Kundeninformationen */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      {quote.customer?.type === 'company' ? (
                        <Building2 className="h-4 w-4 mr-2" />
                      ) : (
                        <User className="h-4 w-4 mr-2" />
                      )}
                      <span className="font-medium">
                        {quote.customer?.name || 'Unbekannter Kunde'}
                      </span>
                    </div>
                    {quote.customer?.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        <span>{quote.customer.email}</span>
                      </div>
                    )}
                    {quote.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📍</span>
                        <span>{quote.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Projektdetails */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Erstellt: {formatDate(quote.createdAt)}</span>
                    </div>
                    {quote.deadline && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">⏰</span>
                        <span>
                          Deadline: {new Date(quote.deadline).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">💰</span>
                      <span>Budget: {formatBudget(quote.budget)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link href={`/dashboard/company/${user?.uid}/orders/incoming/quotes/${quote.id}`}>
                    <Button
                      variant="outline"
                      className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                    >
                      Details ansehen
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
