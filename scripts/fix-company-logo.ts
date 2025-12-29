// Fixes das fehlende Logo in der Datenbank
import { db, storage } from '../src/firebase/server';

async function fixCompanyLogo() {
  const companyId = 'zIRo29svEPOorsD5XT05d888AxV2';
  const logoPath = 'companies/zIRo29svEPOorsD5XT05d888AxV2/branding/1766972204556-5gph5q.jpg';
  
  console.log('Generiere Signed URL für Logo...');
  
  const bucket = storage!.bucket();
  const file = bucket.file(logoPath);
  
  // Generiere eine signierte URL (gültig für 7 Tage)
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 Tage
  });
  
  console.log('Signed URL:', signedUrl);
  
  // Update das Company-Dokument mit der Logo-URL
  console.log('\nUpdate Company-Dokument...');
  await db!.collection('companies').doc(companyId).update({
    profilePictureURL: signedUrl,
    logoUrl: signedUrl,
  });
  
  console.log('FERTIG! Logo-URL wurde in Datenbank gespeichert.');
  console.log('Bitte lade die Seite neu um das Logo zu sehen.');
  
  process.exit(0);
}

fixCompanyLogo().catch(e => { console.error(e); process.exit(1); });
