import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp({ projectId: 'tilvo-f142f' });
}

const db = getFirestore();
const companyId = 'E1bFqbyPGDRBXY3MVIyeANz1TCY2';

async function activateWorkspaceSubscription() {
  const now = new Date();
  const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  
  // Workspace Subscription erstellen
  const workspaceSubRef = db
    .collection('companies')
    .doc(companyId)
    .collection('module_subscriptions')
    .doc('workspace');
  
  const workspaceSubData = {
    moduleId: 'workspace',
    status: 'active',
    billingInterval: 'yearly',
    priceNet: 0, // Developer Account - kostenlos
    priceGross: 0,
    vatRate: 19,
    trialUsed: true, // Kein Trial nötig
    startDate: Timestamp.fromDate(now),
    currentPeriodStart: Timestamp.fromDate(now),
    currentPeriodEnd: Timestamp.fromDate(oneYearLater),
    nextBillingDate: Timestamp.fromDate(oneYearLater),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  
  await workspaceSubRef.set(workspaceSubData);
  console.log('✅ Workspace-Subscription erstellt');
  
  // Auch projects Subscription erstellen (falls separat benötigt)
  const projectsSubRef = db
    .collection('companies')
    .doc(companyId)
    .collection('module_subscriptions')
    .doc('projects');
  
  const projectsSubData = {
    ...workspaceSubData,
    moduleId: 'projects',
  };
  
  await projectsSubRef.set(projectsSubData);
  console.log('✅ Projects-Subscription erstellt');
  
  // Auch activeModules-Feld im Company-Dokument aktualisieren
  const companyRef = db.collection('companies').doc(companyId);
  await companyRef.update({
    'modules.workspace': true,
    'modules.projects': true,
    activeModules: FieldValue.arrayUnion('workspace', 'projects')
  });
  console.log('✅ Company-Dokument aktualisiert');
  
  // Verifizieren
  const workspaceDoc = await workspaceSubRef.get();
  const projectsDoc = await projectsSubRef.get();
  
  console.log('\nWorkspace Subscription:', workspaceDoc.exists ? 'Existiert' : 'FEHLT');
  console.log('Projects Subscription:', projectsDoc.exists ? 'Existiert' : 'FEHLT');
  console.log('\n✅ Alle Module erfolgreich aktiviert! Bitte Seite neu laden.');
}

activateWorkspaceSubscription().catch(console.error);
