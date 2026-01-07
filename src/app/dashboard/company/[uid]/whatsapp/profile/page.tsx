'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, 
  Save, 
  Building2, 
  Mail, 
  Globe, 
  FileText,
  Upload,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Image from 'next/image';

interface BusinessProfile {
  about: string;
  address: string;
  description: string;
  email: string;
  profile_picture_url: string;
  websites: string[];
  vertical: string;
}

const BUSINESS_VERTICALS = [
  { value: 'UNDEFINED', label: 'Nicht angegeben' },
  { value: 'OTHER', label: 'Sonstiges' },
  { value: 'AUTO', label: 'Automobil' },
  { value: 'BEAUTY', label: 'Schönheit & Kosmetik' },
  { value: 'APPAREL', label: 'Bekleidung' },
  { value: 'EDU', label: 'Bildung' },
  { value: 'ENTERTAIN', label: 'Unterhaltung' },
  { value: 'EVENT_PLAN', label: 'Veranstaltungsplanung' },
  { value: 'FINANCE', label: 'Finanzen' },
  { value: 'GROCERY', label: 'Lebensmittel' },
  { value: 'GOVT', label: 'Regierung' },
  { value: 'HOTEL', label: 'Hotel & Unterkunft' },
  { value: 'HEALTH', label: 'Gesundheit' },
  { value: 'NONPROFIT', label: 'Non-Profit' },
  { value: 'PROF_SERVICES', label: 'Dienstleistungen' },
  { value: 'RETAIL', label: 'Einzelhandel' },
  { value: 'TRAVEL', label: 'Reisen' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'NOT_A_BIZ', label: 'Kein Unternehmen' },
];

export default function WhatsAppProfilePage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConnection, setHasConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{
    name?: string;
    email?: string;
    address?: string;
    website?: string;
    description?: string;
  } | null>(null);
  const [profile, setProfile] = useState<BusinessProfile>({
    about: '',
    address: '',
    description: '',
    email: '',
    profile_picture_url: '',
    websites: ['', ''],
    vertical: 'UNDEFINED',
  });
  const [originalProfile, setOriginalProfile] = useState<BusinessProfile | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/profile?companyId=${uid}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setHasConnection(true);
        setConnectionError(null);
        const profileData = {
          about: data.profile?.about || '',
          address: data.profile?.address || '',
          description: data.profile?.description || '',
          email: data.profile?.email || '',
          profile_picture_url: data.profile?.profile_picture_url || '',
          websites: data.profile?.websites?.length ? data.profile.websites : ['', ''],
          vertical: data.profile?.vertical || 'UNDEFINED',
        };
        setProfile(profileData);
        setOriginalProfile(profileData);
        
        // Speichere Vorschläge aus Firmendaten
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      } else if (data.error === 'Keine WhatsApp-Verbindung') {
        setHasConnection(false);
        setConnectionError(null);
      } else if (data.details?.includes('Session has expired') || data.details?.includes('access token')) {
        setHasConnection(false);
        setConnectionError('token_expired');
      } else {
        setHasConnection(true);
        setConnectionError(data.error || 'Unbekannter Fehler');
      }
    } catch {
      toast.error('Fehler beim Laden des Profils');
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (uid) {
      loadProfile();
    }
  }, [uid, loadProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          ...profile,
          websites: profile.websites.filter(w => w.trim() !== ''),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Profil erfolgreich aktualisiert');
        setOriginalProfile(profile);
      } else {
        toast.error(data.error || 'Fehler beim Speichern');
      }
    } catch {
      toast.error('Netzwerkfehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = originalProfile && JSON.stringify(profile) !== JSON.stringify(originalProfile);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#111b21]">
        <div className="text-center">
          <Image
            src="/images/whatsapp-logo.svg"
            alt="WhatsApp"
            width={60}
            height={60}
            className="mx-auto mb-4 animate-pulse"
          />
          <Loader2 className="h-8 w-8 animate-spin text-[#00a884] mx-auto mb-3" />
          <p className="text-sm text-[#8696a0]">Profil laden...</p>
        </div>
      </div>
    );
  }

  if (!hasConnection) {
    const handleReconnect = async () => {
      try {
        const response = await fetch('/api/whatsapp/generate-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: uid,
            phoneNumber: '+49',
          }),
        });
        const data = await response.json();
        if (data.success && data.signupUrl) {
          window.open(data.signupUrl, 'whatsapp_signup', 'width=600,height=700');
        }
      } catch {
        toast.error('Fehler beim Starten der Verbindung');
      }
    };

    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md">
          {connectionError === 'token_expired' ? (
            <>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verbindung abgelaufen</h2>
              <p className="text-gray-600 mb-6">
                Deine WhatsApp-Verbindung muss erneuert werden. Klicke auf den Button unten, um dich erneut zu verbinden.
              </p>
              <Button
                onClick={handleReconnect}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white px-8 py-3"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Jetzt neu verbinden
              </Button>
              <p className="text-xs text-gray-500 mt-4">
                Ein Popup öffnet sich, um deine WhatsApp Business Nummer zu autorisieren.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine WhatsApp-Verbindung</h2>
              <p className="text-gray-600 mb-6">
                Verbinde zuerst deine WhatsApp Business Nummer, um dein Profil zu bearbeiten.
              </p>
              <Button
                onClick={() => window.location.href = `/dashboard/company/${uid}/whatsapp`}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                Zur WhatsApp-Verbindung
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#efeae2]">
      {/* Header */}
      <div className="bg-[#008069] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/whatsapp-logo.svg"
              alt="WhatsApp"
              width={36}
              height={36}
            />
            <div>
              <h1 className="text-xl font-semibold text-white">Business-Profil</h1>
              <p className="text-sm text-white/70">
                Bearbeite dein WhatsApp Business Profil
              </p>
            </div>
          </div>
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-white text-[#008069] hover:bg-white/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Änderungen speichern
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Profilbild */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#25D366]" />
              Profilbild
            </h3>
            <div className="flex items-center gap-6">
              {profile.profile_picture_url ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#25D366]/20 relative">
                  <Image
                    src={profile.profile_picture_url}
                    alt="Business Profil"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                  <Building2 className="w-10 h-10 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">
                  Das Profilbild wird in WhatsApp-Chats angezeigt. 
                  Empfohlen: Quadratisches Bild, mindestens 640x640 Pixel.
                </p>
                <p className="text-xs text-amber-600">
                  Hinweis: Das Hochladen von Profilbildern über die API erfordert zusätzliche Schritte. 
                  Bitte nutze den WhatsApp Business Manager für Bildänderungen.
                </p>
              </div>
            </div>
          </div>

          {/* Kurzbeschreibung */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#25D366]" />
              Über uns (Kurz)
            </h3>
            <div className="space-y-2">
              <Label htmlFor="about">Kurzbeschreibung (max. 139 Zeichen)</Label>
              <Input
                id="about"
                value={profile.about}
                onChange={(e) => setProfile({ ...profile, about: e.target.value.slice(0, 139) })}
                placeholder="z.B. Ihr Partner für professionelle Dienstleistungen"
                maxLength={139}
              />
              <p className="text-xs text-gray-500 text-right">{profile.about.length} / 139</p>
            </div>
          </div>

          {/* Beschreibung */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#25D366]" />
              Beschreibung
            </h3>
            <div className="space-y-2">
              <Label htmlFor="description">Ausführliche Beschreibung (max. 512 Zeichen)</Label>
              <Textarea
                id="description"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value.slice(0, 512) })}
                placeholder="Beschreibe dein Unternehmen ausführlicher..."
                rows={4}
                maxLength={512}
              />
              <p className="text-xs text-gray-500 text-right">{profile.description.length} / 512</p>
            </div>
          </div>

          {/* Branche */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#25D366]" />
              Branche
            </h3>
            <div className="space-y-2">
              <Label htmlFor="vertical">Unternehmensbranche</Label>
              <Select 
                value={profile.vertical} 
                onValueChange={(v) => setProfile({ ...profile, vertical: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Branche auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_VERTICALS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Kontaktdaten */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#25D366]" />
              Kontaktdaten
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse (max. 128 Zeichen)</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value.slice(0, 128) })}
                  placeholder="info@beispiel.de"
                  maxLength={128}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse (max. 256 Zeichen)</Label>
                <Textarea
                  id="address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value.slice(0, 256) })}
                  placeholder="Musterstraße 1, 12345 Berlin"
                  rows={2}
                  maxLength={256}
                />
                <p className="text-xs text-gray-500 text-right">{profile.address.length} / 256</p>
              </div>
            </div>
          </div>

          {/* Webseiten */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#25D366]" />
              Webseiten (max. 2)
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website1">Webseite 1</Label>
                <Input
                  id="website1"
                  type="url"
                  value={profile.websites[0] || ''}
                  onChange={(e) => {
                    const newWebsites = [...profile.websites];
                    newWebsites[0] = e.target.value;
                    setProfile({ ...profile, websites: newWebsites });
                  }}
                  placeholder="https://www.beispiel.de"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website2">Webseite 2 (optional)</Label>
                <Input
                  id="website2"
                  type="url"
                  value={profile.websites[1] || ''}
                  onChange={(e) => {
                    const newWebsites = [...profile.websites];
                    newWebsites[1] = e.target.value;
                    setProfile({ ...profile, websites: newWebsites });
                  }}
                  placeholder="https://www.shop.beispiel.de"
                />
              </div>
            </div>
          </div>

          {/* Speichern Button (am Ende) */}
          <div className="flex justify-end pb-6">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white px-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : hasChanges ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Änderungen speichern
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Gespeichert
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
