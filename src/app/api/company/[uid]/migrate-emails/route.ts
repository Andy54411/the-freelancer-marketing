import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

// POST - Migriere E-Mails von emails zu emailCache Collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    console.log(`🔄 Starting email migration for company ${uid}`);
    
    await withFirebase(async () => {
      // Lade alle E-Mails aus der alten emails Collection
      const oldEmailsSnapshot = await db!
        .collection('companies')
        .doc(uid)
        .collection('emails')
        .get();

      if (oldEmailsSnapshot.empty) {
        console.log(`📭 No emails to migrate for company ${uid}`);
        return;
      }

      const emailCacheRef = db!.collection('companies')
        .doc(uid)
        .collection('emailCache');

      // Migriere in Batches von 50
      const emails = oldEmailsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const batchSize = 50;
      let migrated = 0;

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = db!.batch();
        const chunk = emails.slice(i, i + batchSize);

        chunk.forEach(email => {
          const docRef = emailCacheRef.doc(email.id);
          
          // Konvertiere alte Struktur zu neuer emailCache-Struktur
          const migratedEmail = {
            ...email,
            folder: email.folder ? {
              id: email.folder,
              name: getFolderName(email.folder),
              type: email.folder,
              count: 0,
              unreadCount: 0
            } : {
              id: 'inbox',
              name: 'Posteingang',
              type: 'inbox',
              count: 0,
              unreadCount: 0
            },
            source: 'migrated',
            migratedAt: new Date().toISOString()
          };

          batch.set(docRef, migratedEmail);
        });

        await batch.commit();
        migrated += chunk.length;
        console.log(`📦 Migrated batch: ${migrated}/${emails.length} emails`);
      }

      console.log(`✅ Migration completed: ${migrated} emails migrated to emailCache`);
    });

    return NextResponse.json({ 
      success: true,
      message: `Successfully migrated emails for company ${uid}`,
      migrated: true
    });
    
  } catch (error) {
    console.error('Email migration error:', error);
    return NextResponse.json(
      { error: 'Email migration failed', details: error.message },
      { status: 500 }
    );
  }
}

function getFolderName(folder: string): string {
  const folderNames: { [key: string]: string } = {
    'inbox': 'Posteingang',
    'sent': 'Gesendet',
    'drafts': 'Entwürfe',
    'spam': 'Spam',
    'trash': 'Papierkorb'
  };
  return folderNames[folder] || folder;
}