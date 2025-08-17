'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, CheckCircle, Clock, AlertCircle, RefreshCw, Mail, User } from 'lucide-react';
import { SentEmail } from '@/types/email';

interface SentEmailsViewProps {
  onEmailClick?: (email: SentEmail) => void;
  refreshTrigger?: number; // Prop für automatische Aktualisierung
}

export default function SentEmailsView({ onEmailClick, refreshTrigger }: SentEmailsViewProps) {
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSentEmails();
  }, []);

  // Reagiere auf refreshTrigger Änderungen
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('📤 [SentEmailsView] Refresh triggered:', refreshTrigger);
      // Verzögerung, damit IMAP-Speicherung Zeit hat
      setTimeout(() => {
        loadSentEmails();
      }, 2000);
    }
  }, [refreshTrigger]);

  const loadSentEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📤 Loading sent emails from WorkMail...');

      const response = await fetch('/api/admin/workmail/emails/sent?limit=50', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📤 Sent emails API Response:', result);

      if (result.success && result.data?.emails) {
        console.log('✅ Loaded sent emails:', result.data.emails.length);

        // Konvertiere zu SentEmail-Format
        const sentEmailsData = result.data.emails.map((email: any) => ({
          id: email.id || `sent_${Date.now()}_${Math.random()}`,
          to: email.to || 'Unbekannt',
          subject: email.subject || 'Kein Betreff',
          status: 'delivered' as const, // Gesendete E-Mails sind normalerweise zugestellt
          sentAt: email.sentAt || email.receivedAt || new Date().toISOString(),
          messageId: email.messageId,
          from: email.from,
          textContent: email.textContent,
          htmlContent: email.htmlContent,
        }));

        setSentEmails(sentEmailsData);
        console.log('📤 Set sent emails to state:', sentEmailsData);
      } else {
        console.error('❌ Failed to load sent emails:', result.error);
        // Fallback zu Demo-Daten
        loadDemoSentEmails();
      }
    } catch (error) {
      console.error('❌ Error loading sent emails:', error);
      setError('Fehler beim Laden der gesendeten E-Mails');
      // Fallback zu Demo-Daten
      loadDemoSentEmails();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoSentEmails = () => {
    console.log('📤 Loading demo sent emails...');
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

  const formatEmailDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return {
          date: new Date().toLocaleDateString('de-DE'),
          time: new Date().toLocaleTimeString('de-DE'),
        };
      }
      return {
        date: date.toLocaleDateString('de-DE'),
        time: date.toLocaleTimeString('de-DE'),
      };
    } catch {
      return {
        date: new Date().toLocaleDateString('de-DE'),
        time: new Date().toLocaleTimeString('de-DE'),
      };
    }
  };

  const getStatusIcon = (status: SentEmail['status']) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: SentEmail['status']) => {
    switch (status) {
      case 'delivered':
        return 'Zugestellt';
      case 'sent':
        return 'Gesendet';
      case 'failed':
        return 'Fehlgeschlagen';
      default:
        return 'Unbekannt';
    }
  };

  const getStatusBadgeColor = (status: SentEmail['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gesendete E-Mails</h2>
          <p className="text-gray-600">AWS WorkMail Integration für Taskilo Platform</p>
        </div>
        <Button
          variant="outline"
          onClick={loadSentEmails}
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Aktualisieren</span>
        </Button>
      </div>

      {/* Status Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Send className="h-5 w-5 text-[#14ad9f]" />
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <Badge className="bg-green-100 text-green-800 border-green-200">Aktiv</Badge>
            </div>
            <div className="text-sm text-gray-500">Gesendete E-Mails: {sentEmails.length}</div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin text-[#14ad9f]" />
              <span className="text-gray-600">Lade gesendete E-Mails...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sent Emails List */}
      {!loading && (
        <Card>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {sentEmails.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Keine gesendeten E-Mails gefunden</p>
                  </div>
                ) : (
                  sentEmails.map(email => {
                    const { date, time } = formatEmailDate(email.sentAt);
                    return (
                      <div
                        key={email.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onEmailClick?.(email)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {email.to}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900 mb-1 truncate">
                              {email.subject}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>
                                {date}, {time}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {getStatusIcon(email.status)}
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStatusBadgeColor(email.status)}`}
                            >
                              {getStatusText(email.status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
