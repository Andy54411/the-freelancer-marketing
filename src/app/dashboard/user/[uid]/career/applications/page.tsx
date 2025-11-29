import { db } from '@/firebase/server';
import { JobApplication } from '@/types/career';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function ApplicationsPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;

  let applications: (JobApplication & { jobTitle?: string, companyName?: string })[] = [];

  if (db) {
    try {
      const snapshot = await db.collection('users').doc(uid).collection('job_applications')
        .orderBy('appliedAt', 'desc')
        .get();
      
      applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Meine Bewerbungen</h2>
        <p className="text-sm text-gray-500">
          Status Ihrer aktuellen Bewerbungen verfolgen.
        </p>
      </div>

      {applications.length > 0 ? (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{app.jobTitle || 'Unbekannte Position'}</CardTitle>
                    <p className="text-sm text-muted-foreground">{app.companyName || 'Unbekanntes Unternehmen'}</p>
                  </div>
                  <Badge variant={
                    app.status === 'accepted' ? 'default' : // green-ish usually
                    app.status === 'rejected' ? 'destructive' :
                    app.status === 'interview' ? 'secondary' : // maybe purple/blue
                    'outline'
                  }>
                    {app.status === 'pending' && 'Eingegangen'}
                    {app.status === 'reviewed' && 'In Prüfung'}
                    {app.status === 'interview' && 'Interview'}
                    {app.status === 'rejected' && 'Abgelehnt'}
                    {app.status === 'accepted' && 'Akzeptiert'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Beworben vor {formatDistanceToNow(new Date(app.appliedAt), { locale: de, addSuffix: false })}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/user/${uid}/career/jobs/${app.jobId}`}>
                      Job ansehen
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Keine Bewerbungen</h3>
          <p className="text-gray-500 mt-1">
            Sie haben sich noch auf keine Stellen beworben.
          </p>
          <Button className="mt-4" asChild>
            <Link href={`/dashboard/user/${uid}/career/jobs`}>
              Jobs durchsuchen
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
