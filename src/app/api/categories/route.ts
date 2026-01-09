import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(): Promise<FirebaseFirestore.Firestore> {
  try {
    // Dynamically import Firebase services
    const firebaseModule = await import('@/firebase/server');

    // Check if we have valid db service
    if (!firebaseModule.db) {
      // Try to get from admin if needed
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getFirestore } = await import('firebase-admin/firestore');
        return getFirestore();
      }
      throw new Error('Firebase database unavailable');
    }

    return firebaseModule.db;
  } catch {
    throw new Error('Firebase database unavailable');
  }
}

// GET /api/categories - Hole alle Kategorien
export async function GET() {
  try {
    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    const categoriesSnapshot = await db.collection('categories').orderBy('createdAt', 'desc').get();

    interface CategoryData {
      id: string;
      name: string;
      categoryType: string;
      contact: string;
      color: string;
      abbreviation: string;
      categoryKind: string;
      createdAt: FirebaseFirestore.Timestamp;
      updatedAt: FirebaseFirestore.Timestamp;
    }

    const categories: CategoryData[] = [];

    categoriesSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const categoryData = doc.data();
      categories.push({
        id: doc.id,
        name: categoryData.name,
        categoryType: categoryData.categoryType,
        contact: categoryData.contact || '',
        color: categoryData.color || '#000000',
        abbreviation: categoryData.abbreviation || '',
        categoryKind: categoryData.categoryKind || 'Verkauf',
        createdAt: categoryData.createdAt,
        updatedAt: categoryData.updatedAt,
      });
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden der Kategorien' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Erstelle neue Kategorie
export async function POST(request: NextRequest) {
  try {
    const categoryData = await request.json();

    // Validierung
    if (!categoryData.name || !categoryData.categoryType) {
      return NextResponse.json(
        { success: false, error: 'Name und Kategorieart sind erforderlich' },
        { status: 400 }
      );
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Verwende FieldValue für server timestamps
    const { FieldValue } = await import('firebase-admin/firestore');

    const newCategoryData = {
      name: categoryData.name,
      categoryType: categoryData.categoryType,
      contact: categoryData.contact || '',
      color: categoryData.color || '#000000',
      abbreviation: categoryData.abbreviation || '',
      categoryKind: categoryData.categoryKind || 'Verkauf',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db!.collection('categories').add(newCategoryData);

    return NextResponse.json({
      success: true,
      categoryId: docRef.id,
      message: 'Kategorie erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Kategorie:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Erstellen der Kategorie' },
      { status: 500 }
    );
  }
}
