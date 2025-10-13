'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Send,
  Paperclip,
  X,
  Bold,
  Italic,
  Underline,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  Smile,
  Calendar,
  Clock,
  Minimize2,
  Maximize2,
  Save
} from 'lucide-react';
import type { EmailCompose as EmailComposeType, EmailMessage } from './types';
import { cn } from '@/lib/utils';

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: EmailComposeType) => Promise<void>;
  onSaveDraft: (email: EmailComposeType) => Promise<void>;
  replyTo?: EmailMessage;
  forwardEmail?: EmailMessage;
  className?: string;
}

// Helper function to convert HTML to plain text
const htmlToPlainText = (html: string): string => {
  if (!html) return '';
  
  // Remove style tags and their content
  let cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove script tags and their content
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Replace common block elements with line breaks
  cleaned = cleaned.replace(/<(div|p|br|tr|h[1-6])[^>]*>/gi, '\n');
  cleaned = cleaned.replace(/<\/(div|p|h[1-6]|td)>/gi, '\n');
  
  // Create a temporary div to parse remaining HTML
  const temp = document.createElement('div');
  temp.innerHTML = cleaned;
  
  // Get text content (strips remaining HTML tags)
  let text = temp.textContent || temp.innerText || '';
  
  // Clean up excessive whitespace and newlines
  text = text
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
    .replace(/^\s+|\s+$/g, '') // Trim start/end
    .replace(/[ \t]+/g, ' '); // Multiple spaces to single space
  
  return text;
};

// Helper to safely extract sender info
const getSenderInfo = (from: any): string => {
  if (!from) return 'Unbekannt';
  
  // String format: "Name <email>" or just "email"
  if (typeof from === 'string') {
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    if (match) return `${match[1]} <${match[2]}>`;
    return from;
  }
  
  // Object format
  if (typeof from === 'object' && !Array.isArray(from)) {
    const name = from.name || '';
    const email = from.email || '';
    if (name && email) return `${name} <${email}>`;
    return name || email || 'Unbekannt';
  }
  
  // Array format (Gmail style)
  if (Array.isArray(from) && from.length > 0) {
    return getSenderInfo(from[0]);
  }
  
  return 'Unbekannt';
};

// Helper to safely format timestamp
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Unbekanntes Datum';
  
  try {
    let date: Date;
    
    // Firestore Timestamp
    if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    }
    // Gmail internalDate (string of milliseconds)
    else if (typeof timestamp === 'string' && /^\d+$/.test(timestamp)) {
      date = new Date(parseInt(timestamp));
    }
    // ISO string
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
    // Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Number (milliseconds or seconds)
    else if (typeof timestamp === 'number') {
      date = timestamp < 4102444800 ? new Date(timestamp * 1000) : new Date(timestamp);
    }
    else {
      return 'Unbekanntes Datum';
    }
    
    if (isNaN(date.getTime())) return 'Unbekanntes Datum';
    
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Unbekanntes Datum';
  }
};

export function EmailCompose({
  isOpen,
  onClose,
  onSend,
  onSaveDraft,
  replyTo,
  forwardEmail,
  className
}: EmailComposeProps) {
  const [email, setEmail] = useState<EmailComposeType>({
    to: replyTo?.from.email || '',
    cc: '',
    bcc: '',
    subject: replyTo ? `Re: ${replyTo.subject}` : forwardEmail ? `Fwd: ${forwardEmail.subject}` : '',
    body: '',
    priority: 'normal'
  });
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!email.to.trim()) {
      alert('Bitte geben Sie mindestens einen Empfänger ein.');
      return;
    }

    setIsSending(true);
    try {
      await onSend({
        ...email,
        attachments
      });
      onClose();
      // Reset form
      setEmail({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        priority: 'normal'
      });
      setAttachments([]);
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      alert('Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsDraft(true);
    try {
      await onSaveDraft({
        ...email,
        attachments
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Entwurfs:', error);
    } finally {
      setIsDraft(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getOriginalMessage = () => {
    if (replyTo) {
      const bodyText = htmlToPlainText(replyTo.body || replyTo.htmlBody || '');
      const senderInfo = getSenderInfo(replyTo.from);
      const dateInfo = formatTimestamp(replyTo.timestamp);
      
      return `\n\n--- Ursprüngliche Nachricht ---\nVon: ${senderInfo}\nDatum: ${dateInfo}\nBetreff: ${replyTo.subject || '(Kein Betreff)'}\n\n${bodyText}`;
    }
    if (forwardEmail) {
      const bodyText = htmlToPlainText(forwardEmail.body || forwardEmail.htmlBody || '');
      const senderInfo = getSenderInfo(forwardEmail.from);
      const dateInfo = formatTimestamp(forwardEmail.timestamp);
      
      return `\n\n--- Weitergeleitete Nachricht ---\nVon: ${senderInfo}\nAn: ${forwardEmail.to?.map((t: any) => typeof t === 'string' ? t : t.email).join(', ') || 'Unbekannt'}\nDatum: ${dateInfo}\nBetreff: ${forwardEmail.subject || '(Kein Betreff)'}\n\n${bodyText}`;
    }
    return '';
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = email.body.substring(start, end);
    const newText = email.body.substring(0, start) + prefix + selectedText + suffix + email.body.substring(end);
    
    setEmail(prev => ({ ...prev, body: newText }));
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      <Card className={cn(
        "w-full max-w-4xl bg-white shadow-2xl border-0 transition-all duration-200 flex flex-col",
        isMinimized ? "h-12" : "h-[700px]",
        className
      )}>
        {/* Header */}
        <CardHeader className="pb-2 bg-teal-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {replyTo ? 'Antworten' : forwardEmail ? 'Weiterleiten' : 'Neue E-Mail'}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
            {/* Recipients */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="to" className="w-12 text-sm font-medium">
                  An:
                </Label>
                <Input
                  id="to"
                  type="email"
                  value={email.to}
                  onChange={(e) => setEmail(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="empfaenger@beispiel.de"
                  className="flex-1"
                />
                <div className="flex gap-1">
                  {!showCc && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCc(true)}
                      className="text-xs"
                    >
                      CC
                    </Button>
                  )}
                  {!showBcc && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBcc(true)}
                      className="text-xs"
                    >
                      BCC
                    </Button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="cc" className="w-12 text-sm font-medium">
                    CC:
                  </Label>
                  <Input
                    id="cc"
                    type="email"
                    value={email.cc}
                    onChange={(e) => setEmail(prev => ({ ...prev, cc: e.target.value }))}
                    placeholder="kopie@beispiel.de"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCc(false);
                      setEmail(prev => ({ ...prev, cc: '' }));
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="bcc" className="w-12 text-sm font-medium">
                    BCC:
                  </Label>
                  <Input
                    id="bcc"
                    type="email"
                    value={email.bcc}
                    onChange={(e) => setEmail(prev => ({ ...prev, bcc: e.target.value }))}
                    placeholder="blindkopie@beispiel.de"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowBcc(false);
                      setEmail(prev => ({ ...prev, bcc: '' }));
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label htmlFor="subject" className="w-12 text-sm font-medium">
                  Betreff:
                </Label>
                <Input
                  id="subject"
                  value={email.subject}
                  onChange={(e) => setEmail(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="E-Mail-Betreff"
                  className="flex-1"
                />
                <Select
                  value={email.priority}
                  onValueChange={(value: 'low' | 'normal' | 'high') => 
                    setEmail(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="p-2 border-b bg-gray-50">
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('**', '**')}
                  title="Fett"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('*', '*')}
                  title="Kursiv"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('_', '_')}
                  title="Unterstrichen"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n')}
                  title="Linksbündig"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n    ')}
                  title="Zentriert"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n        ')}
                  title="Rechtsbündig"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n• ')}
                  title="Aufzählung"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n1. ')}
                  title="Nummerierte Liste"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    const url = prompt('Link URL eingeben:');
                    const text = prompt('Link Text eingeben:') || 'Link';
                    if (url) insertFormatting(`[${text}](${url})`);
                  }}
                  title="Link einfügen"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    const url = prompt('Bild URL eingeben:');
                    const alt = prompt('Alt Text eingeben:') || 'Bild';
                    if (url) insertFormatting(`![${alt}](${url})`);
                  }}
                  title="Bild einfügen"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('😊')}
                  title="Emoji einfügen"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Message Body */}
            <div className="flex-1 overflow-auto flex flex-col">
              {/* New Message Area */}
              <div className="p-4 flex-1 min-h-[250px]">
                <Textarea
                  ref={textareaRef}
                  value={email.body}
                  onChange={(e) => setEmail(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Ihre Nachricht..."
                  className="w-full h-full resize-none border-0 focus:ring-0 text-base"
                />
              </div>
              
              {/* Original Message - Gmail Style */}
              {(replyTo || forwardEmail) && (
                <div className="border-t border-gray-200 mx-4">
                  <div className="py-4">
                    <div className="text-sm text-gray-600 mb-3">
                      {replyTo && (
                        <>
                          <div className="font-medium mb-1">--- Ursprüngliche Nachricht ---</div>
                          <div><strong>Von:</strong> {getSenderInfo(replyTo.from)}</div>
                          <div><strong>Datum:</strong> {formatTimestamp(replyTo.timestamp)}</div>
                          <div><strong>Betreff:</strong> {replyTo.subject || '(Kein Betreff)'}</div>
                        </>
                      )}
                      {forwardEmail && (
                        <>
                          <div className="font-medium mb-1">--- Weitergeleitete Nachricht ---</div>
                          <div><strong>Von:</strong> {getSenderInfo(forwardEmail.from)}</div>
                          <div><strong>Datum:</strong> {formatTimestamp(forwardEmail.timestamp)}</div>
                          <div><strong>Betreff:</strong> {forwardEmail.subject || '(Kein Betreff)'}</div>
                        </>
                      )}
                    </div>
                    
                    {/* Original Email Content - HTML rendered wie bei Gmail */}
                    <div className="mt-3 pl-4 border-l-2 border-gray-300">
                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta charset="utf-8">
                            <style>
                              body { 
                                margin: 0; 
                                padding: 0;
                                font-family: Arial, sans-serif;
                                font-size: 14px;
                                color: #000;
                              }
                              img { max-width: 100% !important; height: auto !important; }
                              table { max-width: 100% !important; }
                            </style>
                          </head>
                          <body>
                            ${(replyTo?.htmlBody || replyTo?.body || forwardEmail?.htmlBody || forwardEmail?.body || '')}
                          </body>
                          </html>
                        `}
                        className="w-full border-0"
                        style={{ minHeight: '200px', maxHeight: '400px' }}
                        sandbox="allow-same-origin"
                        title="Original Email"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="px-4 pb-4">
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Anhänge ({attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleSend}
                  disabled={isSending || !email.to.trim()}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Senden
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isDraft}
                  className="flex items-center gap-2"
                >
                  {isDraft ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Entwurf speichern
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleFileSelect}
                  className="flex items-center gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Anhang
                </Button>

                <Button variant="ghost" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Später senden
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Termin vorschlagen
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}