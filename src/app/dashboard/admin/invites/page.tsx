import { db } from '@/firebase/server';
import InviteManager from './InviteManager';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react'; // 'AlertTriangle' ist semantisch passender für Fehler

// Definieren eines Typs für unsere Einladungscode-Daten für bessere Typsicherheit
export interface InviteCode {
    id: string;
    code: string;
    role: 'support' | 'master';
    createdAt: Date;
}

interface FetchResult {
    codes: InviteCode[];
    error: string | null;
}

async function getUnusedInviteCodes(): Promise<FetchResult> {
    try {
        const snapshot = await db.collection('invite_codes')
            .where('used', '==', false)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            return { codes: [], error: null };
        }

        const codes = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                code: data.code,
                role: data.role,
                // Firestore Timestamps müssen für die Übergabe an Client-Komponenten serialisiert werden
                createdAt: data.createdAt.toDate(),
            };
        });
        return { codes, error: null };
    } catch (error: any) {
        console.error("Fehler beim Abrufen der Einladungscodes:", error);
        // Bei einem Fehler eine aussagekräftige Fehlermeldung zurückgeben
        return { codes: [], error: "Die Einladungscodes konnten nicht geladen werden. Bitte versuchen Sie es später erneut." };
    }
}

export default async function InvitesPage() {
    const { codes: unusedCodes, error } = await getUnusedInviteCodes();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Einladungscodes verwalten</CardTitle>
                    <CardDescription>
                        Erstelle neue Einladungscodes für Mitarbeiter oder sieh dir bestehende, unbenutzte Codes an.
                    </CardDescription>
                </CardHeader>
                {error && (
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Fehler</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </CardContent>
                )}
            </Card>
            <InviteManager initialCodes={unusedCodes} />
        </div>
    );
}