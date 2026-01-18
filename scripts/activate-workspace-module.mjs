import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp({ projectId: 'tilvo-f142f' });
}

const db = getFirestore();
const companyId = 'E1bFqbyPGDRBXY3MVIyeANz1TCY2';

async function activateWorkspaceModule() {
  const companyRef = db.collection('companies').doc(companyId);
  const doc = await companyRef.get();
  
  if (!doc.exists) {
    console.log('Firma nicht gefunden!');
    return;
  }
  
  const data = doc.data();
  console.log('Aktuelle Module:', JSON.stringify(data.modules || {}, null, 2));
  console.log('Aktive Module:', JSON.stringify(data.activeModules || [], null, 2));
  
  // Workspace-Modul aktivieren
  await companyRef.update({
    'modules.workspace': true,
    'modules.projects': true,
    activeModules: FieldValue.arrayUnion('workspace', 'projects')
  });
  
  // Verifizieren
  const updated = await companyRef.get();
  console.log('\nAktualisierte Module:', JSON.stringify(updated.data().modules || {}, null, 2));
  console.log('Aktualisierte aktive Module:', JSON.stringify(updated.data().activeModules || [], null, 2));
  console.log('\n✅ Workspace & Projects-Modul erfolgreich aktiviert!');
}

activateWorkspaceModule().catch(console.error);
