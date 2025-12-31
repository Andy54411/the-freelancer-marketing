/**
 * Test-Skript für das Ranking-System
 * Zeigt alle Provider mit ihren berechneten Scores an
 * 
 * Ausführen: npx tsx scripts/test-ranking-system.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Firebase Admin initialisieren
if (getApps().length === 0) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
    || join(__dirname, '../firebase_functions/service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface ProviderRanking {
  id: string;
  companyName: string;
  subcategory: string;
  // Ranking-Komponenten
  seoScore: number;
  serviceRating: number;
  serviceReviewCount: number;
  companyRating: number;
  companyReviewCount: number;
  // Gesamt-Score
  totalScore: number;
  // Details
  hasProfileTitle: boolean;
  profileTitleLength: number;
  descriptionLength: number;
  searchTagsCount: number;
  skillsCount: number;
  hasProfilePicture: boolean;
  isVerified: boolean;
  hasLocation: boolean;
}

async function testRankingSystem() {
  console.log('\n========================================');
  console.log('  TASKILO RANKING SYSTEM TEST');
  console.log('========================================\n');

  try {
    // Lade alle Companies
    const companiesSnapshot = await db.collection('companies').get();
    
    console.log(`Gefundene Companies: ${companiesSnapshot.size}\n`);

    const rankings: ProviderRanking[] = [];

    for (const doc of companiesSnapshot.docs) {
      const data = doc.data();
      
      // Berechne internen SEO-Score
      let seoScore = 0;
      
      // Profil-Titel (15 Punkte)
      const profileTitle = data.profileTitle || '';
      const profileTitleLength = profileTitle.length;
      if (profileTitleLength >= 30) seoScore += 15;
      else if (profileTitleLength >= 20) seoScore += 10;
      else if (profileTitleLength > 0) seoScore += 5;
      
      // Beschreibung (20 Punkte)
      const description = data.description || data.bio || '';
      const descLength = description.replace(/<[^>]*>/g, '').length;
      if (descLength >= 500) seoScore += 20;
      else if (descLength >= 200) seoScore += 15;
      else if (descLength >= 100) seoScore += 10;
      else if (descLength > 0) seoScore += 5;
      
      // Such-Tags (15 Punkte)
      const searchTags = data.searchTags || [];
      seoScore += Math.min(15, searchTags.length * 3);
      
      // Skills (15 Punkte)
      const skills = data.skills || data.step3?.skills || [];
      if (skills.length >= 5) seoScore += 15;
      else if (skills.length >= 3) seoScore += 10;
      else if (skills.length > 0) seoScore += 5;
      
      // Profilbild (10 Punkte)
      const hasProfilePicture = !!(data.step3?.profilePictureURL || data.profilePictureURL);
      if (hasProfilePicture) seoScore += 10;
      
      // Verifiziert (15 Punkte)
      const isVerified = data.adminApproved === true;
      if (isVerified) seoScore += 15;
      
      // Standort (10 Punkte)
      const hasLocation = !!(data.location || data.city || data.companyCity);
      if (hasLocation) seoScore += 10;

      // Lade Service-Reviews (aus companies/{id}/reviews)
      let serviceRating = 0;
      let serviceReviewCount = 0;
      
      try {
        const reviewsSnapshot = await db.collection(`companies/${doc.id}/reviews`).get();
        serviceReviewCount = reviewsSnapshot.size;
        
        if (serviceReviewCount > 0) {
          let totalRating = 0;
          reviewsSnapshot.forEach(reviewDoc => {
            totalRating += reviewDoc.data().rating || 0;
          });
          serviceRating = totalRating / serviceReviewCount;
        }
      } catch {
        // Keine Reviews
      }

      // Lade Firmenbewertungen (aus companyReviews Collection)
      let companyRating = 0;
      let companyReviewCount = 0;
      
      try {
        const companyReviewsSnapshot = await db.collection('companyReviews')
          .where('providerId', '==', doc.id)
          .get();
        companyReviewCount = companyReviewsSnapshot.size;
        
        if (companyReviewCount > 0) {
          let totalRating = 0;
          companyReviewsSnapshot.forEach(reviewDoc => {
            totalRating += reviewDoc.data().averageRating || 0;
          });
          companyRating = totalRating / companyReviewCount;
        }
      } catch {
        // Keine Firmenbewertungen
      }

      // Berechne Gesamt-Score mit 4 Komponenten
      // Formel: (SEO * 0.25) + (ServiceRating * 20 * 0.35) + (CompanyRating * 20 * 0.25) + (TotalReviews * 1.5 * 0.15)
      const totalReviews = serviceReviewCount + companyReviewCount;
      const totalScore = 
        (seoScore * 0.25) + 
        ((serviceRating * 20) * 0.35) + 
        ((companyRating * 20) * 0.25) + 
        (Math.min(totalReviews * 1.5, 30) * 0.15);

      rankings.push({
        id: doc.id,
        companyName: data.companyName || 'Unbekannt',
        subcategory: data.selectedSubcategory || 'Keine',
        seoScore,
        serviceRating: parseFloat(serviceRating.toFixed(2)),
        serviceReviewCount,
        companyRating: parseFloat(companyRating.toFixed(2)),
        companyReviewCount,
        totalScore: parseFloat(totalScore.toFixed(2)),
        hasProfileTitle: profileTitleLength > 0,
        profileTitleLength,
        descriptionLength: descLength,
        searchTagsCount: searchTags.length,
        skillsCount: skills.length,
        hasProfilePicture,
        isVerified,
        hasLocation,
      });
    }

    // Sortiere nach Gesamt-Score
    rankings.sort((a, b) => b.totalScore - a.totalScore);

    // Ausgabe
    console.log('RANKING (sortiert nach Gesamt-Score):\n');
    console.log('='.repeat(140));
    console.log(
      'Rang'.padEnd(6) +
      'Firma'.padEnd(25) +
      'Subcategory'.padEnd(20) +
      'SEO'.padEnd(6) +
      'Serv.Rat'.padEnd(10) +
      'Serv.Rev'.padEnd(10) +
      'Firm.Rat'.padEnd(10) +
      'Firm.Rev'.padEnd(10) +
      'TOTAL'.padEnd(8) +
      'Details'
    );
    console.log('='.repeat(140));

    rankings.forEach((r, index) => {
      const details = [
        r.hasProfileTitle ? `Titel(${r.profileTitleLength})` : 'Kein Titel',
        `Tags(${r.searchTagsCount}/5)`,
        r.isVerified ? 'Verifiziert' : 'Nicht verif.',
      ].join(' | ');

      console.log(
        `#${(index + 1).toString()}`.padEnd(6) +
        r.companyName.substring(0, 23).padEnd(25) +
        r.subcategory.substring(0, 18).padEnd(20) +
        r.seoScore.toString().padEnd(6) +
        r.serviceRating.toFixed(1).padEnd(10) +
        r.serviceReviewCount.toString().padEnd(10) +
        r.companyRating.toFixed(1).padEnd(10) +
        r.companyReviewCount.toString().padEnd(10) +
        r.totalScore.toFixed(1).padEnd(8) +
        details
      );
    });

    console.log('='.repeat(140));
    console.log('\n');

    // Statistiken
    console.log('STATISTIKEN:');
    console.log('-'.repeat(50));
    console.log(`Gesamt Companies: ${rankings.length}`);
    console.log(`Mit Profil-Titel: ${rankings.filter(r => r.hasProfileTitle).length}`);
    console.log(`Mit Such-Tags: ${rankings.filter(r => r.searchTagsCount > 0).length}`);
    console.log(`Verifiziert: ${rankings.filter(r => r.isVerified).length}`);
    console.log(`Mit Service-Bewertungen: ${rankings.filter(r => r.serviceReviewCount > 0).length}`);
    console.log(`Mit Firmenbewertungen: ${rankings.filter(r => r.companyReviewCount > 0).length}`);
    console.log(`Durchschnittlicher SEO-Score: ${(rankings.reduce((sum, r) => sum + r.seoScore, 0) / rankings.length).toFixed(1)}`);
    console.log(`Durchschnittlicher Gesamt-Score: ${(rankings.reduce((sum, r) => sum + r.totalScore, 0) / rankings.length).toFixed(1)}`);

    // Score-Formel erklären
    console.log('\n');
    console.log('RANKING-FORMEL (4 Komponenten):');
    console.log('-'.repeat(60));
    console.log('Gesamt-Score = (SEO × 0.25) + (ServiceRating × 20 × 0.35) + (FirmRating × 20 × 0.25) + (TotalReviews × 1.5 × 0.15)');
    console.log('\nGewichtung:');
    console.log('  - SEO-Score:           25% (Profil-Qualität)');
    console.log('  - Service-Bewertungen: 35% (Kundenbewertungen nach Aufträgen)');
    console.log('  - Firmenbewertungen:   25% (Allgemeine Unternehmensbewertungen)');
    console.log('  - Review-Anzahl:       15% (Anzahl aller Bewertungen)');
    console.log('\nSEO-Score Zusammensetzung (max 100):');
    console.log('  - Profil-Titel: bis zu 15 Punkte (30+ Zeichen = 15, 20+ = 10, >0 = 5)');
    console.log('  - Beschreibung: bis zu 20 Punkte (500+ Zeichen = 20, 200+ = 15, 100+ = 10, >0 = 5)');
    console.log('  - Such-Tags: bis zu 15 Punkte (3 Punkte pro Tag, max 5 Tags)');
    console.log('  - Skills: bis zu 15 Punkte (5+ Skills = 15, 3+ = 10, >0 = 5)');
    console.log('  - Profilbild: 10 Punkte');
    console.log('  - Verifiziert: 15 Punkte');
    console.log('  - Standort: 10 Punkte');
    console.log('\n');

  } catch (error) {
    console.error('Fehler:', error);
  }

  process.exit(0);
}

testRankingSystem();
