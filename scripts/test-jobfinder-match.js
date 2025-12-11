const admin = require('firebase-admin');
const serviceAccount = require('../firebase_functions/service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function testMatch() {
  // Hole den letzten Test-Job
  const jobsSnapshot = await db.collection('companies').doc('VP9BNVTey1WvdkMb0EPA3rdPq4t2').collection('jobs').orderBy('createdAt', 'desc').limit(1).get();
  
  if (jobsSnapshot.empty) {
    console.log('Keine Jobs gefunden');
    process.exit(1);
  }
  
  const jobDoc = jobsSnapshot.docs[0];
  const job = jobDoc.data();
  
  console.log('=== JOB DATA ===');
  console.log('Title:', job.title);
  console.log('Location:', job.location);
  console.log('Category:', job.category);
  console.log('Status:', job.status);
  
  // Hole Jobfinder
  const jfSnapshot = await db.collection('users').doc('VP9BNVTey1WvdkMb0EPA3rdPq4t2').collection('jobfinder').where('active', '==', true).get();
  
  console.log('\n=== MATCHING TEST ===');
  console.log('Gefundene aktive Jobfinder:', jfSnapshot.size);
  
  for (const jfDoc of jfSnapshot.docs) {
    const jf = jfDoc.data();
    console.log('\nJobfinder:', jfDoc.id);
    console.log('  Location:', jf.location);
    console.log('  searchPhrase:', jf.searchPhrase || '(leer)');
    console.log('  jobGroups:', jf.jobGroups);
    
    // Test matching
    let matches = true;
    let reason = 'Match';
    
    // Suchbegriff
    if (jf.searchPhrase && jf.searchPhrase.trim() !== '') {
      const term = jf.searchPhrase.toLowerCase();
      const titleMatch = (job.title || '').toLowerCase().includes(term);
      const descMatch = (job.description || '').toLowerCase().includes(term);
      if (!titleMatch && !descMatch) {
        matches = false;
        reason = 'searchPhrase nicht gefunden';
      }
    }
    
    // Standort  
    if (matches && jf.location && jf.location.trim() !== '' && job.location) {
      const jobLoc = (job.location || '').toLowerCase();
      const jfLoc = jf.location.toLowerCase();
      if (!jobLoc.includes(jfLoc) && !jfLoc.includes(jobLoc)) {
        matches = false;
        reason = 'Standort passt nicht: Job=' + job.location + ' vs JF=' + jf.location;
      }
    }
    
    console.log('  MATCH:', matches, '-', reason);
  }
  
  process.exit(0);
}
testMatch();
