'use client';

/**
 * Auftrags-Erfolgsseite
 * Wird nach erfolgreicher Zahlung/Escrow-Erstellung angezeigt
 * Finalisiert den Auftrag automatisch
 * 
 * Unterstützt:
 * - Normale Aufträge (finalize-order)
 * - Marketplace Publishing Fees (activate-project) - orderId beginnt mit "pub_"
 */

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Clock, Shield, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/clients';

function ErfolgContent() {
  const searchParams = useSearchParams();
  const tempDraftId = searchParams.get('orderId'); // Das ist die tempDraftId oder pub_projectId
  const escrowId = searchParams.get('escrowId');
  const status = searchParams.get('status'); // success, failed, cancelled
  const [mounted, setMounted] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalOrderId, setFinalOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalized, setFinalized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMarketplacePublishing, setIsMarketplacePublishing] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Prüfen ob es sich um eine Marketplace Publishing Fee handelt
    if (tempDraftId?.startsWith('pub_')) {
      setIsMarketplacePublishing(true);
      setProjectId(tempDraftId.replace('pub_', ''));
    }
  }, [tempDraftId]);

  // Finalisiere den Auftrag einmalig
  useEffect(() => {
    if (!mounted || finalized || finalizing || !tempDraftId) return;
    if (status === 'failed' || status === 'cancelled') return;

    const doFinalize = async () => {
      setFinalizing(true);
      setFinalized(true);
      
      try {
        const auth = getAuth(app);
        
        // Warte auf Auth State
        await new Promise<void>((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            if (user) {
              setUserId(user.uid);
              resolve();
            } else {
              setError('Bitte melden Sie sich an');
              setFinalizing(false);
            }
          });
        });

        const user = auth.currentUser;
        if (!user) return;

        setUserId(user.uid);
        const token = await user.getIdToken();

        // Unterscheide zwischen Marketplace Publishing und normalem Auftrag
        if (tempDraftId.startsWith('pub_')) {
          // Marketplace Publishing Fee - Projekt aktivieren
          const actualProjectId = tempDraftId.replace('pub_', '');
          const res = await fetch('/api/marketplace/activate-project', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              projectId: actualProjectId,
            }),
          });

          const data = await res.json();
          if (data.success) {
            setFinalOrderId(actualProjectId);
            setProjectId(actualProjectId);
          } else {
            setError(data.error || 'Fehler beim Aktivieren des Projekts');
          }
        } else {
          // Normaler Auftrag - finalize-order
          const res = await fetch('/api/payment/finalize-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              tempDraftId,
              escrowId,
            }),
          });

          const data = await res.json();
          if (data.success) {
            setFinalOrderId(data.orderId);
          } else {
            setError(data.error || 'Fehler beim Finalisieren des Auftrags');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setFinalizing(false);
      }
    };

    doFinalize();
  }, [mounted, tempDraftId, escrowId, status, finalized, finalizing]);

  if (!mounted || finalizing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-gray-600">Auftrag wird finalisiert...</p>
      </div>
    );
  }

  // Fehler bei Zahlung
  if (status === 'failed' || status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">
              {status === 'cancelled' ? 'Zahlung abgebrochen' : 'Zahlung fehlgeschlagen'}
            </h1>
            <p className="text-gray-600 mb-6">
              {status === 'cancelled' 
                ? 'Sie haben die Zahlung abgebrochen.' 
                : 'Bei der Zahlung ist ein Fehler aufgetreten.'}
            </p>
            <Button asChild className="bg-teal-600 hover:bg-teal-700">
              <Link href="/auftrag/get-started">Erneut versuchen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-linear-to-br from-teal-500 via-teal-600 to-teal-700 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6">
            {isMarketplacePublishing ? (
              <Sparkles className="h-12 w-12 text-teal-600" />
            ) : (
              <CheckCircle className="h-12 w-12 text-teal-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isMarketplacePublishing 
              ? (finalOrderId ? 'Projekt erfolgreich veröffentlicht' : 'Zahlung erfolgreich')
              : (finalOrderId ? 'Auftrag erfolgreich erstellt' : 'Zahlung erfolgreich')}
          </h1>
          <p className="text-teal-100">
            {isMarketplacePublishing
              ? (finalOrderId ? 'Ihr Projekt ist jetzt im Marktplatz sichtbar' : 'Ihr Projekt wird veröffentlicht')
              : (finalOrderId ? 'Der Dienstleister wurde benachrichtigt' : 'Ihr Auftrag wird bearbeitet')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-8">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">Fehler</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Success Status */}
            {finalOrderId && (
              <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-800">
                    {isMarketplacePublishing ? 'Projekt veröffentlicht' : 'Auftrag erstellt'}
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    {isMarketplacePublishing 
                      ? 'Ihr Projekt ist jetzt im Marktplatz sichtbar. Dienstleister können Angebote abgeben.'
                      : 'Ihr Auftrag wurde erfolgreich erstellt. Der Dienstleister wird benachrichtigt und kann den Auftrag annehmen.'}
                  </p>
                </div>
              </div>
            )}

            {/* Clearing Info */}
            {!finalOrderId && !error && (
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800">Zahlung wird bearbeitet</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Bei SEPA-Überweisungen kann die Bearbeitung 1-2 Werktage dauern. 
                    Sie erhalten eine Bestätigung per E-Mail, sobald die Zahlung eingegangen ist.
                  </p>
                </div>
              </div>
            )}

            {/* Escrow Info - nur für normale Aufträge */}
            {!isMarketplacePublishing && (
              <div className="flex items-start gap-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <Shield className="h-6 w-6 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-teal-800">Treuhand-Schutz aktiv</h3>
                  <p className="text-sm text-teal-700 mt-1">
                    Ihr Geld wird sicher verwahrt und erst nach erfolgreicher Leistungserbringung 
                    an den Dienstleister ausgezahlt.
                  </p>
                </div>
              </div>
            )}

            {/* Marketplace Info - nur für Marketplace Publishing */}
            {isMarketplacePublishing && finalOrderId && (
              <div className="flex items-start gap-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <Sparkles className="h-6 w-6 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-teal-800">Nächste Schritte</h3>
                  <p className="text-sm text-teal-700 mt-1">
                    Dienstleister können jetzt Angebote für Ihr Projekt abgeben. 
                    Sie werden per E-Mail benachrichtigt, sobald ein Angebot eingeht.
                  </p>
                </div>
              </div>
            )}

            {/* Order Details */}
            {(finalOrderId || escrowId) && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-2">Referenzen</h3>
                <div className="space-y-1 text-sm">
                  {finalOrderId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Auftrags-ID:</span>
                      <span className="font-mono">{finalOrderId.slice(-8).toUpperCase()}</span>
                    </div>
                  )}
                  {escrowId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Escrow-ID:</span>
                      <span className="font-mono">ESC-{escrowId.slice(-8).toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {isMarketplacePublishing && projectId ? (
                <>
                  <Button asChild className="flex-1 bg-teal-600 hover:bg-teal-700">
                    <Link href={`/marketplace/projects/${projectId}`}>
                      Projekt ansehen
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/marketplace">
                      Zum Marktplatz
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={!userId}>
                    <Link href={userId ? `/dashboard/user/${userId}` : '#'}>
                      Zum Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/">
                      Zur Startseite
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Fragen? Kontaktieren Sie uns unter{' '}
          <a href="mailto:support@taskilo.de" className="text-teal-600 hover:underline">
            support@taskilo.de
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AuftragErfolgPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    }>
      <ErfolgContent />
    </Suspense>
  );
}
