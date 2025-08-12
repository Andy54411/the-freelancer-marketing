'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Reply, ReplyAll, Forward, Star, Archive, Trash2 } from 'lucide-react';
import { AdminEmail } from './types';

interface EmailDetailProps {
  email: AdminEmail | null;
  onReply?: (email: AdminEmail) => void;
  onReplyAll?: (email: AdminEmail) => void;
  onForward?: (email: AdminEmail) => void;
  onArchive?: (emailId: string) => void;
  onDelete?: (emailId: string) => void;
  onToggleImportant?: (emailId: string) => void;
}

export function EmailDetail({
  email,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onToggleImportant,
}: EmailDetailProps) {
  if (!email) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p>Wählen Sie eine E-Mail aus, um sie anzuzeigen</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{email.subject}</CardTitle>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Von:</span>
                <span className="text-sm">{email.from}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">An:</span>
                <span className="text-sm">{email.to}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Datum:</span>
                <span className="text-sm text-gray-600">{formatDate(email.receivedAt)}</span>
              </div>
            </div>
            {email.labels.length > 0 && (
              <div className="flex gap-1 mt-3">
                {email.labels.map((label, index) => (
                  <Badge key={index} variant="outline">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 ml-4">
            {onToggleImportant && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleImportant(email.emailId)}
                className={email.isImportant ? 'text-yellow-500' : ''}
              >
                <Star className={`h-4 w-4 ${email.isImportant ? 'fill-current' : ''}`} />
              </Button>
            )}
            {onArchive && (
              <Button variant="ghost" size="sm" onClick={() => onArchive(email.emailId)}>
                <Archive className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(email.emailId)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Separator className="mb-4" />

        {/* E-Mail-Inhalt */}
        <div className="prose max-w-none mb-6">
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: email.body || '' }}
          />
        </div>

        {/* Anhänge */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mb-6">
            <Separator className="mb-3" />
            <h4 className="font-medium mb-2">Anhänge ({email.attachments.length})</h4>
            <div className="space-y-2">
              {email.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <span className="text-sm">{attachment.name || `Anhang ${index + 1}`}</span>
                  <span className="text-xs text-gray-500">
                    ({attachment.size || 'Unbekannte Größe'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aktionen */}
        <Separator className="mb-4" />
        <div className="flex gap-2">
          {onReply && (
            <Button variant="outline" size="sm" onClick={() => onReply(email)}>
              <Reply className="h-4 w-4 mr-1" />
              Antworten
            </Button>
          )}
          {onReplyAll && (
            <Button variant="outline" size="sm" onClick={() => onReplyAll(email)}>
              <ReplyAll className="h-4 w-4 mr-1" />
              Allen antworten
            </Button>
          )}
          {onForward && (
            <Button variant="outline" size="sm" onClick={() => onForward(email)}>
              <Forward className="h-4 w-4 mr-1" />
              Weiterleiten
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
