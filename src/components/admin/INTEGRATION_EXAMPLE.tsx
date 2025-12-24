// Demo-Anfragen Integration - Beispiel für Admin Dashboard
// Füge diesen Code zu deiner Admin Dashboard Seite hinzu:

/*
In /src/app/dashboard/admin/page.tsx:

1. Import hinzufügen:
import { DemoRequestsCard } from '@/components/admin/demo-requests-card';

2. In die Komponenten-Liste einfügen (z.B. nach den statCards):
<DemoRequestsCard />
*/

// Beispiel für eine vollständige Integration:
export default function ExampleIntegration() {
  return (
    <div className="p-6 space-y-6">
      {/* Andere Dashboard-Komponenten ... */}
      
      {/* Demo-Anfragen Card */}
      <DemoRequestsCard />
      
      {/* Weitere Komponenten ... */}
    </div>
  );
}
