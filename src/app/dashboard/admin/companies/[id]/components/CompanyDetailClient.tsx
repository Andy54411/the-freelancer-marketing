import type { CompanyData } from '@/lib/company-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { processCompanyData } from '@/lib/company-utils';
import ActionButtons from './ActionButtons';
import { FiFileText, FiExternalLink, FiImage } from 'react-icons/fi';

const DataRow = ({ label, value }: { label: string; value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    return (
        <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-words">{displayValue}</dd>
        </div>
    );
};

export default function CompanyDetailClient({ companyData, id }: { companyData: CompanyData; id: string }) {
    const { displayName, status, email, documents, otherData } = processCompanyData(companyData);

    const getStatusVariant = (status: 'active' | 'locked' | 'unknown') => {
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
                            <CardTitle className="text-2xl">{displayName}</CardTitle>
                            <CardDescription>Benutzer-ID: {id}</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(status)} className="capitalize">
                            {status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DataRow label="E-Mail" value={email} />
                    <ActionButtons companyId={id} isLocked={status === 'locked'} status={status} />
                </CardContent>
            </Card>
            {documents.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Dokumente</CardTitle>
                        <CardDescription>Gespeicherte Dokumente und Nachweise des Unternehmens.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        {documents.map((doc: { key: string; label: string; value: string }) => (
                            <div key={doc.key} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                <div className="flex items-center gap-3">
                                    {doc.label.includes('Profilbild') ? (
                                        <FiImage className="h-6 w-6 text-gray-400" />
                                    ) : (
                                        <FiFileText className="h-6 w-6 text-gray-400" />
                                    )}
                                    <span className="font-medium text-sm">{doc.label}</span>
                                </div>
                                {doc.value.startsWith('http') ? (
                                    <a href={doc.value} target="_blank" rel="noopener noreferrer" className="text-[#14ad9f] hover:underline text-sm flex items-center gap-1">
                                        Anzeigen <FiExternalLink />
                                    </a>
                                ) : null}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
            <Card>
                <CardHeader>
                    <CardTitle>Alle Rohdaten</CardTitle>
                    <CardDescription>Vollständige Liste aller in der Datenbank gespeicherten Felder für diesen Benutzer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y divide-gray-200">
                        {Object.entries(otherData).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, value]) => (
                            <DataRow key={key} label={key} value={value} />
                        ))}
                    </dl>
                </CardContent>
            </Card>
        </div>
    );
}
