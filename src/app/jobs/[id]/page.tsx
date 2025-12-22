import { db } from '@/firebase/server';
import { JobPosting } from '@/types/career';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import JobDetailClient from './JobDetailClient';

async function getJob(id: string) {
  if (!db) return null;

  // Try to find job in top-level collection first (legacy)
  let jobDoc = await db.collection('jobs').doc(id).get();
  let jobData = jobDoc.exists ? jobDoc.data() : null;

  // If not found, search in subcollections using collectionGroup
  if (!jobDoc.exists) {
    try {
      // Note: This requires a Single Field Index on 'id' for CollectionGroup 'jobs'
      const querySnapshot = await db.collectionGroup('jobs').where('id', '==', id).limit(1).get();
      if (!querySnapshot.empty) {
        jobDoc = querySnapshot.docs[0];
        jobData = jobDoc.data();
      }
    } catch (error: any) {
      console.error('Error querying jobs collectionGroup:', error);
      // If it's an index error, it usually contains a URL in the message
      if (error.code === 9 || error.message?.includes('FAILED_PRECONDITION')) {
        console.error('----------------------------------------------------------------');
        console.error('MISSING INDEX ERROR');
        console.error('This query requires a Collection Group Index on the "id" field.');
        console.error(
          'Please check the Firebase Console > Firestore > Indexes > Single Field Indexes'
        );
        console.error('Or look for a URL in the error message above to create it automatically.');
        console.error('----------------------------------------------------------------');
      }
      throw error;
    }
  }

  if (!jobData) return null;
  
  // Convert Firestore Timestamps to ISO strings
  return {
    id: jobDoc.id,
    ...jobData,
    createdAt: jobData.createdAt?.toDate?.()?.toISOString() || jobData.createdAt,
    postedAt: jobData.postedAt?.toDate?.()?.toISOString() || jobData.postedAt,
    updatedAt: jobData.updatedAt?.toDate?.()?.toISOString() || jobData.updatedAt,
  } as JobPosting;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return {
      title: 'Job nicht gefunden',
    };
  }

  const title = `${job.title} bei ${job.companyName} | Taskilo AI`;
  const description =
    job.description?.substring(0, 160).replace(/<[^>]*>?/gm, '') ||
    `Bewerben Sie sich jetzt als ${job.title} bei ${job.companyName}.`;
  const imageUrl =
    job.headerImageUrl || job.logoUrl || 'https://taskilo.ai/images/default-job-share.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://taskilo.ai/jobs/${id}`,
      siteName: 'Taskilo AI',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'de_DE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  // Fetch Company Details
  let companyDescription = '';
  let companyJobCount = 0;
  let applicationMethod = 'taskilo';
  let externalApplicationUrl = '';

  if (job.companyId) {
    try {
      const companyDoc = await db.collection('companies').doc(job.companyId).get();
      if (companyDoc.exists) {
        const data = companyDoc.data();
        companyDescription = data?.description || '';
        applicationMethod = data?.applicationMethod || 'taskilo';
        externalApplicationUrl = data?.externalApplicationUrl || '';
      }

      const jobsQuery = await db
        .collectionGroup('jobs')
        .where('companyId', '==', job.companyId)
        .where('status', '==', 'active')
        .count()
        .get();
      companyJobCount = jobsQuery.data().count;
    } catch (e) {
      console.error('Error fetching company details:', e);
    }
  }

  // Fetch Similar Jobs
  let similarJobs: JobPosting[] = [];
  try {
    const similarJobsSnapshot = await db
      .collectionGroup('jobs')
      .where('status', '==', 'active')
      .orderBy('postedAt', 'desc')
      .limit(5)
      .get();

    similarJobs = similarJobsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          postedAt: data.postedAt?.toDate?.()?.toISOString() || data.postedAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as JobPosting;
      })
      .filter(j => j.id !== job.id)
      .slice(0, 4);
  } catch (e) {
    console.error('Error fetching similar jobs:', e);
  }

  return (
    <JobDetailClient
      job={job}
      companyDescription={companyDescription}
      companyJobCount={companyJobCount}
      similarJobs={similarJobs}
      applicationMethod={applicationMethod}
      externalApplicationUrl={externalApplicationUrl}
    />
  );
}
