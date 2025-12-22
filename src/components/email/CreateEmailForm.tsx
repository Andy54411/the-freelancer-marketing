'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Check, 
  X, 
  Loader2, 
  Info,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';

interface CreateEmailFormProps {
  onEmailCreated?: (email: string) => void;
}

export function CreateEmailForm({ onEmailCreated }: CreateEmailFormProps) {
  const [localPart, setLocalPart] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  // Check availability with debounce
  const checkAvailability = useCallback(async (value: string) => {
    if (value.length < 3) {
      setIsAvailable(null);
      setAvailabilityError('Mindestens 3 Zeichen');
      return;
    }

    setIsChecking(true);
    setAvailabilityError(null);

    try {
      const response = await fetch(`/api/email/check?localPart=${encodeURIComponent(value)}`);
      const data = await response.json();

      setIsAvailable(data.available);
      if (!data.available && data.error) {
        setAvailabilityError(data.error);
      }
    } catch {
      setAvailabilityError('Fehler bei der Prüfung');
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Debounced availability check
  useEffect(() => {
    if (!localPart || localPart.length < 3) {
      setIsAvailable(null);
      return;
    }

    const timeout = setTimeout(() => {
      checkAvailability(localPart);
    }, 500);

    return () => clearTimeout(timeout);
  }, [localPart, checkAvailability]);

  const handleCreate = async () => {
    if (!isAvailable || password !== confirmPassword || password.length < 8) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/email/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localPart,
          password,
          displayName: displayName || localPart,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCreatedEmail(data.email);
        onEmailCreated?.(data.email);
      } else {
        setCreateError(data.error || 'Fehler bei der Erstellung');
      }
    } catch {
      setCreateError('Netzwerkfehler');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Success state
  if (createdEmail) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Check className="h-5 w-5" />
            E-Mail-Adresse erstellt!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-white rounded-lg border border-green-200">
            <Mail className="h-5 w-5 text-green-600" />
            <span className="font-medium">{createdEmail}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(createdEmail)}
              className="ml-auto"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Du kannst jetzt E-Mails senden und empfangen. Melde dich mit deiner neuen Adresse an.
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-white rounded-lg border text-sm space-y-2">
            <p className="font-medium">Zugangsdaten:</p>
            <p><span className="text-gray-500">E-Mail:</span> {createdEmail}</p>
            <p><span className="text-gray-500">Passwort:</span> (das von dir gewählte Passwort)</p>
            <p className="text-gray-500 text-xs mt-2">
              IMAP: mail.taskilo.de:993 | SMTP: mail.taskilo.de:587
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-teal-600" />
          Neue @taskilo.de E-Mail erstellen
        </CardTitle>
        <CardDescription>
          Erstelle deine persönliche E-Mail-Adresse mit 1 GB Speicherplatz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Address */}
        <div className="space-y-2">
          <Label htmlFor="localPart">E-Mail-Adresse</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="localPart"
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
                placeholder="dein.name"
                className={`pr-10 ${
                  isAvailable === true ? 'border-green-500' : 
                  isAvailable === false ? 'border-red-500' : ''
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                {!isChecking && isAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                {!isChecking && isAvailable === false && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            <span className="text-gray-500 font-medium">@taskilo.de</span>
          </div>
          {availabilityError && (
            <p className="text-sm text-red-500">{availabilityError}</p>
          )}
          {isAvailable && (
            <p className="text-sm text-green-500">Diese Adresse ist verfügbar!</p>
          )}
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Anzeigename (optional)</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Dein Name"
          />
          <p className="text-xs text-gray-500">
            Wird als Absendername in E-Mails angezeigt
          </p>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Passwort wiederholen"
            className={confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-sm text-red-500">Passwörter stimmen nicht überein</p>
          )}
        </div>

        {/* Error */}
        {createError && (
          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Deine E-Mail-Adresse wird auf unseren sicheren Servern in Deutschland gehostet.
            Du erhältst 1 GB Speicherplatz inklusive.
          </AlertDescription>
        </Alert>

        {/* Submit */}
        <Button
          className="w-full bg-teal-600 hover:bg-teal-700"
          onClick={handleCreate}
          disabled={
            !isAvailable || 
            !password || 
            password.length < 8 ||
            password !== confirmPassword ||
            isCreating
          }
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Wird erstellt...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              E-Mail-Adresse erstellen
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
