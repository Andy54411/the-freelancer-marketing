'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MessageCircle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function WhatsAppSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [businessPhone, setBusinessPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      loadSettings();
    }
  }, [uid, isMounted]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/whatsapp/settings?companyId=${uid}`);
      const data = await response.json();

      if (data.success && data.settings) {
        setBusinessPhone(data.settings.businessPhone || '');
        setDisplayName(data.settings.displayName || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessPhone.trim()) {
      toast.error('Bitte gib eine WhatsApp Business Nummer ein');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/whatsapp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          businessPhone,
          displayName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Einstellungen gespeichert!');
        // Cookie aktualisieren
        document.cookie = `whatsapp_configured_${uid}=true; path=/; max-age=31536000`;
      } else {
        toast.error(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchtest du die WhatsApp Integration wirklich deaktivieren?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/whatsapp/settings?companyId=${uid}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Cookie löschen
        document.cookie = `whatsapp_configured_${uid}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        toast.success('WhatsApp Integration deaktiviert');
        router.push(`/dashboard/company/${uid}/whatsapp/setup`);
      } else {
        toast.error(data.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting settings:', error);
      toast.error('Fehler beim Löschen');
    } finally {
      setIsDeleting(false);
    }
  };

  // Verhindere Hydration Mismatch
  if (!isMounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/company/${uid}/whatsapp`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Zurück zu WhatsApp
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Einstellungen</h1>
            <p className="text-sm text-gray-500">Verwalte deine WhatsApp Business API Konfiguration</p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Business Telefonnummer</CardTitle>
          <CardDescription>Verwalte deine WhatsApp Business Telefonnummer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessPhone">
              WhatsApp Business Telefonnummer <span className="text-red-500">*</span>
            </Label>
            <Input
              id="businessPhone"
              placeholder="+49 151 12345678"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Deine WhatsApp Business Nummer im internationalen Format
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Anzeigename (optional)</Label>
            <Input
              id="displayName"
              placeholder="Mein Unternehmen"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Wie dein Unternehmen in WhatsApp angezeigt werden soll
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichere...
                </>
              ) : (
                'Änderungen speichern'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Gefahrenbereich</CardTitle>
          <CardDescription>Irreversible Aktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
            className="w-full"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deaktiviere...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                WhatsApp Integration deaktivieren
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
