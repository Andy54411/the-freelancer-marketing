import { db, admin } from '@/firebase/server';
import { notFound } from 'next/navigation';
// HINZGEFÜGT: Deaktiviert das statische Caching für diese Route.
// Dies zwingt Next.js, die Seite bei jeder Anfrage neu zu erstellen und kann
// hartnäckige Caching-Probleme im Entwicklungsmodus umgehen.
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ActionButtons from './ActionButtons'; // Importieren der neuen Client-Komponente
import { FiFileText, FiExternalLink, FiImage } from 'react-icons/fi'; // Importiere Icons
import Image from 'next/image';

interface CompanyData {
    id: string;
    [key: string]: any;
}

async function getCompanyData(id: string): Promise<CompanyData | null> {
    const userDocRef = db.collection('users').doc(id);
    const companyDocRef = db.collection('companies').doc(id);

    const [userDoc, companyDoc] = await Promise.all([userDocRef.get(), companyDocRef.get()]);

    if (!userDoc.exists) {
        return null;
    }

    const userData = userDoc.data() || {};
    const companyData = companyDoc.exists ? companyDoc.data() : {};

    const combinedData: { [key: string]: any } = { ...companyData, ...userData, id: userDoc.id };

    // Sanitize data for serialization (convert Timestamps)
    const sanitizedData: { [key: string]: any } = {};
    for (const key in combinedData) {
        const value = combinedData[key];
        if (value instanceof admin.firestore.Timestamp) {
            sanitizedData[key] = value.toDate().toISOString();
        } else {
            sanitizedData[key] = value;
        }
    }

    return sanitizedData as CompanyData;
}

// Hilfskomponente zur Anzeige von Datenzeilen
const DataRow = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '') return null;
    const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    return (
        <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-words">{displayValue}</dd>
        </div>
    );
};

// Wir verwenden hier einen Inline-Typ für die Props, um einen hartnäckigen und ungewöhnlichen
// TypeScript-Build-Fehler zu umgehen. Dies vermeidet mögliche Konflikte mit global
// definierten oder abgeleiteten 'PageProps'-Typen von Next.js.
// KORREKTUR: Die 'params' müssen direkt aus den Props destrukturiert werden,
// um den "sync-dynamic-apis"-Fehler von Next.js zu vermeiden.
export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
    const { id } = params; // Die ID sofort extrahieren, um Caching-Probleme zu umgehen.
    const companyData = await getCompanyData(id);

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

    // Logik zur Trennung der Daten für die Anzeige
    // Diese erweiterte Logik findet Dokumente, auch wenn sie in verschachtelten Objekten (wie 'step3') liegen
    // oder unter verschiedenen Schlüsselnamen gespeichert sind. Die Quelle ist nun primär Firebase Storage.
    const documentKeyMap: { [key: string]: string } = {
        // Primäre Schlüssel (sollten Firebase Storage URLs sein)
        'profilePictureURL': 'Profilbild',
        'profilePictureFirebaseUrl': 'Profilbild',
        'step3.businessLicenseURL': 'Gewerbeschein',
        'step3.identityFrontUrl': 'Ausweis Vorderseite',
        'step3.identityBackUrl': 'Ausweis Rückseite',
        'step3.masterCraftsmanCertificateURL': 'Meisterbrief',
    };

    const documents: { key: string; label: string; value: string }[] = [];
    const foundDocumentKeys = new Set<string>();

    // Hilfsfunktion, um auf verschachtelte Werte zuzugreifen (z.B. "obj.step3.profilePictureURL")
    const getNestedValue = (obj: any, path: string): any => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    // Durchsuche die Daten nach allen bekannten Dokumentenschlüsseln
    for (const keyPath in documentKeyMap) {
        const value = getNestedValue(companyData, keyPath);
        if (value && typeof value === 'string' && !documents.some(doc => doc.value === value)) {
            documents.push({
                key: keyPath, // Eindeutiger Schlüssel für React
                label: documentKeyMap[keyPath],
                value: value,
            });
            // Füge den Top-Level-Schlüssel (z.B. 'step3' oder 'profilePictureURL') zu den auszublendenden Feldern hinzu
            foundDocumentKeys.add(keyPath.split('.')[0]);
        }
    }

    const displayedFields = new Set([
        'id', 'companyName', 'firmenname', 'firstName', 'lastName', 'email', 'status',
        ...foundDocumentKeys
    ]);

    const otherData = Object.fromEntries(
        Object.entries(companyData).filter(([key]) => !displayedFields.has(key))
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">
                                {companyData.companyName ||
                                    companyData.firmenname ||
                                    `${companyData.firstName} ${companyData.lastName}` ||
                                    'Unbenanntes Unternehmen'}
                            </CardTitle>
                            <CardDescription>Benutzer-ID: {id}</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(companyData.status)} className="capitalize">
                            {companyData.status || 'unbekannt'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DataRow label="E-Mail" value={companyData.email} />
                    <ActionButtons companyId={id} status={companyData.status} />
                </CardContent>
            </Card>

            {documents.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Dokumente</CardTitle>
                        <CardDescription>Gespeicherte Dokumente und Nachweise des Unternehmens.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        {documents.map(doc => (
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