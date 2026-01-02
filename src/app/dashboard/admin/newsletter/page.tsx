// Newsletter Admin Dashboard - Vollständiges E-Mail-Marketing-System
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Users, 
  Send, 
  Plus, 
  Search, 
  BarChart3,
  FileText,
  Settings,
  Trash2,
  Edit,
  Eye,
  Download,
  Upload,
  Tag,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Zap,
  TrendingUp,
  MousePointer,
  UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { HetznerNewsletterService, type HetznerNewsletterSubscriber, type HetznerNewsletterCampaign, type HetznerNewsletterTemplate, type HetznerNewsletterAnalytics } from '@/services/HetznerNewsletterService';
import { EmailTemplateEditor } from '@/components/newsletter/EmailTemplateEditor';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function NewsletterAdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [subscribers, setSubscribers] = useState<HetznerNewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<HetznerNewsletterCampaign[]>([]);
  const [templates, setTemplates] = useState<HetznerNewsletterTemplate[]>([]);
  const [analytics, setAnalytics] = useState<HetznerNewsletterAnalytics | null>(null);

  // Filter States
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberFilter, setSubscriberFilter] = useState<'all' | 'subscribed' | 'pending' | 'unsubscribed'>('all');
  
  // Dialog States
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewSubscriber, setShowNewSubscriber] = useState(false);
  const [_showImportDialog, setShowImportDialog] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<HetznerNewsletterCampaign | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<HetznerNewsletterTemplate | null>(null);
  
  // Form States
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    previewText: '',
    content: '',
    templateId: '',
    tags: [] as string[],
  });
  
  const [newSubscriber, setNewSubscriber] = useState({
    email: '',
    firstName: '',
    lastName: '',
    tags: '',
  });

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, camps, temps, stats] = await Promise.all([
        HetznerNewsletterService.getSubscribers(),
        HetznerNewsletterService.getCampaigns(),
        HetznerNewsletterService.getTemplates(),
        HetznerNewsletterService.getAnalytics(),
      ]);
      
      setSubscribers(subs);
      setCampaigns(camps);
      setTemplates(temps);
      setAnalytics(stats);
    } catch {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter Subscribers
  const filteredSubscribers = subscribers.filter(sub => {
    if (subscriberFilter !== 'all' && sub.status !== subscriberFilter) return false;
    if (subscriberSearch) {
      const search = subscriberSearch.toLowerCase();
      return (
        sub.email.toLowerCase().includes(search) ||
        sub.firstName?.toLowerCase().includes(search) ||
        sub.lastName?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Handlers
  const handleAddSubscriber = async () => {
    if (!newSubscriber.email) {
      toast.error('E-Mail-Adresse erforderlich');
      return;
    }

    try {
      const result = await HetznerNewsletterService.addSubscriber({
        email: newSubscriber.email,
        firstName: newSubscriber.firstName,
        lastName: newSubscriber.lastName,
        source: 'manual',
        tags: newSubscriber.tags.split(',').map(t => t.trim()).filter(Boolean),
      });

      if (result.success) {
        toast.success(result.requiresConfirmation 
          ? 'Bestätigungs-E-Mail wurde gesendet' 
          : 'Abonnent hinzugefügt'
        );
        setShowNewSubscriber(false);
        setNewSubscriber({ email: '', firstName: '', lastName: '', tags: '' });
        loadData();
      } else {
        toast.error(result.error || 'Fehler beim Hinzufügen');
      }
    } catch {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.content) {
      toast.error('Name, Betreff und Inhalt erforderlich');
      return;
    }

    try {
      await HetznerNewsletterService.createCampaign({
        name: newCampaign.name,
        subject: newCampaign.subject,
        previewText: newCampaign.previewText,
        fromName: 'Taskilo',
        fromEmail: 'support@taskilo.de',
        htmlContent: newCampaign.content,
        templateId: newCampaign.templateId,
        recipientType: newCampaign.tags.length > 0 ? 'tags' : 'all',
        recipientTags: newCampaign.tags,
      });

      toast.success('Kampagne erstellt');
      setShowNewCampaign(false);
      setNewCampaign({ name: '', subject: '', previewText: '', content: '', templateId: '', tags: [] });
      loadData();
    } catch {
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm('Kampagne jetzt an alle Empfänger senden?')) return;

    try {
      toast.loading('Kampagne wird gesendet...');
      const result = await HetznerNewsletterService.sendCampaign(campaignId);
      
      if (result.success) {
        toast.success(`${result.sent || 0} E-Mails erfolgreich gesendet`);
        loadData();
      } else {
        toast.error(result.error || 'Fehler beim Senden');
      }
    } catch {
      toast.error('Fehler beim Senden');
    }
  };

  const handleSaveTemplate = async (templateData: {
    name: string;
    description: string;
    category: string;
    htmlContent: string;
  }) => {
    try {
      if (selectedTemplate?.id) {
        // Workaround: Alte Vorlage löschen und neue erstellen (da PUT nicht verfügbar)
        await HetznerNewsletterService.deleteTemplate(selectedTemplate.id);
        await HetznerNewsletterService.createTemplate({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          htmlContent: templateData.htmlContent,
        });
        toast.success('Vorlage aktualisiert');
      } else {
        // Create new template
        await HetznerNewsletterService.createTemplate({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          htmlContent: templateData.htmlContent,
        });
        toast.success('Vorlage erstellt');
      }
      setShowTemplateEditor(false);
      setSelectedTemplate(null);
      loadData();
    } catch {
      toast.error('Fehler beim Speichern der Vorlage');
      throw new Error('Speichern fehlgeschlagen');
    }
  };

  const handleEditTemplate = (template: HetznerNewsletterTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateEditor(true);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setShowTemplateEditor(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Vorlage wirklich löschen?')) return;
    
    try {
      await HetznerNewsletterService.deleteTemplate(templateId);
      toast.success('Vorlage gelöscht');
      loadData();
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleDeleteSubscriber = async (subscriberId: string) => {
    if (!confirm('Abonnent wirklich löschen? (DSGVO: Daten werden vollständig entfernt)')) return;

    try {
      await HetznerNewsletterService.deleteSubscriber(subscriberId);
      toast.success('Abonnent gelöscht');
      loadData();
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleExportSubscribers = () => {
    const csv = [
      ['E-Mail', 'Vorname', 'Nachname', 'Status', 'Tags', 'Angemeldet am'].join(','),
      ...filteredSubscribers.map(sub => [
        sub.email,
        sub.firstName || '',
        sub.lastName || '',
        sub.status,
        sub.tags.join(';'),
        sub.createdAt ? format(new Date(sub.createdAt), 'dd.MM.yyyy', { locale: de }) : '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `newsletter-subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: HetznerNewsletterSubscriber['status']) => {
    switch (status) {
      case 'subscribed':
        return <Badge className="bg-green-100 text-green-700">Aktiv</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Ausstehend</Badge>;
      case 'unsubscribed':
        return <Badge className="bg-gray-100 text-gray-700">Abgemeldet</Badge>;
      case 'bounced':
        return <Badge className="bg-red-100 text-red-700">Bounce</Badge>;
      case 'complained':
        return <Badge className="bg-red-100 text-red-700">Beschwerde</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCampaignStatusBadge = (status: HetznerNewsletterCampaign['status']) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700">Entwurf</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700">Geplant</Badge>;
      case 'sending':
        return <Badge className="bg-yellow-100 text-yellow-700">Wird gesendet</Badge>;
      case 'sent':
        return <Badge className="bg-green-100 text-green-700">Gesendet</Badge>;
      case 'paused':
        return <Badge className="bg-orange-100 text-orange-700">Pausiert</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Abgebrochen</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter-System</h1>
          <p className="text-gray-500">E-Mail-Marketing wie bei Mailchimp</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
          <Button onClick={() => setShowNewCampaign(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Neue Kampagne
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalSubscribers}</p>
                  <p className="text-xs text-gray-500">Gesamt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{analytics.activeSubscribers}</p>
                  <p className="text-xs text-gray-500">Aktiv</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalSubscribers - analytics.activeSubscribers}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalOpened}</p>
                  <p className="text-xs text-gray-500">Geöffnet</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalCampaigns}</p>
                  <p className="text-xs text-gray-500">Kampagnen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalSent}</p>
                  <p className="text-xs text-gray-500">Gesendet</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-600" />
                <div>
                  <p className="text-2xl font-bold">{analytics.openRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Öffnungsrate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-pink-600" />
                <div>
                  <p className="text-2xl font-bold">{analytics.clickRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Klickrate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Kampagnen
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Abonnenten
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Vorlagen
          </TabsTrigger>
          <TabsTrigger value="automations" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Automatisierung
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Einstellungen
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Letzte Kampagnen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.slice(0, 5).map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500">{campaign.subject}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getCampaignStatusBadge(campaign.status)}
                        {campaign.status === 'sent' && campaign.sent > 0 && (
                          <span className="text-sm text-gray-500">
                            {((campaign.opened / campaign.sent) * 100).toFixed(1)}% geöffnet
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {campaigns.length === 0 && (
                    <p className="text-gray-500 text-center py-8">Noch keine Kampagnen erstellt</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Subscribers */}
            <Card>
              <CardHeader>
                <CardTitle>Neue Abonnenten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscribers.slice(0, 5).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{sub.email}</p>
                        <p className="text-sm text-gray-500">
                          {sub.firstName} {sub.lastName}
                        </p>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>
                  ))}
                  {subscribers.length === 0 && (
                    <p className="text-gray-500 text-center py-8">Noch keine Abonnenten</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="draft">Entwürfe</SelectItem>
                  <SelectItem value="scheduled">Geplant</SelectItem>
                  <SelectItem value="sent">Gesendet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowNewCampaign(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Neue Kampagne
            </Button>
          </div>

          <div className="grid gap-4">
            {campaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{campaign.name}</h3>
                        {getCampaignStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{campaign.subject}</p>
                      {campaign.status === 'sent' && (
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {campaign.sent} gesendet
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}% geöffnet
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointer className="w-4 h-4" />
                            {campaign.opened > 0 ? ((campaign.clicked / campaign.opened) * 100).toFixed(1) : 0}% geklickt
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status === 'draft' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-1" />
                            Bearbeiten
                          </Button>
                          <Button size="sm" onClick={() => handleSendCampaign(campaign.id)}>
                            <Send className="w-4 h-4 mr-1" />
                            Senden
                          </Button>
                        </>
                      )}
                      {campaign.status === 'sent' && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign)}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Report
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Vorschau
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="w-4 h-4 mr-2" />
                            Duplizieren
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Suchen..."
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={subscriberFilter} onValueChange={(v) => setSubscriberFilter(v as typeof subscriberFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="subscribed">Aktiv</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="unsubscribed">Abgemeldet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportSubscribers}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button onClick={() => setShowNewSubscriber(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Hinzufügen
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4">
                      <Checkbox />
                    </th>
                    <th className="text-left p-4">E-Mail</th>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Tags</th>
                    <th className="text-left p-4">Engagement</th>
                    <th className="text-left p-4">Angemeldet</th>
                    <th className="text-left p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map(sub => (
                    <tr key={sub.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Checkbox />
                      </td>
                      <td className="p-4">{sub.email}</td>
                      <td className="p-4">
                        {sub.firstName || sub.lastName 
                          ? `${sub.firstName || ''} ${sub.lastName || ''}`.trim()
                          : '-'
                        }
                      </td>
                      <td className="p-4">{getStatusBadge(sub.status)}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {sub.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {sub.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{sub.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <span className="text-gray-500">{sub.emailsOpened}/{sub.emailsSent}</span>
                          <span className="text-gray-400 ml-1">geöffnet</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {sub.createdAt ? format(new Date(sub.createdAt), 'dd.MM.yyyy', { locale: de }) : '-'}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Tag className="w-4 h-4 mr-2" />
                              Tags bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteSubscriber(sub.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Löschen (DSGVO)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubscribers.length === 0 && (
                <p className="text-gray-500 text-center py-8">Keine Abonnenten gefunden</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-500">E-Mail-Vorlagen für Kampagnen</p>
            <Button onClick={handleNewTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              Neue Vorlage
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card key={template.id} className="group relative hover:border-teal-500 transition-colors overflow-hidden">
                <CardContent className="p-4">
                  <div className="aspect-video bg-linear-to-br from-teal-50 to-gray-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    {template.htmlContent ? (
                      <div 
                        className="absolute inset-0 transform scale-[0.3] origin-top-left w-[333%] h-[333%] pointer-events-none"
                        dangerouslySetInnerHTML={{ 
                          __html: template.htmlContent.replace(/<body[^>]*>/, '<body style="margin:0;padding:0;transform-origin:0 0;">') 
                        }} 
                      />
                    ) : (
                      <FileText className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline">{template.category}</Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleEditTemplate(template); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <Card className="md:col-span-3">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Noch keine Vorlagen erstellt</p>
                  <Button className="mt-4" onClick={handleNewTemplate}>
                    Erste Vorlage erstellen
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="w-12 h-12 text-teal-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Automatisierungen</h3>
              <p className="text-gray-500 mb-4">
                Erstellen Sie automatisierte E-Mail-Workflows wie Willkommens-Serien, 
                Geburtstagsmails und mehr.
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Neue Automatisierung
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Newsletter-Einstellungen</CardTitle>
              <CardDescription>SMTP-Server: mail.taskilo.de (Hetzner)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Standard Absendername</Label>
                  <Input defaultValue="Taskilo" />
                </div>
                <div>
                  <Label>Standard Absender-E-Mail</Label>
                  <Input defaultValue="newsletter@taskilo.de" />
                </div>
                <div>
                  <Label>Antwort-Adresse</Label>
                  <Input defaultValue="support@taskilo.de" />
                </div>
                <div>
                  <Label>Firmenname (für Footer)</Label>
                  <Input defaultValue="Taskilo GmbH" />
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-3">Double-Opt-In & DSGVO</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="double-optin" />
                    <label htmlFor="double-optin">Double-Opt-In aktivieren (DSGVO-konform)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="welcome-email" />
                    <label htmlFor="welcome-email">Willkommens-E-Mail nach Bestätigung senden</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="track-opens" />
                    <label htmlFor="track-opens">Öffnungen tracken</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="track-clicks" />
                    <label htmlFor="track-clicks">Klicks tracken</label>
                  </div>
                </div>
              </div>

              <Button className="mt-4">Einstellungen speichern</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Kampagne erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue E-Mail-Kampagne für Ihre Abonnenten
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kampagnenname</Label>
              <Input
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Januar Newsletter 2026"
              />
            </div>
            <div>
              <Label>Betreffzeile</Label>
              <Input
                value={newCampaign.subject}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="z.B. Neuigkeiten von Taskilo"
              />
            </div>
            <div>
              <Label>Vorschautext</Label>
              <Input
                value={newCampaign.previewText}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, previewText: e.target.value }))}
                placeholder="Kurzer Text der in der E-Mail-Vorschau angezeigt wird"
              />
            </div>
            <div>
              <Label>Vorlage auswählen (optional)</Label>
              <Select
                value={newCampaign.templateId || 'none'}
                onValueChange={(v) => setNewCampaign(prev => ({ ...prev, templateId: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keine Vorlage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Vorlage</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>E-Mail-Inhalt (HTML)</Label>
              <Textarea
                value={newCampaign.content}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, content: e.target.value }))}
                placeholder="<h1>Hallo {{firstName}}</h1><p>Ihr Newsletter-Inhalt...</p>"
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Verfügbare Variablen: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}, {'{{fullName}}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCampaign(false)}>
              Abbrechen
            </Button>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Vorschau
            </Button>
            <Button onClick={handleCreateCampaign}>
              Kampagne erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Subscriber Dialog */}
      <Dialog open={showNewSubscriber} onOpenChange={setShowNewSubscriber}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abonnent hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Abonnenten manuell hinzu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-Mail-Adresse *</Label>
              <Input
                type="email"
                value={newSubscriber.email}
                onChange={(e) => setNewSubscriber(prev => ({ ...prev, email: e.target.value }))}
                placeholder="max@beispiel.de"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vorname</Label>
                <Input
                  value={newSubscriber.firstName}
                  onChange={(e) => setNewSubscriber(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Max"
                />
              </div>
              <div>
                <Label>Nachname</Label>
                <Input
                  value={newSubscriber.lastName}
                  onChange={(e) => setNewSubscriber(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Mustermann"
                />
              </div>
            </div>
            <div>
              <Label>Tags (kommagetrennt)</Label>
              <Input
                value={newSubscriber.tags}
                onChange={(e) => setNewSubscriber(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="vip, kunde, interessent"
              />
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-700">
                Der Abonnent erhält eine Bestätigungs-E-Mail (Double-Opt-In)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSubscriber(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddSubscriber}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Report Dialog */}
      {selectedCampaign && (
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Kampagnen-Report: {selectedCampaign.name}</DialogTitle>
              <DialogDescription>
                Gesendet am {selectedCampaign.sentAt 
                  ? format(new Date(selectedCampaign.sentAt), 'dd.MM.yyyy HH:mm', { locale: de })
                  : '-'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{selectedCampaign.sent}</p>
                  <p className="text-sm text-gray-500">Gesendet</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {selectedCampaign.sent > 0 ? ((selectedCampaign.opened / selectedCampaign.sent) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-sm text-gray-500">Öffnungsrate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {selectedCampaign.opened > 0 ? ((selectedCampaign.clicked / selectedCampaign.opened) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-sm text-gray-500">Klickrate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">{selectedCampaign.bounced}</p>
                  <p className="text-sm text-gray-500">Bounces</p>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Zugestellt</span>
                <span>{selectedCampaign.delivered}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Bounces</span>
                <span className="text-red-600">{selectedCampaign.bounced}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Geöffnet</span>
                <span>{selectedCampaign.opened}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Geklickt</span>
                <span>{selectedCampaign.clicked}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Email Template Editor */}
      <EmailTemplateEditor
        isOpen={showTemplateEditor}
        onClose={() => {
          setShowTemplateEditor(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate ? {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          description: selectedTemplate.description || '',
          category: selectedTemplate.category || 'general',
          htmlContent: selectedTemplate.htmlContent || '',
        } : null}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
