import { MOCK_JOBS } from '@/lib/mock-jobs';
import { notFound } from 'next/navigation';
import JobDetailClient from './JobDetailClient';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = MOCK_JOBS.find((j) => j.id === id);

  if (!job) {
    notFound();
  }

  return <JobDetailClient job={job} />;
}
