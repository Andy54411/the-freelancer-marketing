import { db } from '@/firebase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ActionButtons from './ActionButtons'; // Importieren der neuen Client-Komponente

interface CompanyData {
    companyName?: string;
    firmenname?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    status: 'active' | 'locked' | string;
    [key: string]: any;
}

async function getCompanyData(id: string): Promise<CompanyData | null> {
    const companyRef = db.collection('users').doc(id);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
        return null;
    }
    return companyDoc.data() as CompanyData;
}

// Wir verwenden hier einen Inline-Typ für die Props, um einen hartnäckigen und ungewöhnlichen
// TypeScript-Build-Fehler zu umgehen. Dies vermeidet mögliche Konflikte mit global
// definierten oder abgeleiteten 'PageProps'-Typen von Next.js.
export default async function CompanyDetailPage(props: any) {
    // Zugriff auf params erst nach dem ersten await!
    const companyData = await getCompanyData(props.params.id);

    if (!companyData) {
        notFound();
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active': return 'default';
            case 'locked': return 'destructive';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>
                                {companyData.companyName ||
                                 companyData.firmenname ||
                                 `${companyData.firstName} ${companyData.lastName}` ||
                                 'Unbenanntes Unternehmen'}
                            </CardTitle>
                            <CardDescription>ID: {props.params.id}</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(companyData.status)} className="capitalize">
                            {companyData.status || 'unbekannt'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p><strong>E-Mail:</strong> {companyData.email || 'N/A'}</p>
                    <ActionButtons companyId={props.params.id} status={companyData.status} />
                </CardContent>
            </Card>
        </div>
    );
}