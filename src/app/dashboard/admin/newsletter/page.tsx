'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiMail, FiUsers, FiSend, FiPlus, FiTrash2, FiEdit3, FiCalendar } from 'react-icons/fi';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/clients';
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

  // Newsletter-Formular State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignContent, setCampaignContent] = useState('');

  // Firebase Real-time Daten laden mit Auth-Check
  useEffect(() => {
    if (!user) return; // Nur laden wenn Benutzer authentifiziert ist

    const subscribersCollection = collection(db, 'newsletterSubscribers');
    const campaignsCollection = collection(db, 'newsletterCampaigns');

    // Real-time Abonnenten mit Fehlerbehandlung
    const unsubscribeSubscribers = onSnapshot(
      subscribersCollection,
      snapshot => {
        const subscriberData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          subscribedAt: doc.data().subscribedAt?.toDate() || new Date(),
        })) as NewsletterSubscriber[];
        setSubscribers(subscriberData);
      },
      error => {
        console.error('Fehler beim Abrufen von Newsletter-Abonnenten:', error);
        toast.error('Fehler beim Laden der Abonnenten: ' + error.message);
        setLoading(false);
      }
    );

    // Real-time Kampagnen mit Fehlerbehandlung
    const unsubscribeCampaigns = onSnapshot(
      campaignsCollection,
      snapshot => {
        const campaignData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          sentAt: doc.data().sentAt?.toDate(),
        })) as NewsletterCampaign[];
        setCampaigns(campaignData);
        setLoading(false);
      },
      error => {
        console.error('Fehler beim Abrufen von Newsletter-Kampagnen:', error);
        toast.error('Fehler beim Laden der Kampagnen: ' + error.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeSubscribers();
      unsubscribeCampaigns();
    };
  }, [user]);

  // Abonnent hinzufügen
  const addSubscriber = async () => {
    if (!newEmail) {
      toast.error('E-Mail-Adresse ist erforderlich');
      return;
    }

    // Check if email already exists
    const existingSubscriber = subscribers.find(sub => sub.email === newEmail);
    if (existingSubscriber) {
      toast.error('Diese E-Mail-Adresse ist bereits registriert');
      return;
    }

    try {
      await addDoc(collection(db, 'newsletterSubscribers'), {
        email: newEmail,
        name: newName || undefined,
        subscribed: true,
        subscribedAt: new Date(),
        source: 'manual',
      });

      setNewEmail('');
      setNewName('');
      toast.success('Abonnent erfolgreich hinzugefügt');
    } catch (error) {
      console.error('Error adding subscriber:', error);
      toast.error('Fehler beim Hinzufügen des Abonnenten');
    }
  };

  // Abonnent löschen
  const deleteSubscriber = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'newsletterSubscribers', id));
      toast.success('Abonnent erfolgreich entfernt');
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
      await addDoc(collection(db, 'newsletterCampaigns'), {
        subject: campaignSubject,
        content: campaignContent,
        status: 'draft',
        createdAt: new Date(),
        recipientCount: subscribers.filter(sub => sub.subscribed).length,
      });

      setCampaignSubject('');
      setCampaignContent('');
      toast.success('Newsletter-Kampagne erfolgreich erstellt');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Fehler beim Erstellen der Kampagne');
    }
  };

  // Newsletter senden (Simulation)
  const sendCampaign = async (campaignId: string) => {
    try {
      await updateDoc(doc(db, 'newsletterCampaigns', campaignId), {
        status: 'sent',
        sentAt: new Date(),
      });

      // Hier würde normalerweise die E-Mail-Integration erfolgen
      toast.success('Newsletter erfolgreich gesendet!');
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
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <FiUsers className="h-3 w-3" />
            {activeSubscribers.length} Abonnenten
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FiMail className="h-3 w-3" />
            {campaigns.length} Kampagnen
          </Badge>
        </div>
      </div>

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
                            >
                              <FiSend className="h-3 w-3" />
                              Senden
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
