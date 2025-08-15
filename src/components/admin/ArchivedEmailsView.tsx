'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Archive, Clock, User, Mail, Paperclip, Undo2, Trash2, ArrowLeft } from 'lucide-react';

interface ReceivedEmail {
  id: string;
  from: string;
  to?: string;
  subject: string;
  textContent: string;
  htmlContent: string;
  receivedAt: string;
  isRead: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  priority: 'low' | 'normal' | 'high';
  category: 'support' | 'inquiry' | 'feedback' | 'business' | 'notification';
  attachments?: { name: string; size: number }[];
  archivedAt?: string;
}

interface ArchivedEmailsViewProps {
  archivedEmails: ReceivedEmail[];
  onBack: () => void;
  onRestore: (emailId: string) => Promise<void>;
  onDelete: (emailId: string) => Promise<void>;
  onEmailClick: (email: ReceivedEmail) => void;
}

export default function ArchivedEmailsView({
  archivedEmails,
  onBack,
  onRestore,
  onDelete,
  onEmailClick,
}: ArchivedEmailsViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'support':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inquiry':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'feedback':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'business':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'notification':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Zurück zur Inbox</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Archive className="h-6 w-6 text-[#14ad9f]" />
              <h1 className="text-2xl font-bold text-gray-900">Archivierte E-Mails</h1>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {archivedEmails.length} archivierte E-Mails
          </Badge>
        </div>

        {/* Archived Emails List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Archive className="h-5 w-5" />
              <span>Archiv</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {archivedEmails.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine archivierten E-Mails
                </h3>
                <p className="text-gray-500">Archivierte E-Mails werden hier angezeigt</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {archivedEmails.map(email => (
                    <div
                      key={email.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0" onClick={() => onEmailClick(email)}>
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {email.from}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getPriorityColor(email.priority)}>
                                {email.priority === 'high'
                                  ? 'Hoch'
                                  : email.priority === 'low'
                                    ? 'Niedrig'
                                    : 'Normal'}
                              </Badge>
                              <Badge className={getCategoryColor(email.category)}>
                                {email.category === 'support'
                                  ? 'Support'
                                  : email.category === 'inquiry'
                                    ? 'Anfrage'
                                    : email.category === 'feedback'
                                      ? 'Feedback'
                                      : email.category === 'business'
                                        ? 'Business'
                                        : 'Benachrichtigung'}
                              </Badge>
                            </div>
                          </div>

                          <h3 className="text-base font-medium text-gray-900 mb-2 truncate">
                            {email.subject}
                          </h3>

                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {email.textContent.substring(0, 200)}...
                          </p>

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Empfangen: {formatDate(email.receivedAt)}</span>
                            </div>
                            {email.archivedAt && (
                              <div className="flex items-center space-x-1">
                                <Archive className="h-3 w-3" />
                                <span>Archiviert: {formatDate(email.archivedAt)}</span>
                              </div>
                            )}
                            {email.attachments && email.attachments.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Paperclip className="h-3 w-3" />
                                <span>{email.attachments.length} Anhang(e)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              onRestore(email.id);
                            }}
                            className="flex items-center space-x-1 text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                          >
                            <Undo2 className="h-4 w-4" />
                            <span>Wiederherstellen</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              onDelete(email.id);
                            }}
                            className="flex items-center space-x-1 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Löschen</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
