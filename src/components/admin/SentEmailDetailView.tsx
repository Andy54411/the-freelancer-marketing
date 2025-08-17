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
        `/api/admin/workmail/emails/sent?messageId=${encodeURIComponent(email.messageId)}`,
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
      console.error('Error deleting email:', error);
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
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5 text-[#14ad9f]" />
            <span>E-Mail Informationen</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Empfänger */}
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-700">Empfänger</div>
              <div className="text-gray-900 font-medium">{email.to}</div>
            </div>
          </div>

          {/* Absender */}
          {email.from && (
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-700">Absender</div>
                <div className="text-gray-900">{email.from}</div>
              </div>
            </div>
          )}

          {/* Betreff */}
          <div className="flex items-start space-x-3">
            <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-700">Betreff</div>
              <div className="text-gray-900 font-medium">{email.subject}</div>
            </div>
          </div>

          {/* Sendedatum */}
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-700">Gesendet am</div>
              <div className="text-gray-900">{formatEmailDate(email.sentAt)}</div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-3">
            {getStatusIcon(email.status)}
            <div>
              <div className="text-sm font-medium text-gray-700">Status</div>
              <Badge variant="outline" className={`${getStatusBadgeColor(email.status)} mt-1`}>
                {getStatusText(email.status)}
              </Badge>
            </div>
          </div>

          {/* Message ID */}
          {email.messageId && (
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-700">Message ID</div>
                <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                  {email.messageId}
                </div>
              </div>
            </div>
          )}
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
            {email.htmlContent ? (
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
              </div>
            ) : email.textContent ? (
              <div>
                <Badge variant="outline" className="mb-2">
                  Text Inhalt
                </Badge>
                <div className="bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap text-sm">
                  {email.textContent}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Kein E-Mail-Inhalt verfügbar</p>
                <p className="text-sm text-gray-400 mt-2">
                  Diese E-Mail wurde erfolgreich gesendet, aber der Inhalt ist nicht verfügbar.
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
