/**
 * 📢 UPDATE NOTIFICATION CREATOR
 *
 * Erstellt eine Update-Notification für die Textvorlagen-Migration
 */

import * as admin from 'firebase-admin';

// Firebase Admin initialisieren
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'tilvo-f142f',
  });
}

const db = admin.firestore();

async function createUpdateNotification() {
  try {
    const updateData = {
      version: '2.7.0',
      title: 'Textvorlagen-System Optimierung',
      category: 'improvement',
      priority: 'medium',
      date: admin.firestore.Timestamp.now(),
      description:
        'Das Textvorlagen-System wurde grundlegend überarbeitet für bessere Performance und Datenisolation.',
      changes: [
        {
          type: 'improvement',
          title: 'Schnellere Textvorlagen',
          description:
            'Textvorlagen werden jetzt als Subcollections gespeichert, was zu deutlich schnelleren Ladezeiten führt.',
        },
        {
          type: 'improvement',
          title: 'Bessere Datenisolation',
          description:
            'Jedes Unternehmen hat nun seine eigenen Textvorlagen-Daten, was die Sicherheit erhöht.',
        },
        {
          type: 'improvement',
          title: 'Automatische Initialisierung',
          description:
            'Neue Unternehmen erhalten automatisch Standard-Textvorlagen beim ersten Login.',
        },
        {
          type: 'technical',
          title: 'Architektur-Verbesserung',
          description:
            'Migration von Root Collection zu Subcollections für konsistente Datenstruktur.',
        },
      ],
      impactedFeatures: [
        'Textvorlagen',
        'E-Mail Vorlagen',
        'Dokument-Templates',
        'Wiederkehrende Rechnungen',
      ],
      action: {
        required: false,
        type: 'none',
        description: 'Keine Aktion erforderlich - alle Daten wurden automatisch migriert.',
      },
      rollbackAvailable: true,
      testingCompleted: true,
      documentationUrl: '/docs/TEXTTEMPLATES_SUBCOLLECTION_MIGRATION.md',
      createdBy: 'andy.staudinger@taskilo.de',
      createdAt: admin.firestore.Timestamp.now(),
      publishedAt: admin.firestore.Timestamp.now(),
      status: 'published',
    };

    const docRef = await db.collection('updates').add(updateData);

    console.log('✅ Update-Notification erstellt!');
    console.log(`📋 ID: ${docRef.id}`);
    console.log(`📌 Version: ${updateData.version}`);
    console.log(`🎯 Titel: ${updateData.title}`);
    console.log('\n🔗 Notification kann hier eingesehen werden:');
    console.log(
      `https://console.firebase.google.com/project/tilvo-f142f/firestore/data/updates/${docRef.id}`
    );
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Update-Notification:', error);
    process.exit(1);
  }
}

createUpdateNotification()
  .then(() => {
    console.log('\n✅ Fertig!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });
