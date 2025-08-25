import { redirect } from 'next/navigation';

interface OrdersPageProps {
  params: Promise<{ uid: string }>;
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { uid } = await params;

  // Redirect to orders overview
  redirect(`/dashboard/user/${uid}/orders/overview`);
}
