'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import { FiMail, FiCheck, FiTrash2 } from 'react-icons/fi';

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
    } catch (error) {

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
            Authorization: 'Bearer user-deletion-request', // Vereinfachte Autorisierung
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
    } catch (error) {

      toast.error('Ein Fehler ist aufgetreten. Bitte kontaktieren Sie unseren Support.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isUnsubscribed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FiCheck className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Erfolgreich abgemeldet</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Sie wurden erfolgreich von unserem Newsletter abgemeldet.
            </p>
            <p className="text-sm text-gray-500">
              Es tut uns leid, Sie gehen zu sehen. Falls Sie Ihre Meinung ändern, können Sie sich
              jederzeit wieder anmelden.
            </p>

            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDataDeletion(true)}
                className="w-full mb-3"
              >
                <FiTrash2 className="w-4 h-4 mr-2" />
                DSGVO: Alle meine Daten löschen
              </Button>

              <Button onClick={() => (window.location.href = '/')} className="w-full">
                Zur Startseite
              </Button>
            </div>

            {showDataDeletion && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">Datenlöschung (DSGVO)</h3>
                <p className="text-sm text-red-600 mb-3">
                  Diese Aktion löscht alle Ihre gespeicherten Daten unwiderruflich. Sie können sich
                  danach nicht mehr automatisch abmelden.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDataDeletion}
                    disabled={isLoading}
                  >
                    Endgültig löschen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDataDeletion(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <FiMail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Newsletter abbestellen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            Möchten Sie sich von unserem Newsletter abmelden?
          </p>

          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Ihre E-Mail-Adresse"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
            />

            <Button onClick={handleUnsubscribe} disabled={isLoading || !email} className="w-full">
              {isLoading ? 'Wird abgemeldet...' : 'Vom Newsletter abmelden'}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 space-y-2">
            <p>Nach der Abmeldung erhalten Sie keine Newsletter-E-Mails mehr von uns.</p>
            <p>
              <strong>DSGVO-Hinweis:</strong> Ihre E-Mail-Adresse wird für 3 Jahre gespeichert, um
              erneute Anmeldungen zu verhindern. Sie können eine vollständige Löschung anfordern.
            </p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-400 text-center">
              Haben Sie Fragen? Kontaktieren Sie uns unter{' '}
              <a href="mailto:support@taskilo.de" className="text-blue-600 hover:underline">
                support@taskilo.de
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Lädt...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
