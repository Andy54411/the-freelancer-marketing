import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReceivedEmail } from '@/types/email';
import { Mail, ChevronDown, ChevronRight } from 'lucide-react';

interface EmailThreadAccordionProps {
  emails: ReceivedEmail[];
  currentEmailId: string;
  onEmailSelect: (email: ReceivedEmail) => void;
}

export function EmailThreadAccordion({
  emails,
  currentEmailId,
  onEmailSelect,
}: EmailThreadAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set([currentEmailId]));

  const toggleItem = (emailId: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(emailId)) {
      newOpenItems.delete(emailId);
    } else {
      newOpenItems.add(emailId);
    }
    setOpenItems(newOpenItems);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unbekanntes Datum';
    try {
      return new Date(dateString).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Ungültiges Datum';
    }
  };

  const getEmailPreview = (email: ReceivedEmail): string => {
    const content = email.textContent || email.htmlContent || '';
    // HTML-Tags entfernen und ersten Satz extrahieren
    const cleanText = content.replace(/<[^>]*>/g, '').trim();
    const firstSentence = cleanText.split('.')[0] || cleanText.substring(0, 100);
    return firstSentence.length > 80 ? firstSentence.substring(0, 80) + '...' : firstSentence;
  };

  // E-Mails nach Datum sortieren (neueste zuerst)
  const sortedEmails = [...emails].sort((a, b) => {
    const dateA = new Date(a.receivedAt || '').getTime();
    const dateB = new Date(b.receivedAt || '').getTime();
    return dateB - dateA;
  });

  if (emails.length <= 1) {
    return null; // Kein Accordion für einzelne E-Mails
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-[#14ad9f]" />
          <span>E-Mail-Verlauf ({emails.length} Nachrichten)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedEmails.map((email, index) => {
          const isOpen = openItems.has(email.id);
          const isCurrent = email.id === currentEmailId;

          return (
            <div key={email.id}>
              <div
                className={`w-full p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                  isCurrent ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-200'
                }`}
                onClick={() => toggleItem(email.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm truncate">{email.from}</span>
                        {!email.isRead && (
                          <Badge variant="secondary" className="text-xs">
                            Neu
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="default" className="text-xs bg-[#14ad9f]">
                            Aktuell
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{getEmailPreview(email)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatDate(email.receivedAt)}
                  </div>
                </div>
              </div>

              {/* Ausklappbarer Content */}
              {isOpen && (
                <div className="pt-2">
                  <div className="pl-7 pr-3 pb-2">
                    <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-[#14ad9f]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                        <div>
                          <strong>Von:</strong> {email.from}
                        </div>
                        <div>
                          <strong>An:</strong> {email.to || 'Unbekannt'}
                        </div>
                        <div>
                          <strong>Betreff:</strong> {email.subject}
                        </div>
                        <div>
                          <strong>Datum:</strong> {formatDate(email.receivedAt)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                        {email.textContent ||
                          email.htmlContent?.replace(/<[^>]*>/g, '') ||
                          'Kein Inhalt verfügbar'}
                      </div>
                      <div className="mt-2 flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={e => {
                            e.stopPropagation();
                            onEmailSelect(email);
                          }}
                        >
                          Anzeigen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={e => {
                            e.stopPropagation();
                            // Hier könnte Reply-Funktionalität für diese spezifische E-Mail implementiert werden
                          }}
                        >
                          Antworten
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default EmailThreadAccordion;
