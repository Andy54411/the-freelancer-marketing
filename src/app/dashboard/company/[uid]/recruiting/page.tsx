import { db } from '@/firebase/server';
import { JobPosting } from '@/types/career';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase, Users, Eye } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function RecruitingPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;

  // Fetch jobs for this company
  let jobs: JobPosting[] = [];
  
  if (!db) {
    console.error('Database not initialized');
    return <div>Database Error</div>;
  }

  try {
    const jobsSnapshot = await db.collection('jobs')
      .where('companyId', '==', uid)
      .orderBy('postedAt', 'desc')
      .get();

    jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobPosting));
  } catch (error) {
    console.error('Error fetching company jobs:', error);
    // Fallback without orderBy if index is missing
    try {
        const jobsSnapshot = await db.collection('jobs').where('companyId', '==', uid).get();
        jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobPosting));
        // Sort manually
        jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    } catch (e) {
        console.error('Fallback fetch failed', e);
    }
  }

  // Calculate stats
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const totalApplications = 0; // TODO: Fetch actual count

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recruiting</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Stellenanzeigen und Bewerbungen.</p>
        </div>
        <Link href={`/dashboard/company/${uid}/recruiting/create`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Stellenanzeige erstellen
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Stellen</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bewerbungen (Gesamt)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">Alle offenen Stellen</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ansichten</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Letzte 30 Tage</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Ihre Stellenanzeigen</CardTitle>
          <CardDescription>Eine Übersicht aller erstellten Stellenanzeigen.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{job.title}</h3>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                        {job.status === 'active' ? 'Aktiv' : job.status === 'closed' ? 'Geschlossen' : 'Entwurf'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{new Date(job.postedAt).toLocaleDateString('de-DE')}</span>
                      <span>•</span>
                      <span className="capitalize">{job.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/company/${uid}/recruiting/${job.id}`}>
                      <Button variant="outline" size="sm">
                        Verwalten
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Keine Stellenanzeigen</h3>
              <p className="mt-1 text-sm text-gray-500">Starten Sie Ihr Recruiting, indem Sie Ihre erste Stelle ausschreiben.</p>
              <div className="mt-6">
                <Link href={`/dashboard/company/${uid}/recruiting/create`}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Erste Stelle erstellen
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
