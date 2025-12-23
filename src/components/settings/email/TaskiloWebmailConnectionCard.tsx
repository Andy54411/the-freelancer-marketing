'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  CheckCircle, 
  Trash2, 
  Loader2, 
  ExternalLink,
  Crown,
  AlertCircle 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WebmailConfig {
  id: string;
  email: string;
  provider: 'taskilo-webmail';
  status: 'connected' | 'error' | 'disconnected';
  connectedAt: string;
  subscriptionPlan?: 'free' | 'domain' | 'pro' | 'business';
  displayName?: string;
}

interface TaskiloWebmailConnectionCardProps {
  companyId: string;
  webmailConfig?: WebmailConfig;
  onConnect: (email: string, password: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  isConnecting?: boolean;
}

export function TaskiloWebmailConnectionCard({
  companyId,
  webmailConfig,
  onConnect,
  onDisconnect,
  isConnecting = false
}: TaskiloWebmailConnectionCardProps) {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWebmailAccount, setHasWebmailAccount] = useState<boolean | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(false);

  // Prüfe ob der Benutzer ein Taskilo Webmail Konto hat
  const checkWebmailAccount = useCallback(async () => {
    try {
      setCheckingAccount(true);
      const response = await fetch(`/api/company/${companyId}/check-webmail-account`);
      if (response.ok) {
        const data = await response.json();
        setHasWebmailAccount(data.hasAccount);
        if (data.email) {
          setEmail(data.email);
        }
      }
    } catch {
      setHasWebmailAccount(false);
    } finally {
      setCheckingAccount(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!webmailConfig) {
      checkWebmailAccount();
    }
  }, [webmailConfig, checkWebmailAccount]);

  const handleConnect = async () => {
    if (!email || !password) {
      setError('Bitte E-Mail und Passwort eingeben');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onConnect(email, password);
      setShowConnectDialog(false);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verbindung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await onDisconnect();
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanBadge = (plan?: string) => {
    switch (plan) {
      case 'business':
        return <Badge className="bg-purple-100 text-purple-800"><Crown className="h-3 w-3 mr-1" /> Business</Badge>;
      case 'pro':
        return <Badge className="bg-blue-100 text-blue-800">ProMail</Badge>;
      case 'domain':
        return <Badge className="bg-teal-100 text-teal-800">Eigene Domain</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">FreeMail</Badge>;
    }
  };

  // Verbundene Webmail-Card
  if (webmailConfig) {
    return (
      <Card className="border-2 border-teal-500 bg-teal-50 relative overflow-hidden">
        {/* Premium-Banner für Taskilo-Kunden */}
        <div className="absolute top-0 left-0 right-0 bg-linear-to-r from-teal-600 to-teal-500 text-white text-xs py-1 text-center font-medium">
          Taskilo Webmail - Bevorzugte Integration
        </div>
        
        <CardContent className="p-8 pt-10 text-center relative">
          <Button
            onClick={handleDisconnect}
            size="sm"
            variant="outline"
            disabled={isLoading}
            className="absolute top-10 right-4 text-red-600 border-red-200 hover:bg-red-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
          
          <div className="relative w-full h-48 mb-6 flex items-center justify-center">
            <div className="w-32 h-32 bg-linear-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Mail className="h-16 w-16 text-white" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">Taskilo Webmail</h3>
          <p className="text-sm text-teal-700 mb-2 font-semibold">{webmailConfig.email}</p>
          
          <div className="flex justify-center gap-2 mb-4">
            <Badge className="bg-teal-100 text-teal-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verbunden
            </Badge>
            {getPlanBadge(webmailConfig.subscriptionPlan)}
          </div>
          
          {webmailConfig.displayName && (
            <p className="text-xs text-gray-600 mt-2">
              {webmailConfig.displayName}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Prüfen ob Benutzer Webmail hat
  if (checkingAccount) {
    return (
      <Card className="border-2 border-dashed border-teal-300 bg-teal-50/50">
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
          <p className="text-gray-600">Prüfe Taskilo Webmail Konto...</p>
        </CardContent>
      </Card>
    );
  }

  // Nicht verbundene Webmail-Card (mit oder ohne Account)
  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-teal-400 hover:border-teal-500 bg-linear-to-br from-teal-50 to-white relative overflow-hidden"
        onClick={() => setShowConnectDialog(true)}
      >
        {/* Premium-Banner */}
        <div className="absolute top-0 left-0 right-0 bg-linear-to-r from-teal-600 to-teal-500 text-white text-xs py-1 text-center font-medium">
          Empfohlen für Taskilo Kunden
        </div>
        
        <CardContent className="p-8 pt-10 text-center">
          <div className="relative w-full h-48 mb-6 flex items-center justify-center">
            <div className="w-32 h-32 bg-linear-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Mail className="h-16 w-16 text-white" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">Taskilo Webmail</h3>
          
          {hasWebmailAccount ? (
            <p className="text-gray-600 mb-4">
              Verbinden Sie Ihr bestehendes Taskilo Webmail Konto
            </p>
          ) : (
            <p className="text-gray-600 mb-4">
              Nutzen Sie Taskilo Webmail für optimale Integration
            </p>
          )}
          
          <Button 
            className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verbinde...
              </>
            ) : hasWebmailAccount ? (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Webmail verbinden
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Webmail Konto erstellen
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Verbindungs-Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Taskilo Webmail verbinden</DialogTitle>
            <DialogDescription>
              {hasWebmailAccount 
                ? 'Geben Sie Ihre Taskilo Webmail Zugangsdaten ein, um Ihr E-Mail-Konto mit dem Company Dashboard zu verbinden.'
                : 'Sie haben noch kein Taskilo Webmail Konto. Erstellen Sie eines oder geben Sie bestehende Zugangsdaten ein.'
              }
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ihr Webmail Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {!hasWebmailAccount && (
            <Alert className="border-teal-200 bg-teal-50">
              <Mail className="h-4 w-4 text-teal-600" />
              <AlertDescription className="text-teal-800">
                <a 
                  href="/webmail/pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium underline hover:no-underline"
                >
                  Hier Taskilo Webmail Konto erstellen
                </a>
                {' '}- Ab 0 EUR/Monat für FreeMail
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConnectDialog(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isLoading || !email || !password}
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verbinde...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Verbinden
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
