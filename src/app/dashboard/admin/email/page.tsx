'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { convert } from 'html-to-text';
import { ReceivedEmail, SentEmail, EmailTemplate } from '@/types/email';

// Dynamic Imports für bessere Performance und Code-Splitting
const EmailDetailView = dynamic(() => import('@/components/admin/EmailDetailView'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>,
  ssr: false,
});

const ArchivedEmailsView = dynamic(() => import('@/components/admin/ArchivedEmailsView'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>,
  ssr: false,
});

const SentEmailsView = dynamic(() => import('@/components/admin/SentEmailsView'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>,
  ssr: false,
});

const SentEmailDetailView = dynamic(() => import('@/components/admin/SentEmailDetailView'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>,
  ssr: false,
});
import {
  Send,
  Archive,
  Inbox,
  Plus,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  Zap,
  Mail,
  Paperclip,
  FileText,
} from 'lucide-react';

// Hilfsfunktion für bessere Datumsformatierung
const formatEmailDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Fallback: aktuelles Datum verwenden
      return {
        date: new Date().toLocaleDateString('de-DE'),
        time: new Date().toLocaleTimeString('de-DE'),
      };
    }
    return {
      date: date.toLocaleDateString('de-DE'),
      time: date.toLocaleTimeString('de-DE'),
    };
  } catch (error) {
    // Fallback bei Fehlern
    return {
      date: new Date().toLocaleDateString('de-DE'),
      time: new Date().toLocaleTimeString('de-DE'),
    };
  }
};

// Hilfsfunktion für bessere HTML-zu-Text-Konvertierung
const cleanTextContent = (content: string): string => {
  if (!content) return '';

  try {
    // HTML-zu-Text Konvertierung mit html-to-text
    const textContent = convert(content, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' },
      ],
    });

    return textContent.trim();
  } catch (error) {
    console.warn('Fallback: Nur manuelle Bereinigung:', error);
    // Fallback: Einfache Tag-Entfernung falls html-to-text fehlschlägt
    return content.replace(/<[^>]*>/g, '').trim();
  }
};

export default function EmailAdminPage() {
  const [activeTab, setActiveTab] = useState('compose');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmail[]>([]);
  const [archivedEmails, setArchivedEmails] = useState<ReceivedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(null);
  const [selectedSentEmail, setSelectedSentEmail] = useState<SentEmail | null>(null);
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [showSentEmailDetail, setShowSentEmailDetail] = useState(false);
  const [showArchiveView, setShowArchiveView] = useState(false);
  const [sentEmailsRefreshTrigger, setSentEmailsRefreshTrigger] = useState(0);

  // Helper function to change tabs and reset detail views
  const handleTabChange = (tab: string) => {
    setShowEmailDetail(false);
    setShowSentEmailDetail(false);
    setSelectedEmail(null);
    setSelectedSentEmail(null);
    setActiveTab(tab);
  };

  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    htmlContent: '',
    textContent: '',
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    category: 'notification' as
      | 'support'
      | 'inquiry'
      | 'feedback'
      | 'business'
      | 'welcome'
      | 'notification',
  });

  // Load real WorkMail data
  useEffect(() => {
    console.log('🔄 useEffect executed - loading WorkMail emails...');
    loadWorkmailEmails();
    loadEmailTemplates();
  }, []);

  const loadWorkmailEmails = async () => {
    try {
      setLoading(true);
      console.log('📧 Loading WorkMail emails...');

      const response = await fetch('/api/admin/workmail/emails?folder=INBOX&limit=50', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📧 WorkMail API Response:', result);

      if (result.success && result.data?.emails) {
        console.log('✅ Loaded WorkMail emails:', result.data.emails.length);
        console.log('📧 Setting WorkMail emails to state:', result.data.emails);
        setReceivedEmails(result.data.emails);
      } else {
        console.error('❌ Failed to load WorkMail emails:', result.error);
        // Fallback to demo data if WorkMail fails
        loadDemoEmails();
      }
    } catch (error) {
      console.error('❌ Error loading WorkMail emails:', error);
      // Fallback to demo data if WorkMail fails
      loadDemoEmails();
    } finally {
      setLoading(false);
    }
  };

  const loadEmailTemplates = () => {
    // Load demo templates (diese können später auch aus einer API kommen)
    setTemplates([
      {
        id: '1',
        name: 'Willkommens-E-Mail',
        subject: 'Willkommen bei Taskilo!',
        htmlContent: '<h1>Willkommen!</h1><p>Vielen Dank für Ihre Anmeldung bei Taskilo.</p>',
        textContent: 'Willkommen! Vielen Dank für Ihre Anmeldung bei Taskilo.',
        category: 'welcome',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Service-Bestätigung',
        subject: 'Service-Buchung bestätigt',
        htmlContent: '<h2>Service bestätigt</h2><p>Ihr Service wurde erfolgreich gebucht.</p>',
        textContent: 'Service bestätigt. Ihr Service wurde erfolgreich gebucht.',
        category: 'notification',
        createdAt: new Date().toISOString(),
      },
    ]);

    // Load demo sent emails
    setSentEmails([
      {
        id: 'demo_1',
        to: 'kunde@beispiel.de',
        subject: 'Willkommen bei Taskilo!',
        status: 'delivered',
        sentAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
      {
        id: 'demo_2',
        to: 'andy.staudinger@taskilo.de',
        subject: 'WorkMail Test erfolgreich',
        status: 'sent',
        sentAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      },
    ]);
  };

  const loadDemoEmails = () => {
    // Fallback Demo-Daten
    console.log('🚨 Loading DEMO emails (fallback)');
    setReceivedEmails([
      {
        id: 'received_1',
        from: 'kunde@beispiel.de',
        subject: 'Frage zu meiner Buchung',
        textContent:
          'Hallo, ich habe eine Frage zu meiner Service-Buchung. Können Sie mir bitte helfen?',
        htmlContent:
          '<p>Hallo,</p><p>ich habe eine Frage zu meiner Service-Buchung. Können Sie mir bitte helfen?</p><p>Vielen Dank!</p>',
        receivedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        isRead: false,
        priority: 'normal',
        category: 'support',
      },
      {
        id: 'received_2',
        from: 'partner@handwerker.de',
        subject: 'Neue Kooperation',
        textContent: 'Guten Tag, wir möchten gerne eine Partnerschaft mit Taskilo eingehen.',
        htmlContent:
          '<p>Guten Tag,</p><p>wir möchten gerne eine Partnerschaft mit Taskilo eingehen.</p>',
        receivedAt: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
        isRead: true,
        priority: 'high',
        category: 'business',
      },
      {
        id: 'received_3',
        from: 'support@aws.amazon.com',
        subject: 'WorkMail Wartung',
        textContent: 'Ihre WorkMail Organisation wird planmäßig gewartet.',
        htmlContent: '<p>Ihre WorkMail Organisation wird planmäßig gewartet.</p>',
        receivedAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        isRead: false,
        priority: 'low',
        category: 'support',
      },
    ]);
  };

  // Email Detail View Handler Functions
  const handleEmailClick = (email: ReceivedEmail) => {
    setSelectedEmail(email);
    setShowEmailDetail(true);

    // Mark as read if not already
    if (!email.isRead) {
      handleMarkAsRead(email.id, true);
    }
  };

  const handleBackToInbox = () => {
    setShowEmailDetail(false);
    setSelectedEmail(null);
  };

  const handleReplyToEmail = (email: ReceivedEmail) => {
    // Switch to compose tab and pre-fill with reply data
    handleTabChange('compose');
    setComposeForm({
      to: email.from,
      subject: email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`,
      htmlContent: `<br><br>--- Original Message ---<br>From: ${email.from}<br>Subject: ${email.subject}<br><br>${email.htmlContent}`,
      textContent: `\n\n--- Original Message ---\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.textContent}`,
    });
    setShowEmailDetail(false);
    setSelectedEmail(null);
  };

  const handleDeleteEmail = async (emailId: string) => {
    if (confirm('Sind Sie sicher, dass Sie diese E-Mail löschen möchten?')) {
      // Here you would typically call an API to delete the email
      setReceivedEmails(prev => prev.filter(email => email.id !== emailId));
      setShowEmailDetail(false);
      setSelectedEmail(null);
    }
  };

  const handleArchiveEmail = async (emailId: string) => {
    try {
      // Finde die E-Mail im Posteingang
      const emailToArchive = receivedEmails.find(email => email.id === emailId);

      if (emailToArchive) {
        // Füge die E-Mail zum Archiv hinzu
        setArchivedEmails(prev => [
          ...prev,
          {
            ...emailToArchive,
            isArchived: true,
            archivedAt: new Date().toISOString(),
          },
        ]);

        // Entferne die E-Mail aus dem Posteingang
        setReceivedEmails(prev => prev.filter(email => email.id !== emailId));

        console.log(`✅ E-Mail "${emailToArchive.subject}" erfolgreich archiviert`);

        // API-Call für echte Archivierung (WorkMail IMAP MOVE-Operation)
        await fetch('/api/admin/workmail/emails/archive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ emailId, messageId: emailToArchive.messageId }),
        }).catch(err => {
          console.warn('⚠️ Archiv-API-Call fehlgeschlagen:', err);
        });
      }

      // Schließe Detail-View
      setShowEmailDetail(false);
      setSelectedEmail(null);
    } catch (error) {
      console.error('❌ Fehler beim Archivieren:', error);
    }
  };

  const handleMarkAsRead = async (emailId: string, isRead: boolean) => {
    // Update local state
    setReceivedEmails(prev =>
      prev.map(email => (email.id === emailId ? { ...email, isRead } : email))
    );

    // Here you would typically call an API to update the read status
    // await fetch(`/api/admin/workmail/emails/${emailId}/read`, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ isRead })
    // });
  };

  const handleReplyAllToEmail = (email: ReceivedEmail) => {
    console.log('Allen antworten für E-Mail:', email.subject);
    // Implementierung für "Allen antworten"
    // Hier würde normalerweise ein Reply-All-Dialog geöffnet werden
  };

  const handleForwardEmail = (email: ReceivedEmail) => {
    console.log('Weiterleiten E-Mail:', email.subject);
    // Implementierung für "Weiterleiten"
    // Hier würde normalerweise ein Forward-Dialog geöffnet werden
  };

  const handleFavoriteEmail = async (emailId: string) => {
    console.log('Favorit markieren E-Mail ID:', emailId);
    // Implementierung für "Favorit"
    // Hier würde normalerweise der Favorit-Status in der API aktualisiert werden
    setReceivedEmails(prev =>
      prev.map(email =>
        email.id === emailId ? { ...email, isFavorite: !email.isFavorite } : email
      )
    );
  };

  // Archiv-spezifische Handler
  const handleShowArchive = () => {
    setShowArchiveView(true);
    setShowEmailDetail(false);
    setSelectedEmail(null);
  };

  const handleBackFromArchive = () => {
    setShowArchiveView(false);
  };

  const handleRestoreEmail = async (emailId: string) => {
    try {
      const emailToRestore = archivedEmails.find(email => email.id === emailId);
      if (emailToRestore) {
        // Entferne aus Archiv
        setArchivedEmails(prev => prev.filter(email => email.id !== emailId));

        // Füge zurück zur Inbox hinzu
        setReceivedEmails(prev => [
          ...prev,
          {
            ...emailToRestore,
            isArchived: false,
            archivedAt: undefined,
          },
        ]);

        console.log(`✅ E-Mail "${emailToRestore.subject}" erfolgreich wiederhergestellt`);

        // API-Call für echte Wiederherstellung
        await fetch('/api/admin/workmail/emails/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ emailId, messageId: emailToRestore.messageId }),
        }).catch(err => {
          console.warn('⚠️ Wiederherstellungs-API-Call fehlgeschlagen:', err);
        });
      }
    } catch (error) {
      console.error('❌ Fehler beim Wiederherstellen:', error);
    }
  };

  const handleDeleteFromArchive = async (emailId: string) => {
    try {
      const emailToDelete = archivedEmails.find(email => email.id === emailId);
      if (emailToDelete && window.confirm(`E-Mail "${emailToDelete.subject}" endgültig löschen?`)) {
        // Entferne aus Archiv
        setArchivedEmails(prev => prev.filter(email => email.id !== emailId));

        console.log(`✅ E-Mail "${emailToDelete.subject}" endgültig gelöscht`);

        // API-Call für echtes Löschen
        await fetch('/api/admin/workmail/emails/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ emailId, messageId: emailToDelete.messageId }),
        }).catch(err => {
          console.warn('⚠️ Lösch-API-Call fehlgeschlagen:', err);
        });
      }
    } catch (error) {
      console.error('❌ Fehler beim Löschen:', error);
    }
  };

  const handleArchivedEmailClick = (email: ReceivedEmail) => {
    setSelectedEmail(email);
    setShowEmailDetail(true);
    setShowArchiveView(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Zugestellt
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Ausstehend
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Fehlgeschlagen
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  const handleSendWorkMail = async () => {
    if (!composeForm.to || !composeForm.subject) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/workmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...composeForm,
          from: 'support@taskilo.de',
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`WorkMail E-Mail erfolgreich versendet! Message ID: ${result.messageId}`);
        setComposeForm({ to: '', subject: '', htmlContent: '', textContent: '' });

        // Add to sent emails local state
        const newSentEmail: SentEmail = {
          id: result.messageId || Date.now().toString(),
          to: composeForm.to,
          subject: composeForm.subject,
          status: 'sent',
          sentAt: new Date().toISOString(),
        };
        setSentEmails(prev => [newSentEmail, ...prev]);
      } else {
        alert(`WorkMail Fehler: ${result.error}`);
      }
    } catch (error) {
      console.error('WorkMail error:', error);
      alert('Fehler beim Senden über WorkMail');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setLoading(true);
    try {
      const newTemplate: EmailTemplate = {
        id: Date.now().toString(),
        ...templateForm,
        createdAt: new Date().toISOString(),
      };

      setTemplates(prev => [newTemplate, ...prev]);
      setTemplateForm({
        name: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        category: 'notification',
      });
      alert('Template erfolgreich gespeichert!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Fehler beim Speichern des Templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    setComposeForm({
      to: '',
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
    });
    handleTabChange('compose');
  };

  const sidebarItems = [
    { id: 'compose', label: 'E-Mail verfassen', icon: Send },
    { id: 'inbox', label: 'Posteingang', icon: Inbox },
    { id: 'archive', label: 'Archiv', icon: Archive },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'sent', label: 'Gesendet', icon: Inbox },
    { id: 'create-template', label: 'Template erstellen', icon: Plus },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Show Archive View if archive is selected */}
      {showArchiveView ? (
        <ArchivedEmailsView
          archivedEmails={archivedEmails}
          onBack={handleBackFromArchive}
          onRestore={handleRestoreEmail}
          onDelete={handleDeleteFromArchive}
          onEmailClick={handleArchivedEmailClick}
        />
      ) : /* Show Email Detail View if email is selected */
      showEmailDetail && selectedEmail ? (
        <EmailDetailView
          email={selectedEmail}
          emails={receivedEmails} // E-Mail-Array für Thread-Navigation
          onBack={handleBackToInbox}
          onReply={handleReplyToEmail}
          onReplyAll={handleReplyAllToEmail}
          onForward={handleForwardEmail}
          onFavorite={handleFavoriteEmail}
          onDelete={handleDeleteEmail}
          onArchive={handleArchiveEmail}
          onMarkAsRead={handleMarkAsRead}
          onEmailSelect={email => {
            setSelectedEmail(email);
            // Optional: E-Mail als gelesen markieren wenn sie ausgewählt wird
            handleMarkAsRead(email.id, true);
          }}
          onEmailSent={() => {
            loadWorkmailEmails(); // E-Mail-Liste nach dem Senden neu laden
            setSentEmailsRefreshTrigger(prev => prev + 1); // SentEmailsView neu laden
          }}
        />
      ) : (
        /* Normal Email Dashboard */
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#14ad9f] rounded-lg">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">E-Mail Center</h1>
                  <p className="text-sm text-gray-500">WorkMail Management</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4 py-6">
              <div className="space-y-2">
                {sidebarItems.map(item => {
                  const Icon = item.icon;
                  const unreadCount =
                    item.id === 'inbox' ? receivedEmails.filter(email => !email.isRead).length : 0;
                  const archiveCount = item.id === 'archive' ? archivedEmails.length : 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'archive') {
                          handleShowArchive();
                        } else {
                          handleTabChange(item.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                        activeTab === item.id || (item.id === 'archive' && showArchiveView)
                          ? 'bg-[#14ad9f] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                      {archiveCount > 0 && (
                        <span className="bg-[#14ad9f] text-white text-xs px-2 py-1 rounded-full">
                          {archiveCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>WorkMail verbunden</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {sidebarItems.find(item => item.id === activeTab)?.label}
                  </h2>
                  <p className="text-sm text-gray-600">
                    AWS WorkMail Integration für Taskilo Platform
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aktiv
                  </Badge>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-auto">
              {/* Compose Content */}
              {activeTab === 'compose' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Send className="h-5 w-5 mr-2 text-[#14ad9f]" />
                      E-Mail verfassen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Empfänger *</label>
                      <Input
                        type="email"
                        placeholder="empfaenger@beispiel.de"
                        value={composeForm.to}
                        onChange={e => setComposeForm({ ...composeForm, to: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Betreff *</label>
                      <Input
                        placeholder="E-Mail Betreff"
                        value={composeForm.subject}
                        onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">HTML Inhalt</label>
                      <Textarea
                        placeholder="HTML Version der E-Mail"
                        value={composeForm.htmlContent}
                        onChange={e =>
                          setComposeForm({ ...composeForm, htmlContent: e.target.value })
                        }
                        rows={8}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Text Inhalt</label>
                      <Textarea
                        placeholder="Text Version der E-Mail"
                        value={composeForm.textContent}
                        onChange={e =>
                          setComposeForm({ ...composeForm, textContent: e.target.value })
                        }
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSendWorkMail}
                        disabled={loading}
                        className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white"
                      >
                        {loading ? 'Wird gesendet...' : 'E-Mail senden'}
                      </Button>

                      <Button
                        onClick={async () => {
                          // WorkMail Test Function
                          setLoading(true);
                          try {
                            const response = await fetch('/api/admin/workmail/send', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                to: 'andy.staudinger@taskilo.de',
                                subject: 'WorkMail Test - Taskilo Platform',
                                htmlContent: `
                                <h2>WorkMail Test erfolgreich!</h2>
                                <p>Diese E-Mail wurde über AWS WorkMail versendet.</p>
                                <p><strong>Organisation:</strong> taskilo-org</p>
                                <p><strong>Domain:</strong> taskilo.de</p>
                                <p><strong>Absender:</strong> support@taskilo.de</p>
                                <p><strong>Zeit:</strong> ${new Date().toLocaleString('de-DE')}</p>
                                <hr>
                                <p><em>Taskilo Platform - E-Mail System</em></p>
                              `,
                                from: 'support@taskilo.de',
                              }),
                            });

                            const result = await response.json();
                            if (result.success) {
                              alert(
                                `WorkMail Test erfolgreich! E-Mail an andy.staudinger@taskilo.de gesendet. Message ID: ${result.messageId}`
                              );
                            } else {
                              alert(`WorkMail Test fehlgeschlagen: ${result.error}`);
                            }
                          } catch (error) {
                            console.error('WorkMail test error:', error);
                            alert('Fehler beim WorkMail Test');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        variant="outline"
                        className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Test senden
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Templates Content */}
              {activeTab === 'templates' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Archive className="h-5 w-5 mr-2 text-[#14ad9f]" />
                      E-Mail Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {templates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Archive className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Keine Templates vorhanden</p>
                        <p className="text-sm">
                          Erstellen Sie Ihr erstes Template im Tab &quot;Template erstellen&quot;
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {templates.map(template => (
                          <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{template.name}</h3>
                                <p className="text-sm text-gray-600">{template.subject}</p>
                                <p className="text-xs text-gray-500">
                                  Erstellt:{' '}
                                  {new Date(template.createdAt).toLocaleDateString('de-DE')}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUseTemplate(template)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Verwenden
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Archive Content */}
              {activeTab === 'archive' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Archive className="h-5 w-5 mr-2 text-[#14ad9f]" />
                      Archivierte E-Mails
                      <Badge variant="secondary" className="ml-2">
                        {archivedEmails.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {archivedEmails.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Archive className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Keine archivierten E-Mails</p>
                        <p className="text-sm">Archivierte E-Mails werden hier angezeigt</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {archivedEmails.map(email => (
                          <div
                            key={email.id}
                            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedEmail(email);
                              setShowEmailDetail(true);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900">{email.from}</span>
                                  <Badge
                                    variant={
                                      email.priority === 'high' ? 'destructive' : 'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {email.priority}
                                  </Badge>
                                  {email.isFavorite && (
                                    <Badge variant="outline" className="text-xs">
                                      ⭐ Favorit
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-medium text-gray-900 mb-1">{email.subject}</h3>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {cleanTextContent(
                                    email.textContent || email.htmlContent || ''
                                  ).substring(0, 150)}
                                  ...
                                </p>
                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span>{formatEmailDate(email.receivedAt).date}</span>
                                  {email.attachments && email.attachments.length > 0 && (
                                    <span className="flex items-center">
                                      <Paperclip className="h-3 w-3 mr-1" />
                                      {email.attachments.length}
                                    </span>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    📁 Archiviert
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={e => {
                                    e.stopPropagation();
                                    // Aus Archiv zurück in Posteingang verschieben
                                    setReceivedEmails(prev => [
                                      ...prev,
                                      { ...email, isArchived: false },
                                    ]);
                                    setArchivedEmails(prev => prev.filter(e => e.id !== email.id));
                                  }}
                                  className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                                >
                                  <Inbox className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (confirm('E-Mail endgültig löschen?')) {
                                      setArchivedEmails(prev =>
                                        prev.filter(e => e.id !== email.id)
                                      );
                                    }
                                  }}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Inbox Content */}
              {activeTab === 'inbox' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Inbox className="h-5 w-5 mr-2 text-[#14ad9f]" />
                        WorkMail Posteingang
                        {loading && (
                          <div className="ml-2 w-4 h-4 border-2 border-[#14ad9f] border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadWorkmailEmails}
                          disabled={loading}
                          className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {loading ? 'Lädt...' : 'Aktualisieren'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {receivedEmails.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Inbox className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Keine E-Mails empfangen</p>
                        <p className="text-sm">Empfangene E-Mails werden hier angezeigt</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {receivedEmails.map(email => (
                          <div
                            key={email.id}
                            className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${!email.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
                            onClick={() => handleEmailClick(email)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <p className="font-medium text-gray-900">{email.from}</p>
                                  {!email.isRead && (
                                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                      Neu
                                    </span>
                                  )}
                                  {email.priority === 'high' && (
                                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                                      Wichtig
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-900 font-medium">{email.subject}</p>
                                <p className="text-gray-600 text-sm mt-1">
                                  {cleanTextContent(
                                    email.textContent ||
                                      email.htmlContent ||
                                      'Kein Inhalt verfügbar'
                                  ).substring(0, 150) || 'Kein Inhalt verfügbar'}
                                  ...
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-500 text-sm">
                                  {formatEmailDate(email.receivedAt).date}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  {formatEmailDate(email.receivedAt).time}
                                </p>
                                {email.attachments && email.attachments.length > 0 && (
                                  <div className="flex items-center text-gray-500 text-sm mt-1">
                                    <Archive className="h-3 w-3 mr-1" />
                                    {email.attachments.length} Anhang(e)
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex space-x-2">
                              <Button
                                onClick={e => {
                                  e.stopPropagation(); // Prevent triggering email click
                                  handleEmailClick(email);
                                }}
                                variant="default"
                                size="sm"
                                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                E-Mail öffnen
                              </Button>
                              <Button
                                onClick={e => {
                                  e.stopPropagation(); // Prevent triggering email click
                                  const updatedEmails = receivedEmails.map(e =>
                                    e.id === email.id ? { ...e, isRead: !e.isRead } : e
                                  );
                                  setReceivedEmails(updatedEmails);
                                }}
                                variant="outline"
                                size="sm"
                              >
                                {email.isRead ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                              </Button>
                              <Button
                                onClick={e => {
                                  e.stopPropagation(); // Prevent triggering email click
                                  handleReplyToEmail(email);
                                }}
                                variant="outline"
                                size="sm"
                              >
                                Antworten
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sent Content */}
              {activeTab === 'sent' && !showSentEmailDetail && (
                <SentEmailsView
                  refreshTrigger={sentEmailsRefreshTrigger}
                  onEmailClick={email => {
                    console.log('Sent email clicked:', email);
                    setSelectedSentEmail(email);
                    setShowSentEmailDetail(true);
                  }}
                />
              )}

              {/* Sent Email Detail View */}
              {activeTab === 'sent' && showSentEmailDetail && selectedSentEmail && (
                <SentEmailDetailView
                  email={selectedSentEmail}
                  onBack={() => {
                    setShowSentEmailDetail(false);
                    setSelectedSentEmail(null);
                  }}
                  onDelete={() => {
                    // Trigger refresh of sent emails after deletion
                    setSentEmailsRefreshTrigger(prev => prev + 1);
                    setShowSentEmailDetail(false);
                    setSelectedSentEmail(null);
                  }}
                />
              )}

              {/* Create Template Content */}
              {activeTab === 'create-template' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Plus className="h-5 w-5 mr-2 text-[#14ad9f]" />
                      Template erstellen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Template Name *</label>
                      <Input
                        placeholder="z.B. Willkommen E-Mail"
                        value={templateForm.name}
                        onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Standard Betreff *</label>
                      <Input
                        placeholder="E-Mail Betreff"
                        value={templateForm.subject}
                        onChange={e =>
                          setTemplateForm({ ...templateForm, subject: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">HTML Inhalt</label>
                      <Textarea
                        placeholder="HTML Version der E-Mail"
                        value={templateForm.htmlContent}
                        onChange={e =>
                          setTemplateForm({ ...templateForm, htmlContent: e.target.value })
                        }
                        rows={8}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Text Inhalt</label>
                      <Textarea
                        placeholder="Text Version der E-Mail"
                        value={templateForm.textContent}
                        onChange={e =>
                          setTemplateForm({ ...templateForm, textContent: e.target.value })
                        }
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={handleSaveTemplate}
                      disabled={loading}
                      className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white"
                    >
                      {loading ? 'Wird gespeichert...' : 'Template speichern'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Settings Content */}
              {activeTab === 'settings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-[#14ad9f]" />
                      WorkMail Einstellungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Organisation ID:
                          </label>
                          <p className="text-gray-900 font-mono text-sm">
                            m-e5edbf8b2078453d91ad8c367671c228
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Status:</label>
                          <p className="text-green-600">Aktiv</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Verifizierte Domain:
                          </label>
                          <p className="text-gray-900">taskilo.de</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Standard Absender:
                          </label>
                          <p className="text-gray-900">support@taskilo.de</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Region:</label>
                          <p className="text-gray-900">AWS WorkMail (us-east-1)</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Web Interface:
                          </label>
                          <p className="text-gray-900">taskilo-org.awsapps.com</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">SMTP Host:</label>
                          <p className="text-gray-900 font-mono text-sm">
                            smtp.mail.us-east-1.awsapps.com
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">IMAP Host:</label>
                          <p className="text-gray-900 font-mono text-sm">
                            imap.mail.us-east-1.awsapps.com
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        AWS WorkMail SSO Integration
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-600">
                            Admin-Login mit WorkMail synchronisiert
                          </span>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/admin/workmail/sso', {
                                  credentials: 'include',
                                });
                                const result = await response.json();

                                if (result.success) {
                                  alert(
                                    `WorkMail SSO aktiv für: ${result.workmail.email}\nOrganisation: ${result.workmail.organization}\nRole: ${result.workmail.role}`
                                  );
                                } else {
                                  alert(`SSO Fehler: ${result.error}`);
                                }
                              } catch (error) {
                                console.error('SSO check error:', error);
                                alert('Fehler beim SSO-Check');
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            SSO Status prüfen
                          </Button>

                          <Button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/admin/workmail/sso', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ action: 'open_workmail_interface' }),
                                });

                                const result = await response.json();

                                if (result.success) {
                                  window.open(result.redirectUrl, '_blank');
                                  alert(
                                    'WorkMail Interface wird geöffnet. Verwenden Sie Ihre Admin-E-Mail zum Login.'
                                  );
                                } else {
                                  alert(`Fehler: ${result.error}`);
                                }
                              } catch (error) {
                                console.error('WorkMail interface error:', error);
                                alert('Fehler beim Öffnen des WorkMail Interface');
                              }
                            }}
                            variant="outline"
                            className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            WorkMail Interface öffnen
                          </Button>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">
                            Single Sign-On (SSO) Funktionalität:
                          </h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Automatische WorkMail-Authentifizierung beim Admin-Login</li>
                            <li>• Verwendung der Admin-E-Mail für WorkMail-Zugriff</li>
                            <li>• Kein separates Login für E-Mail-Funktionen erforderlich</li>
                            <li>• Sichere Credential-Verwaltung über Admin-Session</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
