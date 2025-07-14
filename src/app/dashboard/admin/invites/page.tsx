import { Suspense } from 'react';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getUnusedInviteCodes, type InviteCode } from '@/lib/invites-data';
import InviteManager from './InviteManager';

export const dynamic = 'force-dynamic';

export default async function InvitesPage() {
  let codes: InviteCode[] = [];
  let error: string | null = null;
  try {
    codes = await getUnusedInviteCodes();
  } catch (e: any) {
    error = e.message || 'Ein Fehler ist beim Laden der Einladungscodes aufgetreten.';
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Einladungscodes verwalten</CardTitle>
          <CardDescription>
            Erstelle neue Einladungscodes für Mitarbeiter oder sieh dir bestehende, unbenutzte Codes
            an.
          </CardDescription>
        </CardHeader>
        {error ? (
          <CardContent>
            <Alert variant="destructive">
              <FiAlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-32">
            <FiLoader className="animate-spin text-2xl" />
          </div>
        }
      >
        <InviteManager
          initialCodes={codes.map(c => ({ ...c, createdAt: new Date(c.createdAt) }))}
        />
      </Suspense>
    </div>
  );
}
