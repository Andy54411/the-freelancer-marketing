'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Star, Trash2, Eye } from 'lucide-react';
import { AdminEmail } from './types';

interface EmailListProps {
  emails: AdminEmail[];
  selectedEmail: AdminEmail | null;
  onEmailSelect: (email: AdminEmail) => void;
  onEmailDelete?: (emailId: string) => void;
  onEmailToggleRead?: (emailId: string) => void;
}

export function EmailList({
  emails,
  selectedEmail,
  onEmailSelect,
  onEmailDelete,
  onEmailToggleRead,
}: EmailListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Posteingang ({emails.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {emails.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Keine E-Mails vorhanden</div>
          ) : (
            emails.map(email => (
              <div
                key={email.emailId}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedEmail?.emailId === email.emailId
                    ? 'bg-blue-50 border-l-4 border-[#14ad9f]'
                    : ''
                } ${!email.isRead ? 'bg-blue-25 font-medium' : ''}`}
                onClick={() => onEmailSelect(email)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm ${!email.isRead ? 'font-semibold' : 'font-normal'}`}
                      >
                        {email.from}
                      </span>
                      {!email.isRead && (
                        <Badge variant="secondary" className="text-xs">
                          Neu
                        </Badge>
                      )}
                      {email.isImportant && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <h4
                      className={`text-sm truncate ${!email.isRead ? 'font-semibold' : 'font-normal'}`}
                    >
                      {email.subject}
                    </h4>
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {email.body?.substring(0, 100)}...
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <span className="text-xs text-gray-500">{formatDate(email.receivedAt)}</span>
                    <div className="flex gap-1">
                      {onEmailToggleRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={e => {
                            e.stopPropagation();
                            onEmailToggleRead(email.emailId);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      {onEmailDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={e => {
                            e.stopPropagation();
                            onEmailDelete(email.emailId);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {email.labels.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {email.labels.map((label, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
