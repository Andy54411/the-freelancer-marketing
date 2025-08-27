'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  User,
  Calendar,
  MessageSquare,
  Globe,
  Trash2,
} from 'lucide-react';
import { SentEmail } from '@/types/email';

interface SentEmailDetailViewProps {
  email: SentEmail;
  onBack: () => void;
  onDelete?: () => void;
}

export default function SentEmailDetailView({ email, onBack, onDelete }: SentEmailDetailViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese E-Mail permanent löschen möchten?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/workmail/emails/sent?messageId=${encodeURIComponent(email.messageId || '')}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete email');
      }

      alert('E-Mail wurde erfolgreich gelöscht.');
      onDelete?.(); // Trigger parent refresh
    } catch (error) {
      alert('Fehler beim Löschen der E-Mail.');
    } finally {
      setIsDeleting(false);
    }
  };
  const formatEmailDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unbekanntes Datum';
      }
      return date.toLocaleString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Unbekanntes Datum';
    }
  };

  const getStatusIcon = (status: SentEmail['status']) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'sent':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Mail className="h-5 w-5 text-gray-500" />;
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
      {/* Header mit Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">E-Mail Details</h2>
            <p className="text-gray-600">Detailansicht der gesendeten E-Mail</p>
          </div>
        </div>

        {/* Delete Button */}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center space-x-2"
          >
            <Trash2 className={`h-4 w-4 ${isDeleting ? 'animate-spin' : ''}`} />
            <span>{isDeleting ? 'Wird gelöscht...' : 'Endgültig löschen'}</span>
          </Button>
        )}
      </div>

      {/* E-Mail Header Information */}
      <Card>
        <CardContent className="p-0">
          {/* Header-Leiste mit wichtigsten Informationen */}
          <div className="bg-gray-50 border-b px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Hauptinformationen */}
              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-[#14ad9f] rounded-full">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      An
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{email.to}</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-500 rounded-full">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Betreff
                    </div>
                    <div className="text-lg font-semibold text-gray-900 leading-tight">
                      {email.subject || 'Kein Betreff'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status und Meta-Informationen */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(email.status)}
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </div>
                    <Badge
                      variant="outline"
                      className={`${getStatusBadgeColor(email.status)} font-medium`}
                    >
                      {getStatusText(email.status)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-1 bg-gray-400 rounded-full">
                    <Calendar className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Gesendet
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatEmailDate(email.sentAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E-Mail Inhalt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-[#14ad9f]" />
            <span>E-Mail Inhalt</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {email.htmlContent && email.htmlContent.trim() ? (
              <div>
                <div className="mb-4">
                  <Badge variant="outline" className="mb-2">
                    HTML Inhalt
                  </Badge>
                  <div
                    className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg border"
                    dangerouslySetInnerHTML={{ __html: email.htmlContent }}
                  />
                </div>
                {/* Zeige auch Text-Inhalt falls unterschiedlich und kein HTML */}
                {email.textContent &&
                  email.textContent.trim() &&
                  email.textContent !== email.htmlContent &&
                  !email.textContent.startsWith('Sent to:') &&
                  !email.textContent.includes('<div') &&
                  !email.textContent.includes('<p>') && (
                    <div className="mt-4">
                      <Badge variant="outline" className="mb-2">
                        Text Version
                      </Badge>
                      <div className="bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap text-sm">
                        {email.textContent}
                      </div>
                    </div>
                  )}
              </div>
            ) : email.textContent &&
              email.textContent.trim() &&
              !email.textContent.startsWith('Sent to:') ? (
              <div>
                {/* Prüfe ob der textContent eigentlich HTML ist */}
                {email.textContent.includes('<div') ||
                email.textContent.includes('<p>') ||
                email.textContent.includes('<html') ? (
                  <div>
                    <div
                      className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg border"
                      dangerouslySetInnerHTML={{ __html: email.textContent }}
                    />
                  </div>
                ) : (
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Text Inhalt
                    </Badge>
                    <div className="bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap text-sm">
                      {email.textContent}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">E-Mail-Inhalt wird geladen...</p>
                <p className="text-sm text-gray-400 mt-2">
                  Diese E-Mail wurde erfolgreich gesendet. Der Inhalt wird aus dem E-Mail-System
                  extrahiert.
                </p>
                {email.textContent && email.textContent.startsWith('Sent to:') && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">{email.textContent}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
