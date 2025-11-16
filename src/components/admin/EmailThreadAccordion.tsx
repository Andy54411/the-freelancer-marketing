import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReceivedEmail } from '@/types/email';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
  const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());

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

  // Normalisiert E-Mail-Adresse für Thread-Gruppierung
  const normalizeEmailAddress = (emailAddress: string): string => {
    return emailAddress.toLowerCase().trim();
  };

  // Gruppiert E-Mails nach Thread (Betreff oder Konversations-ID)
  const getThreadEmails = (emails: ReceivedEmail[], currentEmailId: string): ReceivedEmail[] => {
    const currentEmail = emails.find(e => e.id === currentEmailId);
    if (!currentEmail) return [];

    // Normalisiere den Betreff für Thread-Matching
    const normalizeSubject = (subject: string): string => {
      return subject
        .toLowerCase()
        .replace(/^(re:|aw:|fwd?:|wg:)\s*/gi, '') // Entferne Präfixe
        .trim();
    };

    const currentSubject = normalizeSubject(currentEmail.subject || '');
    const currentSender = normalizeEmailAddress(currentEmail.from || '');
    const currentRecipient = normalizeEmailAddress(currentEmail.to || '');

    // Finde alle E-Mails, die zum gleichen Thread gehören
    return emails.filter(email => {
      const emailSubject = normalizeSubject(email.subject || '');
      const emailSender = normalizeEmailAddress(email.from || '');
      const emailRecipient = normalizeEmailAddress(email.to || '');

      // Thread-Matching: Gleicher Betreff ODER zwischen gleichen Personen
      const sameSubject = emailSubject === currentSubject && currentSubject.length > 0;
      const sameConversation =
        (emailSender === currentSender && emailRecipient === currentRecipient) ||
        (emailSender === currentRecipient && emailRecipient === currentSender);

      return sameSubject || sameConversation;
    });
  };

  // Filtert E-Mails nach Thread-Zugehörigkeit
  const threadEmails = getThreadEmails(emails, currentEmailId);

  // E-Mails nach Datum sortieren (neueste zuerst)
  const sortedEmails = [...threadEmails].sort((a, b) => {
    const dateA = new Date(a.receivedAt || '').getTime();
    const dateB = new Date(b.receivedAt || '').getTime();
    return dateB - dateA;
  });

  const toggleThread = (emailId: string) => {
    const newOpenThreads = new Set(openThreads);
    if (newOpenThreads.has(emailId)) {
      newOpenThreads.delete(emailId);
    } else {
      newOpenThreads.add(emailId);
    }
    setOpenThreads(newOpenThreads);
  };

  // Prüft ob E-Mail ausgehend ist (von Admin gesendet)
  const isOutgoing = (email: ReceivedEmail): boolean => {
    const adminEmails = ['andy.staudinger@taskilo.de', 'admin@taskilo.de', 'support@taskilo.de'];
    return adminEmails.some(adminEmail =>
      normalizeEmailAddress(email.from || '').includes(normalizeEmailAddress(adminEmail))
    );
  };

  if (emails.length <= 1) {
    return null; // Kein Accordion für einzelne E-Mails
  }

  return (
    <div className="mb-6 space-y-2">
      {sortedEmails.map((email, index) => {
        const isCurrent = email.id === currentEmailId;
        const isUnread = !email.isRead;
        const isOpen = openThreads.has(email.id);
        const outgoing = isOutgoing(email);

        return (
          <div key={email.id} className="group hover:bg-gray-50 transition-colors">
            {/* Kompakte Thread-Ansicht mit Aufklapp-Funktionalität */}
            <div
              className={`w-full p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
                outgoing ? 'ml-8 border-l-4 border-l-[#14ad9f] bg-green-50' : 'mr-8 bg-white'
              }`}
              onClick={() => toggleThread(email.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 ${
                      outgoing ? 'bg-[#14ad9f]' : 'bg-blue-500'
                    }`}
                  >
                    {email.from?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div
                        className={`text-sm truncate ${isCurrent ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}
                      >
                        {outgoing ? `An: ${email.to}` : `Von: ${email.from}`}
                      </div>
                      {isUnread && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-600 border-blue-200"
                        >
                          Neu
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="default" className="text-xs bg-[#14ad9f]">
                          Aktuell
                        </Badge>
                      )}
                      {outgoing && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-600 border-green-200"
                        >
                          Gesendet
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{getEmailPreview(email)}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 shrink-0 ml-2">
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
    </div>
  );
}

export default EmailThreadAccordion;
