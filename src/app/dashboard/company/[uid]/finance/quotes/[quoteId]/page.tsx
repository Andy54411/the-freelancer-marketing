'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  ArrowLeft,
  Send,
  Edit,
  Download,
  Printer,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Euro,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuoteService, Quote as QuoteType } from '@/services/quoteService';

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const quoteId = typeof params?.quoteId === 'string' ? params.quoteId : '';

  const [quote, setQuote] = useState<QuoteType | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [quoteId, uid]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const quoteData = await QuoteService.getQuote(uid, quoteId);
      if (!quoteData) {
        toast.error('Angebot nicht gefunden');
        router.push(`/dashboard/company/${uid}/finance/quotes`);
        return;
      }
      setQuote(quoteData);
    } catch (error) {
      toast.error('Angebot konnte nicht geladen werden');
      router.push(`/dashboard/company/${uid}/finance/quotes`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!quote) return;

    try {
      setActionLoading(true);
      await QuoteService.sendQuote(uid, quote.id);
      toast.success('Angebot wurde versendet');
      await loadQuote(); // Reload to get updated status
    } catch (error) {
      toast.error('Fehler beim Versenden des Angebots');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!quote) return;
    try {
      setActionLoading(true);
      await QuoteService.acceptQuote(uid, quote.id);
      toast.success('Angebot wurde angenommen');
      await loadQuote();
    } catch (error) {
      toast.error('Fehler beim Annehmen des Angebots');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!quote) return;
    try {
      const reason = window.prompt('Bitte optionalen Ablehnungsgrund eingeben:', '') || undefined;
      setActionLoading(true);
      await QuoteService.rejectQuote(uid, quote.id, reason);
      toast.success('Angebot wurde abgelehnt');
      await loadQuote();
    } catch (error) {
      toast.error('Fehler beim Ablehnen des Angebots');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!quote) return;
    try {
      if (!confirm('Angebot wirklich stornieren? Reservierte Artikel werden freigegeben.')) return;
      setActionLoading(true);
      await QuoteService.cancelQuote(uid, quote.id);
      toast.success('Angebot wurde storniert');
      await loadQuote();
    } catch (error) {
      toast.error('Fehler beim Stornieren des Angebots');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: QuoteType['status']) => {
    const statusConfig = {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Angenommen', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Abgelaufen', className: 'bg-orange-100 text-orange-800' },
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

  // Autorisierung prüfen (nach Hooks platzieren, um React Hooks-Regeln einzuhalten)
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Angebot nicht gefunden</h2>
          <p className="text-gray-600">Das angeforderte Angebot existiert nicht.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/company/${uid}/finance/quotes`)}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zu Angeboten
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Angebot {quote.number}</h1>
              {getStatusBadge(quote.status)}
            </div>
            <p className="text-gray-600">Für {quote.customerName}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(`/print/quote/${uid}/${quote.id}?auto=1`, '_blank', 'noopener')
            }
          >
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/print/quote/${uid}/${quote.id}`, '_blank', 'noopener')}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/company/${uid}/finance/quotes/${quote.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Bearbeiten
          </Button>
          {quote.status === 'draft' && (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={actionLoading}
              className="bg-[#14ad9f] hover:bg-[#0f9d84]"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Versenden
            </Button>
          )}
          {(quote.status === 'draft' || quote.status === 'sent') && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={actionLoading}
              className="text-zinc-700 border-zinc-300 hover:bg-zinc-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Stornieren
            </Button>
          )}
          {quote.status === 'sent' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAccept}
                disabled={actionLoading}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Annehmen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                disabled={actionLoading}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Ablehnen
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hauptbereich */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kundendaten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Building className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Kundendaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{quote.customerName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{quote.customerEmail}</span>
              </div>
              {quote.customerPhone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{quote.customerPhone}</span>
                </div>
              )}
              {quote.customerAddress && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>
                    {quote.customerAddress.street}, {quote.customerAddress.postalCode}{' '}
                    {quote.customerAddress.city}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Angebots-Informationen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Angebots-Informationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Erstellt am:</span>
                  <span>{new Date(quote.date).toLocaleDateString('de-DE')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Gültig bis:</span>
                  <span>{new Date(quote.validUntil).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
              {quote.title && (
                <div>
                  <span className="text-sm text-gray-600">Titel:</span>
                  <p className="font-medium">{quote.title}</p>
                </div>
              )}
              {quote.description && (
                <div>
                  <span className="text-sm text-gray-600">Beschreibung:</span>
                  <p className="mt-1">{quote.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Positionen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Euro className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Positionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quote.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <span className="text-sm text-gray-600">Beschreibung:</span>
                        <p className="font-medium">{item.description}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Menge:</span>
                        <p>{item.quantity}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Einzelpreis:</span>
                        <p>{formatCurrency(item.unitPrice)}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between">
                      <span className="text-sm text-gray-600">Gesamtpreis:</span>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}

                <Separator />

                {/* Summen */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Nettobetrag:</span>
                    <span>{formatCurrency(quote.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>MwSt. (19%):</span>
                    <span>{formatCurrency(quote.taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Gesamtbetrag:</span>
                    <span className="text-[#14ad9f]">{formatCurrency(quote.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notizen */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Fuß-Text */}
          {quote.footerText && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fuß-Text</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Sichere HTML-Ausgabe: DOMPurify + Platzhalter ersetzen */}
                <SafeFooterHtml html={quote.footerText} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Informationen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status & Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <div className="mt-1">{getStatusBadge(quote.status)}</div>
              </div>

              <Separator />

              <div>
                <span className="text-sm text-gray-600">Angebotsnummer:</span>
                <p className="font-mono">{quote.number}</p>
              </div>

              <div>
                <span className="text-sm text-gray-600">Gesamtbetrag:</span>
                <p className="text-xl font-bold text-[#14ad9f]">{formatCurrency(quote.total)}</p>
              </div>

              {quote.sentAt && (
                <div>
                  <span className="text-sm text-gray-600">Versendet am:</span>
                  <p>{new Date(quote.sentAt).toLocaleDateString('de-DE')}</p>
                </div>
              )}

              {quote.acceptedAt && (
                <div>
                  <span className="text-sm text-gray-600">Angenommen am:</span>
                  <p>{new Date(quote.acceptedAt).toLocaleDateString('de-DE')}</p>
                </div>
              )}

              {quote.rejectedAt && (
                <div>
                  <span className="text-sm text-gray-600">Abgelehnt am:</span>
                  <p>{new Date(quote.rejectedAt).toLocaleDateString('de-DE')}</p>
                  {quote.rejectionReason && (
                    <p className="text-sm text-gray-500 mt-1">Grund: {quote.rejectionReason}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Hilfskomponente für sichere Footer-HTML-Ausgabe mit Platzhalterersetzung
import DOMPurify from 'dompurify';
function SafeFooterHtml({ html }: { html: string }) {
  // Einfache Erkennung, ob bereits HTML-Tags enthalten sind
  const looksLikeHtml = /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(html);
  // Platzhalter-Substitution (nur KONTAKTPERSON aktuell)
  // Hinweis: In der Detailansicht kennen wir die Kontaktperson hier nicht direkt;
  // wir lassen den Platzhalter sichtbar oder ersetzen ihn leer.
  const substituted = html.replaceAll('[%KONTAKTPERSON%]', '');
  const safe = looksLikeHtml
    ? DOMPurify.sanitize(substituted, { USE_PROFILES: { html: true } })
    : DOMPurify.sanitize(substituted).replaceAll('\n', '<br />');
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: safe }} />;
}
