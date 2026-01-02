'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mail, CheckCircle, Trash2, ArrowRight, AlertTriangle, Home } from 'lucide-react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email') || '';
  const tokenParam = searchParams?.get('token') || '';

  const [email, setEmail] = useState(emailParam);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);
  const [showDataDeletion, setShowDataDeletion] = useState(false);

  const handleUnsubscribe = async () => {
    if (!email) {
      toast.error('Bitte geben Sie Ihre E-Mail-Adresse ein.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          unsubscribeToken: tokenParam,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsUnsubscribed(true);
        toast.success('Sie wurden erfolgreich vom Newsletter abgemeldet.');
      } else {
        toast.error(result.error || 'Fehler beim Abmelden');
      }
    } catch {
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataDeletion = async () => {
    if (!email) {
      toast.error('Bitte geben Sie Ihre E-Mail-Adresse ein.');
      return;
    }

    if (
      !confirm(
        'Möchten Sie alle Ihre Daten wirklich unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer user-deletion-request',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Alle Ihre Daten wurden DSGVO-konform gelöscht.');
        setShowDataDeletion(false);
      } else {
        toast.error(result.error || 'Fehler bei der Datenlöschung');
      }
    } catch {
      toast.error('Ein Fehler ist aufgetreten. Bitte kontaktieren Sie unseren Support.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isUnsubscribed) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Card className="shadow-xl border-gray-100">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-linear-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Erfolgreich abgemeldet</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4 px-8 pb-8">
              <p className="text-gray-600">
                Sie wurden erfolgreich von unserem Newsletter abgemeldet.
              </p>
              <p className="text-sm text-gray-500">
                Es tut uns leid, Sie gehen zu sehen. Falls Sie Ihre Meinung ändern, können Sie sich
                jederzeit wieder anmelden.
              </p>

              <div className="pt-6 space-y-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDataDeletion(true)}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  DSGVO: Alle meine Daten löschen
                </Button>

                <Button 
                  onClick={() => (window.location.href = '/')} 
                  className="w-full bg-linear-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Zur Startseite
                </Button>
              </div>

              {showDataDeletion && (
                <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Datenlöschung (DSGVO)</h3>
                  </div>
                  <p className="text-sm text-red-600 mb-4 text-left">
                    Diese Aktion löscht alle Ihre gespeicherten Daten unwiderruflich. Sie können sich
                    danach nicht mehr automatisch abmelden.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDataDeletion}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Endgültig löschen
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setShowDataDeletion(false)}
                      className="flex-1"
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Branding */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Powered by <span className="font-semibold text-teal-600">Taskilo</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-xl border-gray-100">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-linear-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Newsletter abbestellen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-8 pb-8">
            <p className="text-gray-600 text-center">
              Möchten Sie sich von unserem Newsletter abmelden?
            </p>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Ihre E-Mail-Adresse"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 h-12 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>

              <Button 
                onClick={handleUnsubscribe} 
                disabled={isLoading || !email} 
                className="w-full h-12 bg-linear-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg font-semibold"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Wird abgemeldet...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Vom Newsletter abmelden
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </div>

            <div className="bg-teal-50 p-4 rounded-xl">
              <p className="text-sm text-teal-800 text-center">
                Nach der Abmeldung erhalten Sie keine Newsletter-E-Mails mehr von uns.
              </p>
            </div>

            <div className="text-center text-xs text-gray-500 space-y-2 pt-2">
              <p>
                <strong>DSGVO-Hinweis:</strong> Ihre E-Mail-Adresse wird für 3 Jahre gespeichert, um
                erneute Anmeldungen zu verhindern. Sie können eine vollständige Löschung anfordern.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Haben Sie Fragen? Kontaktieren Sie uns unter{' '}
                <a href="mailto:support@taskilo.de" className="text-teal-600 hover:underline font-medium">
                  support@taskilo.de
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Branding */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-semibold text-teal-600">Taskilo</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-teal-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <Card className="shadow-xl border-gray-100">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">Wird geladen...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
