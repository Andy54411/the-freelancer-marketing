'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FiMail,
  FiUsers,
  FiSend,
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiCalendar,
  FiSettings,
} from 'react-icons/fi';
import { toast } from 'sonner';

interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  subscribed: boolean;
  subscribedAt: Date;
  source: 'manual' | 'website' | 'import';
}

interface NewsletterCampaign {
  id: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentAt?: Date;
  createdAt: Date;
  recipientCount: number;
}

interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: 'master' | 'support';
  permissions: string[];
}

// Authentication Hook für Admin-Zugriff
function useStaffAuth() {
  const [user, setUser] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/auth');
      if (response.ok) {
        const data = await response.json();
        setUser(data.employee);
      } else {
        router.push('/dashboard/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/dashboard/admin/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      router.push('/dashboard/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [router]);

  const hasPermission = useCallback(
    (permission: string) => {
      return user?.permissions.includes(permission) || user?.role === 'master';
    },
    [user]
  );

  return { user, loading, logout, hasPermission };
}

export default function NewsletterPage() {
  const { user, logout, hasPermission, loading: authLoading } = useStaffAuth();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscribers');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Newsletter-Formular State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignContent, setCampaignContent] = useState('');

  // Check Google Workspace connection
  useEffect(() => {
    const accessToken = localStorage.getItem('google_access_token');
    setIsGoogleConnected(!!accessToken);
  }, []);

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleAuth = urlParams.get('google_auth');
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiryDate = urlParams.get('expiry_date');
    const error = urlParams.get('error');

    if (error) {
      toast.error(`Google Authentifizierung Fehler: ${decodeURIComponent(error)}`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (googleAuth === 'success' && accessToken) {
      // Store tokens in localStorage
      localStorage.setItem('google_access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('google_refresh_token', refreshToken);
      }
      if (expiryDate) {
        localStorage.setItem('google_token_expiry', expiryDate);
      }

      setIsGoogleConnected(true);
      toast.success('Google Workspace erfolgreich verbunden!');

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Google Workspace Authentication
  const connectGoogleWorkspace = async () => {
    try {
      const response = await fetch('/api/auth/google-workspace');
      const data = await response.json();

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.setup_required) {
        const errorDetails = data.missing_vars
          ? `Fehlende Vercel Environment Variables: ${data.missing_vars.join(', ')}`
          : data.message;

        toast.error(`🔧 Vercel Setup erforderlich: ${errorDetails}`, {
          duration: 10000,
          description: 'Gehen Sie zu Vercel Dashboard → Settings → Environment Variables',
        });
      } else {
        toast.error(data.error || 'Fehler beim Verbinden mit Google Workspace');
      }
    } catch (error) {
      console.error('Google Workspace Verbindung Fehler:', error);
      toast.error('Fehler beim Verbinden mit Google Workspace');
    }
  };

  const disconnectGoogleWorkspace = () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
    setIsGoogleConnected(false);
    toast.success('Google Workspace Verbindung getrennt');
  };

  // Newsletter-Daten laden über API
  useEffect(() => {
    if (!user) return; // Nur laden wenn Benutzer authentifiziert ist

    loadNewsletterData();
  }, [user]);

  const loadNewsletterData = async () => {
    try {
      setLoading(true);

      // Load subscribers
      const subscribersResponse = await fetch('/api/admin/newsletter?type=subscribers');
      if (subscribersResponse.ok) {
        const subscribersData = await subscribersResponse.json();
        const processedSubscribers = subscribersData.subscribers.map((sub: any) => ({
          ...sub,
          subscribedAt: new Date(sub.subscribedAt),
        }));
        setSubscribers(processedSubscribers);
      } else {
        console.error('Failed to load subscribers');
        toast.error('Fehler beim Laden der Abonnenten');
      }

      // Load campaigns
      const campaignsResponse = await fetch('/api/admin/newsletter?type=campaigns');
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        const processedCampaigns = campaignsData.campaigns.map((camp: any) => ({
          ...camp,
          createdAt: new Date(camp.createdAt),
          sentAt: camp.sentAt ? new Date(camp.sentAt) : undefined,
        }));
        setCampaigns(processedCampaigns);
      } else {
        console.error('Failed to load campaigns');
        toast.error('Fehler beim Laden der Kampagnen');
      }
    } catch (error) {
      console.error('Error loading newsletter data:', error);
      toast.error('Fehler beim Laden der Newsletter-Daten');
    } finally {
      setLoading(false);
    }
  };

  // Abonnent hinzufügen
  const addSubscriber = async () => {
    if (!newEmail) {
      toast.error('E-Mail-Adresse ist erforderlich');
      return;
    }

    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscriber',
          data: { email: newEmail, name: newName || undefined },
        }),
      });

      if (response.ok) {
        setNewEmail('');
        setNewName('');
        toast.success('Abonnent erfolgreich hinzugefügt');
        loadNewsletterData(); // Reload data
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Hinzufügen des Abonnenten');
      }
    } catch (error) {
      console.error('Error adding subscriber:', error);
      toast.error('Fehler beim Hinzufügen des Abonnenten');
    }
  };

  // Abonnent löschen
  const deleteSubscriber = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/newsletter?type=subscriber&id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Abonnent erfolgreich entfernt');
        loadNewsletterData(); // Reload data
      } else {
        toast.error('Fehler beim Entfernen des Abonnenten');
      }
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      toast.error('Fehler beim Entfernen des Abonnenten');
    }
  };

  // Newsletter-Kampagne erstellen
  const createCampaign = async () => {
    if (!campaignSubject || !campaignContent) {
      toast.error('Betreff und Inhalt sind erforderlich');
      return;
    }

    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'campaign',
          data: { subject: campaignSubject, content: campaignContent },
        }),
      });

      if (response.ok) {
        setCampaignSubject('');
        setCampaignContent('');
        toast.success('Newsletter-Kampagne erfolgreich erstellt');
        loadNewsletterData(); // Reload data
      } else {
        toast.error('Fehler beim Erstellen der Kampagne');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Fehler beim Erstellen der Kampagne');
    }
  };

  // Newsletter senden mit Google Workspace
  const sendCampaign = async (campaignId: string) => {
    try {
      // Check if Google Workspace is configured
      const accessToken = localStorage.getItem('google_access_token');
      const refreshToken = localStorage.getItem('google_refresh_token');

      if (!accessToken) {
        toast.error(
          'Google Workspace Authentifizierung erforderlich. Bitte melden Sie sich zuerst an.'
        );
        return;
      }

      const response = await fetch('/api/admin/newsletter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'campaign-send',
          id: campaignId,
          data: {
            accessToken,
            refreshToken,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Newsletter erfolgreich gesendet!');
        loadNewsletterData(); // Reload data
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Senden des Newsletters');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Fehler beim Senden des Newsletters');
    }
  };

  // Auth-Check: Benutzer muss angemeldet und autorisiert sein
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Authentifizierung wird überprüft...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Nicht autorisiert. Bitte melden Sie sich an.</div>
      </div>
    );
  }

  const activeSubscribers = subscribers.filter(sub => sub.subscribed);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Newsletter-Daten werden geladen...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Newsletter-Verwaltung</h1>
        <div className="flex gap-2 items-center">
          <Badge variant="secondary" className="flex items-center gap-1">
            <FiUsers className="h-3 w-3" />
            {activeSubscribers.length} Abonnenten
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FiMail className="h-3 w-3" />
            {campaigns.length} Kampagnen
          </Badge>
          {isGoogleConnected ? (
            <Badge variant="default" className="flex items-center gap-1">
              <FiSettings className="h-3 w-3" />
              Google Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <FiSettings className="h-3 w-3" />
              Google Disconnected
            </Badge>
          )}
        </div>
      </div>

      {/* Google Workspace Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiSettings className="h-5 w-5" />
            Google Workspace Konfiguration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isGoogleConnected
                  ? 'Google Workspace ist verbunden. Newsletter können per Gmail API versendet werden.'
                  : 'Google Workspace ist nicht verbunden. Bitte authentifizieren Sie sich für das Newsletter-Versenden.'}
              </p>
            </div>
            <div>
              {isGoogleConnected ? (
                <Button variant="outline" onClick={disconnectGoogleWorkspace}>
                  Verbindung trennen
                </Button>
              ) : (
                <Button onClick={connectGoogleWorkspace} className="flex items-center gap-2">
                  <FiSettings className="h-4 w-4" />
                  Google Workspace verbinden
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <FiUsers className="h-4 w-4" />
            Abonnenten
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <FiMail className="h-4 w-4" />
            Kampagnen
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <FiEdit3 className="h-4 w-4" />
            Erstellen
          </TabsTrigger>
        </TabsList>

        {/* Abonnenten-Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiPlus className="h-5 w-5" />
                Neuen Abonnenten hinzufügen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="E-Mail-Adresse"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
                <Input
                  placeholder="Name (optional)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <Button onClick={addSubscriber} className="flex items-center gap-2">
                  <FiPlus className="h-4 w-4" />
                  Hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiUsers className="h-5 w-5" />
                Alle Abonnenten ({subscribers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subscribers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Noch keine Abonnenten vorhanden
                  </div>
                ) : (
                  subscribers.map(subscriber => (
                    <div
                      key={subscriber.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{subscriber.email}</div>
                          {subscriber.name && (
                            <div className="text-sm text-gray-500">{subscriber.name}</div>
                          )}
                          <div className="text-xs text-gray-400">
                            Angemeldet: {subscriber.subscribedAt.toLocaleDateString('de-DE')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={subscriber.subscribed ? 'default' : 'secondary'}>
                          {subscriber.subscribed ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSubscriber(subscriber.id)}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kampagnen-Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiMail className="h-5 w-5" />
                Newsletter-Kampagnen ({campaigns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Noch keine Kampagnen erstellt
                  </div>
                ) : (
                  campaigns.map(campaign => (
                    <div key={campaign.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{campaign.subject}</h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              campaign.status === 'sent'
                                ? 'default'
                                : campaign.status === 'scheduled'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {campaign.status === 'sent'
                              ? 'Gesendet'
                              : campaign.status === 'scheduled'
                                ? 'Geplant'
                                : 'Entwurf'}
                          </Badge>
                          {campaign.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => sendCampaign(campaign.id)}
                              className="flex items-center gap-1"
                              title={
                                !isGoogleConnected
                                  ? 'Newsletter als Simulation senden (Google Workspace nicht konfiguriert)'
                                  : 'Newsletter per Gmail API senden'
                              }
                            >
                              <FiSend className="h-3 w-3" />
                              {isGoogleConnected ? 'Senden' : 'Simulieren'}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {campaign.content.substring(0, 150)}...
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <FiCalendar className="h-3 w-3" />
                          Erstellt: {campaign.createdAt.toLocaleDateString('de-DE')}
                        </span>
                        {campaign.sentAt && (
                          <span className="flex items-center gap-1">
                            <FiSend className="h-3 w-3" />
                            Gesendet: {campaign.sentAt.toLocaleDateString('de-DE')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FiUsers className="h-3 w-3" />
                          {campaign.recipientCount} Empfänger
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Erstellen-Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiEdit3 className="h-5 w-5" />
                Neue Newsletter-Kampagne erstellen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Betreff</label>
                <Input
                  placeholder="Newsletter-Betreff eingeben..."
                  value={campaignSubject}
                  onChange={e => setCampaignSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Inhalt</label>
                <Textarea
                  placeholder="Newsletter-Inhalt eingeben..."
                  rows={10}
                  value={campaignContent}
                  onChange={e => setCampaignContent(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Wird an {activeSubscribers.length} aktive Abonnenten gesendet
                </div>
                <Button
                  onClick={createCampaign}
                  className="flex items-center gap-2"
                  disabled={!campaignSubject || !campaignContent}
                >
                  <FiPlus className="h-4 w-4" />
                  Kampagne erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
