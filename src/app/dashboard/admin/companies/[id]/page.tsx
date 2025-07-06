import { notFound } from 'next/navigation';
import { getCompanyDetails } from './data';
import { CompanyDetailClientPage } from './components/CompanyDetailClientPage';

export const dynamic = 'force-dynamic';

type Props = {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

export default async function CompanyDetailPage({ params }: Props) {
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