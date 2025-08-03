'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FiUsers,
  FiMail,
  FiFileText,
  FiDownload,
  FiShare2,
  FiUserPlus,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiShield,
} from 'react-icons/fi';
import { DatevService, DatevOrganization } from '@/services/datevService';
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { toast } from 'sonner';

interface SteuerberaterPortalProps {
  companyId: string;
}

interface SteuerberaterInvite {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: string;
  permissions: string[];
}

interface SharedDocument {
  id: string;
  name: string;
  type: string;
  sharedAt: string;
  accessLevel: 'view' | 'edit';
  downloadCount: number;
}

export function SteuerberaterPortal({ companyId }: SteuerberaterPortalProps) {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<DatevOrganization | null>(null);
  const [invites, setInvites] = useState<SteuerberaterInvite[]>([]);
  const [sharedDocs, setSharedDocs] = useState<SharedDocument[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteName, setNewInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    loadPortalData();
  }, [companyId]);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const token = await DatevTokenManager.getUserToken();

      if (!token) {
        toast.error('Keine DATEV-Verbindung gefunden');
        return;
      }

      // Load organization
      const organizations = await DatevService.getOrganizations();
      if (organizations.length > 0) {
        setOrganization(organizations[0]);
      }

      // Mock data for steuerberater invites and shared documents
      // In production, this would come from your backend API
      setInvites([
        {
          id: '1',
          email: 'steuerberater@kanzlei-mueller.de',
          name: 'Dr. Maria Mueller',
          status: 'accepted',
          invitedAt: '2025-07-15T10:00:00Z',
          permissions: ['view_documents', 'export_data', 'monthly_reports'],
        },
        {
          id: '2',
          email: 'assistant@kanzlei-mueller.de',
          name: 'Thomas Schmidt',
          status: 'pending',
          invitedAt: '2025-07-20T14:30:00Z',
          permissions: ['view_documents'],
        },
      ]);

      setSharedDocs([
        {
          id: '1',
          name: 'Monatsbericht Juli 2025',
          type: 'PDF',
          sharedAt: '2025-07-31T09:00:00Z',
          accessLevel: 'view',
          downloadCount: 3,
        },
        {
          id: '2',
          name: 'Buchungsjournal Q2 2025',
          type: 'Excel',
          sharedAt: '2025-07-28T16:15:00Z',
          accessLevel: 'view',
          downloadCount: 1,
        },
      ]);
    } catch (error) {
      console.error('Fehler beim Laden der Portal-Daten:', error);
      toast.error('Fehler beim Laden der Portal-Daten');
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async () => {
    if (!newInviteEmail || !newInviteName) {
      toast.error('Bitte E-Mail und Name ausfüllen');
      return;
    }

    try {
      // In production, this would send an actual invite via your backend
      const newInvite: SteuerberaterInvite = {
        id: Date.now().toString(),
        email: newInviteEmail,
        name: newInviteName,
        status: 'pending',
        invitedAt: new Date().toISOString(),
        permissions: ['view_documents', 'export_data'],
      };

      setInvites([...invites, newInvite]);
      setNewInviteEmail('');
      setNewInviteName('');
      setInviteMessage('');

      toast.success(`Einladung an ${newInviteName} versendet`);
    } catch (error) {
      console.error('Fehler beim Versenden der Einladung:', error);
      toast.error('Fehler beim Versenden der Einladung');
    }
  };

  const generateReport = async (type: string) => {
    try {
      // In production, this would generate and share a real report
      toast.success(`${type}-Bericht wird erstellt und geteilt...`);

      // Simulate report creation
      setTimeout(() => {
        const newDoc: SharedDocument = {
          id: Date.now().toString(),
          name: `${type} ${new Date().toLocaleDateString('de-DE')}`,
          type: 'PDF',
          sharedAt: new Date().toISOString(),
          accessLevel: 'view',
          downloadCount: 0,
        };
        setSharedDocs([newDoc, ...sharedDocs]);
        toast.success(`${type}-Bericht erfolgreich erstellt und geteilt`);
      }, 2000);
    } catch (error) {
      console.error('Fehler beim Erstellen des Berichts:', error);
      toast.error('Fehler beim Erstellen des Berichts');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <FiUsers className="animate-pulse w-6 h-6 text-[#14ad9f]" />
            <span className="ml-2">Lade Steuerberater-Portal...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Keine DATEV-Verbindung</CardTitle>
          <CardDescription>Bitte richten Sie zuerst die DATEV-Integration ein.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="border-[#14ad9f]/20 bg-[#14ad9f]/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <FiShield className="text-[#14ad9f] w-6 h-6 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Sichere Zusammenarbeit mit Ihrem Steuerberater
              </h3>
              <p className="text-gray-700 text-sm">
                Teilen Sie relevante Geschäftsdaten sicher mit Ihrem Steuerberater. Alle Zugriffe
                sind verschlüsselt und werden protokolliert.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Steuerberater einladen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUserPlus className="text-[#14ad9f]" />
              Steuerberater einladen
            </CardTitle>
            <CardDescription>
              Laden Sie Ihren Steuerberater zum sicheren Datenzugriff ein
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">E-Mail-Adresse</label>
              <Input
                placeholder="steuerberater@kanzlei.de"
                value={newInviteEmail}
                onChange={e => setNewInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                placeholder="Dr. Maria Mustermann"
                value={newInviteName}
                onChange={e => setNewInviteName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Nachricht (optional)</label>
              <Textarea
                placeholder="Persönliche Nachricht für die Einladung..."
                value={inviteMessage}
                onChange={e => setInviteMessage(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={sendInvite} className="w-full bg-[#14ad9f] hover:bg-[#129488]">
              <FiMail className="w-4 h-4 mr-2" />
              Einladung senden
            </Button>
          </CardContent>
        </Card>

        {/* Aktuelle Einladungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUsers className="text-[#14ad9f]" />
              Eingeladene Steuerberater
            </CardTitle>
            <CardDescription>Übersicht über alle Einladungen und Zugriffe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map(invite => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{invite.name}</h4>
                    <p className="text-sm text-gray-500">{invite.email}</p>
                    <p className="text-xs text-gray-400">
                      Eingeladen: {new Date(invite.invitedAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        invite.status === 'accepted'
                          ? 'border-green-500 text-green-500'
                          : invite.status === 'pending'
                            ? 'border-orange-500 text-orange-500'
                            : 'border-red-500 text-red-500'
                      }
                    >
                      {invite.status === 'accepted' && <FiCheck className="w-3 h-3 mr-1" />}
                      {invite.status === 'pending' && <FiClock className="w-3 h-3 mr-1" />}
                      {invite.status === 'declined' && <FiAlertCircle className="w-3 h-3 mr-1" />}
                      {invite.status === 'accepted'
                        ? 'Akzeptiert'
                        : invite.status === 'pending'
                          ? 'Ausstehend'
                          : 'Abgelehnt'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {invite.permissions.length} Berechtigung(en)
                    </p>
                  </div>
                </div>
              ))}
              {invites.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Noch keine Steuerberater eingeladen
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Berichte erstellen und teilen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiFileText className="text-[#14ad9f]" />
            Berichte für Steuerberater
          </CardTitle>
          <CardDescription>
            Erstellen und teilen Sie relevante Berichte direkt aus DATEV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => generateReport('Monatsbericht')}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              <FiFileText className="w-4 h-4 mr-2" />
              Monatsbericht erstellen
            </Button>
            <Button
              onClick={() => generateReport('Buchungsjournal')}
              variant="outline"
              className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Buchungsjournal
            </Button>
            <Button
              onClick={() => generateReport('Umsatzsteuervoranmeldung')}
              variant="outline"
              className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
            >
              <FiShare2 className="w-4 h-4 mr-2" />
              UStVA-Daten
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Geteilte Dokumente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiShare2 className="text-[#14ad9f]" />
            Geteilte Dokumente
          </CardTitle>
          <CardDescription>
            Alle mit Ihrem Steuerberater geteilten Dokumente und Berichte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sharedDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FiFileText className="text-[#14ad9f] w-5 h-5" />
                  <div>
                    <h4 className="font-medium">{doc.name}</h4>
                    <p className="text-sm text-gray-500">
                      Geteilt: {new Date(doc.sharedAt).toLocaleDateString('de-DE')} • {doc.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-[#14ad9f] text-[#14ad9f]">
                    {doc.accessLevel === 'view' ? 'Nur Ansicht' : 'Bearbeitung'}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{doc.downloadCount} Downloads</p>
                </div>
              </div>
            ))}
            {sharedDocs.length === 0 && (
              <p className="text-center text-gray-500 py-8">Noch keine Dokumente geteilt</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
