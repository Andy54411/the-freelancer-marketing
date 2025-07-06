import { notFound } from 'next/navigation';
import { getCompanyDetails } from './data';
import { CompanyDetailClientPage } from './components/CompanyDetailClientPage';

export const dynamic = 'force-dynamic';

// Wir typisieren nur noch das, was wir wirklich aus den Props destrukturieren und verwenden.
export default async function CompanyDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const { id } = params;

    if (!id) {
        notFound();
    }

    const companyDetails = await getCompanyDetails(id);
    if (!companyDetails) {
        notFound();
    }

    return <CompanyDetailClientPage data={companyDetails} />;
}