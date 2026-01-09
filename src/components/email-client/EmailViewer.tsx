'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  Star,
  ArrowLeft,
  Paperclip,
  AlertOctagon,
} from 'lucide-react';
import { EmailMessage } from './types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface EmailViewerProps {
  email: EmailMessage | null;
  onClose: () => void;
  onReply: (email: EmailMessage) => void;
  onReplyAll: (email: EmailMessage) => void;
  onForward: (email: EmailMessage) => void;
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onStar: (emailId: string) => void;
  onMarkAsRead: (emailId: string, read: boolean) => void;
  onMarkAsSpam?: (emailId: string, isSpam: boolean) => void;
  className?: string;
}

export function EmailViewer({
  email,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onStar,
  onMarkAsRead: _onMarkAsRead,
  onMarkAsSpam,
  className,
}: EmailViewerProps) {
  const [_showAllRecipients, _setShowAllRecipients] = useState(false);

  // Helper functions for safe access to email properties
  const getSenderName = (from: any) => {
    if (!from) return 'Unbekannter Absender';

    // String format (most common from Gmail API)
    if (typeof from === 'string') {
      // Extract name from "Name <email>" format
      const match = from.match(/^(.+?)\s*<.*>$/);
      if (match) {
        return match[1].trim();
      }
      // If it's just an email, use the part before @
      if (from.includes('@')) {
        return from.split('@')[0];
      }
      return from;
    }

    // Array format (Gmail style)
    if (Array.isArray(from) && from.length > 0) {
      const firstSender = from[0];
      return firstSender?.name || firstSender?.email || 'Unbekannter Absender';
    }

    // Object format
    if (typeof from === 'object' && !Array.isArray(from)) {
      return from.name || from.email || 'Unbekannter Absender';
    }

    return 'Unbekannter Absender';
  };

  const _getSenderEmail = (from: any) => {
    if (!from) return '';

    // String format (most common from Gmail API)
    if (typeof from === 'string') {
      // Extract email from "Name <email>" format
      const match = from.match(/<(.+?)>/);
      if (match) {
        return match[1];
      }
      // If it's just an email
      if (from.includes('@')) {
        return from;
      }
      return '';
    }

    // Array format (Gmail style)
    if (Array.isArray(from) && from.length > 0) {
      const firstSender = from[0];
      return firstSender?.email || '';
    }

    // Object format
    if (typeof from === 'object' && !Array.isArray(from)) {
      return from.email || '';
    }

    return '';
  };

  const getSenderInitial = (from: any) => {
    const name = getSenderName(from);
    if (name && name !== 'Unbekannter Absender') {
      return name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (!email) {
    return (
      <Card className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center text-gray-500">
          <div className="text-gray-400 mb-4">
            <svg
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium">Wählen Sie eine E-Mail zum Anzeigen</p>
        </div>
      </Card>
    );
  }

  // Gmail-like Email Body Display Component - OPTIMIERT für Performance
  const EmailBodyDisplay = React.memo(function EmailBodyDisplay({
    email,
  }: {
    email: EmailMessage;
  }) {
    // Memoize HTML content determination
    const { htmlContent, isHtml } = React.useMemo(() => {
      const htmlContent =
        email.htmlBody || (email.body && email.body.includes('<') ? email.body : null);
      return {
        htmlContent,
        isHtml: !!htmlContent,
      };
    }, [email.htmlBody, email.body]);

    // SICHERHEITS-ISOLATION: Nur Scripts entfernen, Styles BEHALTEN für originales Aussehen
    const sanitizeHtml = (html: string) => {
      return html.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/javascript:/gi, '');
    };

    if (isHtml && htmlContent) {
      // HTML Content mit iframe
      return (
        <iframe
          srcDoc={`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                margin: 0; 
                padding: 16px;
                font-family: Arial, sans-serif;
                background: white;
                color: #000;
              }
              img { max-width: 100% !important; height: auto !important; }
              table { max-width: 100% !important; }
              .gmail-quote { border-left: 1px solid #ccc; margin: 10px 0; padding-left: 10px; }
            </style>
          </head>
          <body>
            ${sanitizeHtml(htmlContent)}
          </body>
          </html>
        `}
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
          title="Email Content"
        />
      );
    }

    // Plain Text View
    return (
      <div className="p-4 w-full">
        <div className="email-text-content text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-900">
          {email.body || 'Keine E-Mail-Inhalte verfügbar.'}
        </div>
      </div>
    );
  });

  const formatEmailDate = (timestamp: any) => {
    try {
      if (!timestamp) return 'Unbekannt';

      let date: Date;

      // Handle Firestore Timestamp objects
      if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      }
      // Handle Gmail's internalDate (string of milliseconds)
      else if (typeof timestamp === 'string' && /^\d+$/.test(timestamp)) {
        date = new Date(parseInt(timestamp));
      }
      // Handle ISO strings and other date strings
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      // Handle Date objects
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Handle number timestamps (milliseconds or seconds)
      else if (typeof timestamp === 'number') {
        // If timestamp is in seconds (less than year 2100), convert to ms
        if (timestamp < 4102444800) {
          date = new Date(timestamp * 1000);
        } else {
          date = new Date(timestamp);
        }
      } else {
        console.warn('Unknown timestamp format:', timestamp, typeof timestamp);
        return 'Unbekannt';
      }

      if (isNaN(date.getTime())) {
        console.warn('Invalid date created from timestamp:', timestamp);
        return 'Unbekannt';
      }

      return format(date, 'PPpp', { locale: de });
    } catch (error) {
      console.error('Error formatting email date:', error, 'from timestamp:', timestamp);
      return 'Unbekannt';
    }
  };

  const _handleDownloadAttachment = (attachment: any) => {
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    }
  };

  const _formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card
      className={cn(
        'h-[800px] flex flex-col w-full overflow-hidden border-0 rounded-none',
        className
      )}
    >
      {/* Gmail-Style Action Buttons - OBEN wie in Gmail */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReply(email)}
            className="h-8 px-3 text-sm border-gray-300 hover:bg-gray-100"
          >
            <Reply className="h-4 w-4 mr-2" />
            Antworten
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReplyAll(email)}
            className="h-8 px-3 text-sm border-gray-300 hover:bg-gray-100"
          >
            <ReplyAll className="h-4 w-4 mr-2" />
            Allen antworten
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onForward(email)}
            className="h-8 px-3 text-sm border-gray-300 hover:bg-gray-100"
          >
            <Forward className="h-4 w-4 mr-2" />
            Weiterleiten
          </Button>

          <div className="h-4 w-px bg-gray-300 mx-2" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(email.id)}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const isCurrentlySpam = email.labels?.includes('SPAM');
              onMarkAsSpam?.(email.id, !isCurrentlySpam);
            }}
            className="h-8 w-8 p-0 hover:bg-gray-100 text-orange-600 hover:text-orange-700"
            title={email.labels?.includes('SPAM') ? 'Kein Spam' : 'Als Spam markieren'}
          >
            <AlertOctagon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(email.id)}
            className="h-8 w-8 p-0 hover:bg-gray-100 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Close Button rechts */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Gmail-Style Email Header */}
      <div className="border-b border-gray-200 px-6 py-5 bg-white">
        {/* Subject Line - Gmail Style */}
        <div className="mb-6">
          <h1 className="text-2xl font-normal text-gray-900 leading-7">
            {email.subject || '(Kein Betreff)'}
          </h1>
        </div>

        {/* Sender Info - Gmail Style */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Avatar Circle */}
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {getSenderInitial(email.from)}
            </div>

            {/* Sender Details */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">
                  {getSenderName(email.from)}
                </span>
                {email.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                    Wichtig
                  </Badge>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <span>an mich</span>
              </div>

              {email.attachments && email.attachments.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Paperclip className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {email.attachments.length} Anhang{email.attachments.length > 1 ? 'e' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Date - Gmail Style */}
          <div className="text-sm text-gray-600 text-right">
            <div>{formatEmailDate(email.timestamp)}</div>
            <div className="flex items-center gap-1 mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStar(email.id)}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    email.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                  )}
                />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <CardContent className="flex-1 p-6 overflow-y-auto">
        {/* Email Body */}
        <EmailBodyDisplay email={email} />
      </CardContent>
    </Card>
  );
}
