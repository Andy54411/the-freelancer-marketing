import Sidebar from './components/Sidebar';
import Header from './components/Header'; // NEU: Header-Komponente importieren

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Die Authentifizierung und Autorisierung wird jetzt vollständig vom client-seitigen
    // ProtectedRoute und dem AuthContext gehandhabt. Dieses Layout ist nur noch für
    // die visuelle Struktur (Sidebar + Hauptinhalt) zuständig.

    // Dieses Layout rendert die Sidebar und den Hauptinhalt für den Admin-Bereich.
    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <Sidebar />
            <div className="flex flex-col">
                <Header />
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}