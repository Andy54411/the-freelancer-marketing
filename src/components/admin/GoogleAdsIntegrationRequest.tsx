'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Mail, Hash, Calendar, MessageSquare, CheckCircle, Ban } from 'lucide-react';

interface GoogleAdsIntegrationRequestProps {
  companyId: string;
}

interface GoogleAdsRequest {
  googleAdsEmail: string;
  googleAdsCustomerId: string;
  managementType: 'taskilo' | 'self';
  message: string | null;
  status: 'pending_approval' | 'approved' | 'rejected';
  requestedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  invitationSent?: boolean;
  invitationSentAt?: string;
  invitationSentBy?: string;
}

export default function GoogleAdsIntegrationRequest({ companyId }: GoogleAdsIntegrationRequestProps) {
  const [request, setRequest] = useState<GoogleAdsRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRequest, setHasRequest] = useState(false);
  const [sendingInvitation, setSendingInvitation] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [companyId]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/companies/${companyId}/integrations/google-ads`);
      const data = await response.json();

      if (data.success && data.hasRequest) {
        setHasRequest(true);
        setRequest(data.request);
      } else {
        setHasRequest(false);
        setRequest(null);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Google Ads Anfrage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!request) return;

    setSendingInvitation(true);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/integrations/google-ads/send-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: request.googleAdsEmail,
          customerId: request.googleAdsCustomerId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Einladung erfolgreich versendet!');
        await loadRequest(); // Neu laden
      } else {
        alert(`Fehler: ${data.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      alert('Fehler beim Versenden der Einladung');
    } finally {
      setSendingInvitation(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Genehmigt
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800">
            <Ban className="h-3 w-3 mr-1" />
            Abgelehnt
          </Badge>
        );
      default:
        return <Badge className="bg-orange-100 text-orange-800">Ausstehend</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <img
              src="https://www.gstatic.com/images/branding/product/1x/ads_48dp.png"
              alt="Google Ads"
              className="w-5 h-5 mr-2"
            />
            Google Ads Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasRequest || !request) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <img
              src="https://www.gstatic.com/images/branding/product/1x/ads_48dp.png"
              alt="Google Ads"
              className="w-5 h-5 mr-2"
            />
            Google Ads Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Keine Google Ads Integration Anfrage vorhanden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <img
              src="https://www.gstatic.com/images/branding/product/1x/ads_48dp.png"
              alt="Google Ads"
              className="w-5 h-5 mr-2"
            />
            Google Ads Integration Anfrage
          </CardTitle>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email */}
        <div>
          <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
            <Mail className="h-4 w-4 mr-2" />
            Google Ads Email
          </label>
          <p className="font-medium">{request.googleAdsEmail}</p>
        </div>

        {/* Customer ID */}
        <div>
          <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
            <Hash className="h-4 w-4 mr-2" />
            Customer ID
          </label>
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm bg-gray-100 p-2 rounded">
              {request.googleAdsCustomerId}
            </p>
            <a
              href={`https://ads.google.com/aw/accountaccess/users?ocid=${request.googleAdsCustomerId.replace(/-/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Öffnen
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Management Type */}
        <div>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Verwaltung</label>
          <Badge variant="outline" className={request.managementType === 'taskilo' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}>
            {request.managementType === 'taskilo' ? 'Taskilo verwaltet' : 'Kunde verwaltet selbst'}
          </Badge>
        </div>

        {/* Message */}
        {request.message && (
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Nachricht
            </label>
            <p className="text-sm bg-gray-50 p-3 rounded border">{request.message}</p>
          </div>
        )}

        {/* Requested At */}
        <div>
          <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
            <Calendar className="h-4 w-4 mr-2" />
            Beantragt am
          </label>
          <p className="text-sm">
            {new Date(request.requestedAt).toLocaleDateString('de-DE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Approved Info */}
        {request.approvedAt && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-500 mb-1 block">Genehmigt am</label>
              <p className="text-sm">
                {new Date(request.approvedAt).toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {request.approvedBy && (
              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">Genehmigt von</label>
                <p className="text-sm">{request.approvedBy}</p>
              </div>
            )}
          </>
        )}

        {/* Invitation Status */}
        {request.invitationSent && request.invitationSentAt && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Manager-Account-Einladung versendet
            </h4>
            <div className="text-sm text-green-800 space-y-1">
              <p>Versendet am: {new Date(request.invitationSentAt).toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
              {request.invitationSentBy && <p>Von: {request.invitationSentBy}</p>}
              <p className="mt-2 text-green-700">Der Kunde muss die Einladung in Google Ads akzeptieren.</p>
            </div>
          </div>
        )}

        {/* Action Info */}
        {request.status === 'pending_approval' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-orange-900 mb-2">Nächste Schritte:</h4>
            <ol className="text-sm text-orange-800 space-y-1 list-decimal list-inside">
              <li>Prüfen Sie die Customer ID in Google Ads</li>
              <li>Senden Sie Einladung vom Taskilo Manager Account (655-923-8498)</li>
              <li>Warten Sie auf Akzeptierung durch den Kunden</li>
              <li>Aktivieren Sie die Integration in den Einstellungen</li>
            </ol>
            
            {!request.invitationSent && (
              <Button
                onClick={handleSendInvitation}
                disabled={sendingInvitation}
                className="mt-4 w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white"
              >
                {sendingInvitation ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Manager-Einladung jetzt versenden
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
