'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  FiMessageCircle,
  FiEye,
  FiEdit,
  FiTrash2,
  FiUpload,
  FiCalendar,
  FiActivity,
  FiSettings,
  FiFilter,
} from 'react-icons/fi';
import { toast } from 'sonner';

interface SteuerberaterPortalProps {
  companyId: string;
}

interface SteuerberaterInvite {
  id: string;
  email: string;
  name: string;
  kanzleiName?: string;
  telefon?: string;
  datevNummer?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  permissions: Array<
    'view_documents' | 'export_data' | 'monthly_reports' | 'tax_access' | 'accounting_access'
  >;
  invitedAt: string;
  invitedBy: string;
  acceptedAt?: string;
  message?: string;
  accessLevel: 'basic' | 'advanced' | 'full';
  notificationSettings: {
    monthlyReports: boolean;
    documentSharing: boolean;
    taxDeadlines: boolean;
  };
}

interface SharedDocument {
  id: string;
  name: string;
  description?: string;
  type: 'PDF' | 'Excel' | 'CSV' | 'XML' | 'DATEV' | 'EÜR' | 'UStVA' | 'BWA' | 'GuV';
  category:
    | 'tax_report'
    | 'financial_statement'
    | 'cashbook'
    | 'invoice_data'
    | 'expense_report'
    | 'datev_export'
    | 'other';
  sharedAt: string;
  sharedBy: string;
  accessLevel: 'view' | 'download' | 'edit';
  downloadCount: number;
  lastAccessed?: string;
  expiresAt?: string;
  tags: string[];
  encrypted: boolean;
  metadata?: {
    period?: string;
    year?: number;
    quarter?: number;
    month?: number;
    reportType?: string;
  };
}

interface CollaborationStats {
  activeSteuerberater: number;
  sharedDocuments: number;
  lastActivity: string | null;
  totalDownloads: number;
  monthlyReports: number;
}

interface CollaborationLog {
  id: string;
  action:
    | 'invite_sent'
    | 'invite_accepted'
    | 'document_shared'
    | 'document_accessed'
    | 'report_generated'
    | 'message_sent'
    | 'permission_changed';
  details: string;
  timestamp: string;
  performedBy: string;
}

export function SteuerberaterPortal({ companyId }: SteuerberaterPortalProps) {
  // DEBUG: Prüfe ob die Komponente überhaupt geladen wird

  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<SteuerberaterInvite[]>([]);
  const [sharedDocs, setSharedDocs] = useState<SharedDocument[]>([]);
  const [collaborationStats, setCollaborationStats] = useState<CollaborationStats | null>(null);
  const [collaborationLogs, setCollaborationLogs] = useState<CollaborationLog[]>([]);

  // Form states
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteName, setNewInviteName] = useState('');
  const [newInviteKanzlei, setNewInviteKanzlei] = useState('');
  const [newInviteTelefon, setNewInviteTelefon] = useState('');
  const [newInviteMessage, setNewInviteMessage] = useState('');
  const [newInvitePermissions, setNewInvitePermissions] = useState<string[]>(['view_documents']);
  const [newInviteAccessLevel, setNewInviteAccessLevel] = useState<'basic' | 'advanced' | 'full'>(
    'basic'
  );

  // Modal states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [selectedSteuerberater, setSelectedSteuerberater] = useState<string>('');

  // Filter states
  const [documentFilter, setDocumentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPortalData();
  }, [companyId]);

  const loadPortalData = async () => {
    try {
      setLoading(true);

      // MOCK DATA - Portal funktioniert unabhängig von APIs

      // Set empty/mock data instead of API calls
      setInvites([]);
      setSharedDocs([]);
      setCollaborationStats({
        activeSteuerberater: 0,
        sharedDocuments: 0,
        lastActivity: null,
        totalDownloads: 0,
        monthlyReports: 0,
      });
      setCollaborationLogs([]);

      // DATEV is optional - don't block the portal
    } catch (error) {
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
      const response = await fetch('/api/steuerberater', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'invite',
          companyId,
          email: newInviteEmail,
          name: newInviteName,
          kanzleiName: newInviteKanzlei,
          telefon: newInviteTelefon,
          message: newInviteMessage,
          permissions: newInvitePermissions,
          accessLevel: newInviteAccessLevel,
          invitedBy: 'current_user', // TODO: Get from auth context
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Einladung erfolgreich versendet');
        setInvites([result.data, ...invites]);

        // Reset form
        setNewInviteEmail('');
        setNewInviteName('');
        setNewInviteKanzlei('');
        setNewInviteTelefon('');
        setNewInviteMessage('');
        setNewInvitePermissions(['view_documents']);
        setNewInviteAccessLevel('basic');
        setShowInviteDialog(false);
      } else {
        toast.error(result.message || 'Fehler beim Senden der Einladung');
      }
    } catch (error) {
      toast.error('Fehler beim Senden der Einladung');
    }
  };

  const generateReport = async (reportType: string) => {
    if (!selectedSteuerberater) {
      toast.error('Bitte wählen Sie einen Steuerberater aus');
      return;
    }

    try {
      toast.loading(`${reportType} wird erstellt...`);

      const currentDate = new Date();
      const response = await fetch('/api/steuerberater', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_report',
          companyId,
          steuerberaterId: selectedSteuerberater,
          reportType: reportType.toLowerCase(),
          year: currentDate.getFullYear(),
          quarter: Math.ceil((currentDate.getMonth() + 1) / 3),
          period: `${currentDate.getFullYear()}-Q${Math.ceil((currentDate.getMonth() + 1) / 3)}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${reportType} erfolgreich erstellt und geteilt`);
        await loadPortalData(); // Refresh data
      } else {
        toast.error(result.message || 'Fehler beim Erstellen des Berichts');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Berichts');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <FiCheck className="w-3 h-3 text-green-500" />;
      case 'pending':
        return <FiClock className="w-3 h-3 text-yellow-500" />;
      case 'declined':
        return <FiAlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <FiClock className="w-3 h-3 text-gray-500" />;
    }
  };

  const getAccessLevelBadge = (level: string) => {
    const variants = {
      basic: 'border-blue-500 text-blue-700 bg-blue-50',
      advanced: 'border-orange-500 text-orange-700 bg-orange-50',
      full: 'border-red-500 text-red-700 bg-red-50',
    };
    return variants[level as keyof typeof variants] || variants.basic;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-red-500 font-bold text-xl">
              🔄 DEBUG: LOADING-ZUSTAND ERKANNT!
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* DEBUG: Zeige dass das richtige Portal lädt */}
      <div className="bg-green-100 border-2 border-green-500 text-green-800 px-4 py-3 rounded-lg font-bold text-lg">
        ✅ SteuerberaterPortal erfolgreich geladen! (Company: {companyId})
      </div>

      {/* Header mit Statistiken */}
      <Card className="bg-gradient-to-r from-[#14ad9f] to-[#129488] text-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <FiShield className="text-white w-8 h-8 mt-1 shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Steuerberater-Kollaboration</h2>
              <p className="text-white/90 mb-4">
                Arbeiten Sie sicher und effizient mit Ihrem Steuerberater zusammen. Teilen Sie
                Dokumente, generieren Sie Berichte und behalten Sie alle Aktivitäten im Blick.
              </p>

              {collaborationStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {collaborationStats.activeSteuerberater}
                    </div>
                    <div className="text-sm text-white/80">Aktive Steuerberater</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{collaborationStats.sharedDocuments}</div>
                    <div className="text-sm text-white/80">Geteilte Dokumente</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{collaborationStats.totalDownloads}</div>
                    <div className="text-sm text-white/80">Downloads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{collaborationStats.monthlyReports}</div>
                    <div className="text-sm text-white/80">Monatsberichte</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Steuerberater einladen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUserPlus className="text-[#14ad9f]" />
              Steuerberater einladen
            </CardTitle>
            <CardDescription>
              Laden Sie Ihren Steuerberater zum sicheren Datenaustausch ein
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-email" className="text-sm font-medium">
                  E-Mail-Adresse *
                </Label>
                <Input
                  id="invite-email"
                  placeholder="steuerberater@kanzlei.de"
                  value={newInviteEmail}
                  onChange={e => setNewInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-name" className="text-sm font-medium">
                  Name *
                </Label>
                <Input
                  id="invite-name"
                  placeholder="Dr. Maria Mustermann"
                  value={newInviteName}
                  onChange={e => setNewInviteName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-kanzlei" className="text-sm font-medium">
                  Kanzlei (optional)
                </Label>
                <Input
                  id="invite-kanzlei"
                  placeholder="Steuerberatung Mustermann"
                  value={newInviteKanzlei}
                  onChange={e => setNewInviteKanzlei(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-telefon" className="text-sm font-medium">
                  Telefon (optional)
                </Label>
                <Input
                  id="invite-telefon"
                  placeholder="+49 30 12345678"
                  value={newInviteTelefon}
                  onChange={e => setNewInviteTelefon(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Zugriffslevel</Label>
              <Select
                value={newInviteAccessLevel}
                onValueChange={(value: 'basic' | 'advanced' | 'full') =>
                  setNewInviteAccessLevel(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basis - Dokumenteneinsicht</SelectItem>
                  <SelectItem value="advanced">Erweitert - Berichte & Export</SelectItem>
                  <SelectItem value="full">Vollzugriff - Alle Funktionen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Berechtigungen</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'view_documents', label: 'Dokumente einsehen' },
                  { id: 'export_data', label: 'Daten exportieren' },
                  { id: 'monthly_reports', label: 'Monatsberichte' },
                  { id: 'tax_access', label: 'Steuer-Zugriff' },
                ].map(permission => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission.id}
                      checked={newInvitePermissions.includes(permission.id)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setNewInvitePermissions([...newInvitePermissions, permission.id]);
                        } else {
                          setNewInvitePermissions(
                            newInvitePermissions.filter(p => p !== permission.id)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={permission.id} className="text-sm">
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="invite-message" className="text-sm font-medium">
                Persönliche Nachricht (optional)
              </Label>
              <Textarea
                id="invite-message"
                placeholder="Lieber Herr/Frau..."
                value={newInviteMessage}
                onChange={e => setNewInviteMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={sendInvite}
              className="w-full bg-[#14ad9f] hover:bg-[#129488]"
              disabled={!newInviteEmail || !newInviteName}
            >
              <FiMail className="w-4 h-4 mr-2" />
              Einladung senden
            </Button>
          </CardContent>
        </Card>

        {/* Eingeladene Steuerberater */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUsers className="text-[#14ad9f]" />
              Ihre Steuerberater
            </CardTitle>
            <CardDescription>Status Ihrer gesendeten Einladungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map(invite => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-medium">
                      {invite.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{invite.name}</div>
                      <div className="text-sm text-gray-600">{invite.email}</div>
                      {invite.kanzleiName && (
                        <div className="text-xs text-gray-500">{invite.kanzleiName}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getStatusIcon(invite.status)}
                      {invite.status === 'accepted'
                        ? 'Akzeptiert'
                        : invite.status === 'pending'
                          ? 'Ausstehend'
                          : invite.status === 'declined'
                            ? 'Abgelehnt'
                            : 'Widerrufen'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {invite.permissions.length} Berechtigung(en)
                    </p>
                  </div>
                </div>
              ))}
              {invites.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiUsers className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Noch keine Steuerberater eingeladen</p>
                  <p className="text-sm">Laden Sie Ihren Steuerberater ein, um zu beginnen</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Berichte für Steuerberater */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiFileText className="text-[#14ad9f]" />
            Berichte für Steuerberater generieren
          </CardTitle>
          <CardDescription>
            Erstellen und teilen Sie relevante Berichte direkt mit Ihren Steuerberatern
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Steuerberater auswählen</Label>
              <Select value={selectedSteuerberater} onValueChange={setSelectedSteuerberater}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen Sie einen Steuerberater aus" />
                </SelectTrigger>
                <SelectContent>
                  {invites
                    .filter(invite => invite.status === 'accepted')
                    .map(invite => (
                      <SelectItem key={invite.id} value={invite.id}>
                        {invite.name} ({invite.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSteuerberater && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => generateReport('Monatsbericht')}
                  className="bg-[#14ad9f] hover:bg-[#129488]"
                >
                  <FiFileText className="w-4 h-4 mr-2" />
                  Monatsbericht
                </Button>
                <Button
                  onClick={() => generateReport('UStVA')}
                  variant="outline"
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  <FiFileText className="w-4 h-4 mr-2" />
                  UStVA-Daten
                </Button>
                <Button
                  onClick={() => generateReport('EÜR')}
                  variant="outline"
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  <FiDownload className="w-4 h-4 mr-2" />
                  EÜR-Bericht
                </Button>
                <Button
                  onClick={() => generateReport('BWA')}
                  variant="outline"
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  <FiFileText className="w-4 h-4 mr-2" />
                  BWA-Auswertung
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
                  onClick={() => generateReport('DATEV-Export')}
                  variant="outline"
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  <FiShare2 className="w-4 h-4 mr-2" />
                  DATEV-Export
                </Button>
              </div>
            )}

            {!selectedSteuerberater &&
              invites.filter(invite => invite.status === 'accepted').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiUserPlus className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Kein aktiver Steuerberater</p>
                  <p className="text-sm">Laden Sie zuerst einen Steuerberater ein</p>
                </div>
              )}
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
            Alle mit Ihren Steuerberatern geteilten Dokumente und Berichte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sharedDocs.map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#14ad9f]/10 rounded-lg flex items-center justify-center">
                    <FiFileText className="text-[#14ad9f] w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">{doc.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Geteilt: {new Date(doc.sharedAt).toLocaleDateString('de-DE')}</span>
                      <span>•</span>
                      <span>{doc.type}</span>
                      {doc.metadata?.period && (
                        <>
                          <span>•</span>
                          <span>{doc.metadata.period}</span>
                        </>
                      )}
                    </div>
                    {doc.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {doc.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-[#14ad9f] text-[#14ad9f]">
                    {doc.accessLevel === 'view'
                      ? 'Nur Ansicht'
                      : doc.accessLevel === 'download'
                        ? 'Download'
                        : 'Bearbeitung'}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {doc.downloadCount} Downloads
                    {doc.encrypted && (
                      <span className="ml-2">
                        <FiShield className="inline w-3 h-3" /> Verschlüsselt
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            {sharedDocs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FiFileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Noch keine Dokumente geteilt</p>
                <p className="text-sm">Teilen Sie Dokumente mit Ihren Steuerberatern</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
