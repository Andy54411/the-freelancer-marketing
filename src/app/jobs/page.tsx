import { JobBoard } from '@/components/jobs/JobBoard';
import { Suspense } from 'react';

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense
        fallback={<div className="flex items-center justify-center min-h-screen">Laden...</div>}
      >
        <JobBoard />
      </Suspense>
    </div>
  );
}
