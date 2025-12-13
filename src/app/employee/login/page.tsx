'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Building2, UserCheck, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';

function EmployeeLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [companyCode, setCompanyCode] = useState(searchParams.get('code') || '');
  const [linking, setLinking] = useState(false);
  const [success, setSuccess] = useState(false);

  // Wenn User eingeloggt ist und Code vorhanden, automatisch verknüpfen
  useEffect(() => {
    const autoLink = async () => {
      const codeFromUrl = searchParams.get('code');
      if (user && codeFromUrl && !linking && !success) {
        setCompanyCode(codeFromUrl);
        await handleLinkAccount(codeFromUrl);
      }
    };
    
    if (!authLoading) {
      autoLink();
    }
  }, [user, authLoading, searchParams]);

  const handleLinkAccount = async (code?: string) => {
    const codeToUse = code || companyCode;
    
    if (!codeToUse) {
      toast.error('Bitte geben Sie den Firmencode ein');
      return;
    }

    if (!user) {
      toast.error('Bitte melden Sie sich zuerst an');
      return;
    }

    setLinking(true);

    try {
      const response = await fetch('/api/employee/link-by-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyCode: codeToUse,
          authUid: user.uid,
          email: user.email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        toast.success('Erfolgreich mit Unternehmen verknüpft!');
        
        // Nach kurzer Verzögerung zum Dashboard weiterleiten
        setTimeout(() => {
          router.push(`/dashboard/user/${user.uid}`);
        }, 2000);
      } else {
        toast.error(result.error || 'Verknüpfung fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLinking(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 to-blue-50">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <span className="text-gray-600">Wird geladen...</span>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Erfolgreich verknüpft!</h2>
              <p className="text-gray-600">
                Sie werden zum Dashboard weitergeleitet...
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-teal-600 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not logged in - show login/register options
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-teal-600" />
            </div>
            <CardTitle className="text-2xl">Mitarbeiter-Anmeldung</CardTitle>
            <CardDescription>
              Melden Sie sich an, um sich mit Ihrem Unternehmen zu verbinden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyCode && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
                <p className="text-sm text-teal-700 mb-1">Firmencode:</p>
                <p className="font-mono font-bold text-teal-800">{companyCode}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <Link href={`/login?redirectTo=/employee/login${companyCode ? `?code=${companyCode}` : ''}`}>
                <Button className="w-full bg-teal-600 hover:bg-teal-700">
                  <LogIn className="h-4 w-4 mr-2" />
                  Mit bestehendem Konto anmelden
                </Button>
              </Link>
              
              <Link href={`/register/user?redirectTo=/employee/login${companyCode ? `?code=${companyCode}` : ''}`}>
                <Button variant="outline" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Neues Konto erstellen
                </Button>
              </Link>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Nach der Anmeldung werden Sie automatisch mit Ihrem Unternehmen verbunden.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in - show company code input
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-teal-600" />
          </div>
          <CardTitle className="text-2xl">Mit Unternehmen verbinden</CardTitle>
          <CardDescription>
            Geben Sie den Firmencode ein, den Sie per E-Mail erhalten haben
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Angemeldet als:</p>
            <p className="font-medium text-gray-900">{user.email}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyCode">Firmencode</Label>
            <Input
              id="companyCode"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              placeholder="z.B. jcGLTdv9D9VV2PpZZPkBjzbrrIx2"
              className="font-mono text-center"
            />
          </div>
          
          <Button
            onClick={() => handleLinkAccount()}
            disabled={linking || !companyCode}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {linking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird verknüpft...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Mit Unternehmen verbinden
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Den Firmencode finden Sie in der Einladungs-E-Mail von Ihrem Arbeitgeber.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-teal-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    }>
      <EmployeeLoginContent />
    </Suspense>
  );
}
