import { db } from '@/firebase/server';
import { JobPosting } from '@/types/career';
import { notFound } from 'next/navigation';
import JobDetailClient from './JobDetailClient';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  const jobDoc = await db.collection('jobs').doc(id).get();

  if (!jobDoc.exists) {
    notFound();
  }

  const job = { id: jobDoc.id, ...jobDoc.data() } as JobPosting;

  return <JobDetailClient job={job} />;
}
