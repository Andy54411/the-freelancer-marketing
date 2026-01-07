'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { WhatsAppService } from '@/services/whatsapp.service';
import { toast } from 'sonner';

interface WhatsAppButtonProps {
  customerPhone?: string;
  customerName?: string;
  customerId?: string;
  companyId: string;
  className?: string;
  variant?: 'icon' | 'button' | 'link';
  defaultMessage?: string;
}

/**
 * WhatsApp Button für Kunden-Profile
 *
 * Features:
 * - Click-to-Chat (funktioniert immer)
 * - Optional: In-App Senden wenn Meta API konfiguriert
 * - Nachrichten-Historie
 */
export function WhatsAppButton({
  customerPhone,
  customerName,
  customerId,
  companyId,
  className,
  variant = 'button',
  defaultMessage,
}: WhatsAppButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [message, setMessage] = useState(defaultMessage || '');
  const [sending, setSending] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // Nichts rendern wenn keine Telefonnummer
  if (!customerPhone) return null;

  // Ab hier ist customerPhone garantiert string (Type Guard)
  const phone: string = customerPhone;

  // Prüfe ob Meta API konfiguriert ist
  const checkConfiguration = async () => {
    if (isConfigured === null) {
      const configured = await WhatsAppService.isConfigured(companyId);
      setIsConfigured(configured);
      return configured;
    }
    return isConfigured;
  };

  const handleClick = async () => {
    const configured = await checkConfiguration();

    if (configured) {
      // Meta API verfügbar - zeige Dialog
      setShowDialog(true);
    } else {
      // Kein API - direkt Click-to-Chat öffnen
      WhatsAppService.openChat(phone, message);
      toast.success('WhatsApp wird geöffnet...');
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Bitte eine Nachricht eingeben');
      return;
    }

    setSending(true);

    try {
      const result = await WhatsAppService.sendMessage(
        companyId,
        phone,
        message,
        customerId,
        customerName
      );

      if (result.success) {
        toast.success('WhatsApp-Nachricht gesendet!');
        setShowDialog(false);
        setMessage('');
      } else {
        toast.error('Fehler beim Senden');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Senden der Nachricht');
    } finally {
      setSending(false);
    }
  };

  const handleOpenChat = () => {
    WhatsAppService.openChat(phone, message);
    setShowDialog(false);
    toast.success('WhatsApp wird geöffnet...');
  };

  // Nichts rendern wenn keine Telefonnummer
  if (!customerPhone) return null;

  // Render je nach Variant
  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={className}
          title="WhatsApp"
        >
          <MessageCircle className="h-4 w-4 text-green-600" />
        </Button>

        {showDialog && renderDialog()}
      </>
    );
  }

  if (variant === 'link') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 hover:underline ${className}`}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>

        {showDialog && renderDialog()}
      </>
    );
  }

  // Default: Button
  return (
    <>
      <Button variant="outline" onClick={handleClick} className={`gap-2 ${className}`}>
        <MessageCircle className="h-4 w-4 text-green-600" />
        WhatsApp
      </Button>

      {showDialog && renderDialog()}
    </>
  );

  function renderDialog() {
    return (
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              WhatsApp-Nachricht senden
            </DialogTitle>
            <DialogDescription>Nachricht an {customerName || customerPhone}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ihre Nachricht..."
              rows={5}
              className="resize-none"
            />

            <div className="text-xs text-gray-500">📱 Telefon: {phone}</div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={handleOpenChat} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              In WhatsApp öffnen
            </Button>

            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sende...' : 'Senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
