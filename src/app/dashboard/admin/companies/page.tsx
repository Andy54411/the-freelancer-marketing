import { CompaniesDataTable } from './[id]/components/companies-data-table';
import { columns } from './[id]/components/columns';
import { getAllCompanies, type CompanyListData } from '@/lib/companies-list-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FiAlertCircle } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  let companies: CompanyListData[] = [];
  let error: string | null = null;
  try {
    companies = await getAllCompanies();
  } catch (e: any) {
    error = e.message || 'Ein Fehler ist beim Laden der Firmen aufgetreten.';
  }
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Firmen-Accounts</h1>
      <p className="text-gray-600 mb-6">Verwalte alle registrierten Firmen-Accounts auf Taskilo.</p>
      {error ? (
        <Alert variant="destructive" className="my-4">
          <FiAlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <CompaniesDataTable data={companies} columns={columns} />
      )}
    </div>
  );
}
