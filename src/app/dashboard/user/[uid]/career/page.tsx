import { redirect } from 'next/navigation';

export default async function CareerPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  redirect(`/dashboard/user/${uid}/career/jobs`);
}
