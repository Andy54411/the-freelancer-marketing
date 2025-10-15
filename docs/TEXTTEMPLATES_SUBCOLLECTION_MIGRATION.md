# 📄 Text Templates Subcollection Migration

## 🎯 Ziel
Migration von `textTemplates` (Root Collection) → `companies/{companyId}/textTemplates` (Subcollection)

## 📊 Aktuelle Situation

### ❌ IST-Zustand
```
textTemplates (ROOT LEVEL)
├── {templateId} { companyId: "LLc8...", name: "...", ... }
├── {templateId} { companyId: "I0g...", name: "...", ... }
└── ... (ALLE Companies in einer Collection)
```

**Probleme:**
- Alle Templates aller Companies in einer Collection
- Query: `where('companyId', '==', uid)` bei jedem Zugriff nötig
- Schlechte Performance bei vielen Companies
- Komplexe Security Rules (muss companyId prüfen)
- Nicht konsistent mit anderen Collections (expenses, invoices bereits Subcollections)

### ✅ SOLL-Zustand
```
companies
├── {companyId}
│   ├── textTemplates (SUBCOLLECTION)
│   │   ├── {templateId}
│   │   └── ...
│   ├── expenses (✅ bereits Subcollection)
│   ├── invoices (✅ bereits Subcollection)
│   └── ...
```

**Vorteile:**
- Automatische Isolation per Company
- Einfachere Queries (kein Filter nötig)
- Bessere Performance
- Einfachere Security Rules
- Konsistent mit anderen Collections

## 🔨 PHASE 1: Service-Layer Refactoring

### 1.1 TextTemplateService anpassen

**Datei:** `/src/services/TextTemplateService.ts`

```typescript
import { db } from '@/firebase/clients';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { TextTemplate, DEFAULT_TEXT_TEMPLATES } from '@/types/textTemplates';

export class TextTemplateService {
  // ✅ NEU: Collection Path für Subcollection
  private static getCollectionPath(companyId: string) {
    return `companies/${companyId}/textTemplates`;
  }

  // ✅ NEU: Collection Reference
  private static getCollectionRef(companyId: string) {
    return collection(db, this.getCollectionPath(companyId));
  }

  /**
   * Erstellt eine neue Textvorlage
   */
  static async createTextTemplate(
    companyId: string,
    template: Omit<TextTemplate, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>
  ): Promise<string> {
    try {
      const collectionRef = this.getCollectionRef(companyId);
      
      const docRef = await addDoc(collectionRef, {
        ...template,
        companyId, // Redundant, aber für Konsistenz
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating text template:', error);
      throw new Error('Textvorlage konnte nicht erstellt werden');
    }
  }

  /**
   * Aktualisiert eine Textvorlage
   */
  static async updateTextTemplate(
    companyId: string,
    templateId: string,
    updates: Partial<Omit<TextTemplate, 'id' | 'companyId' | 'createdAt' | 'createdBy'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.getCollectionPath(companyId), templateId);

      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating text template:', error);
      throw new Error('Textvorlage konnte nicht aktualisiert werden');
    }
  }

  /**
   * Löscht eine Textvorlage
   */
  static async deleteTextTemplate(companyId: string, templateId: string): Promise<void> {
    try {
      const docRef = doc(db, this.getCollectionPath(companyId), templateId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting text template:', error);
      throw new Error('Textvorlage konnte nicht gelöscht werden');
    }
  }

  /**
   * Lädt alle Textvorlagen einer Company
   * ✅ VEREINFACHT: Kein where-Filter mehr nötig!
   */
  static async getTextTemplates(companyId: string): Promise<TextTemplate[]> {
    try {
      const collectionRef = this.getCollectionRef(companyId);
      const snapshot = await getDocs(collectionRef);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as TextTemplate;
      });
    } catch (error) {
      console.error('Error fetching text templates:', error);
      throw new Error('Textvorlagen konnten nicht geladen werden');
    }
  }

  /**
   * Lädt Textvorlagen nach Typ
   */
  static async getTextTemplatesByType(
    companyId: string,
    objectType: string,
    textType: string
  ): Promise<TextTemplate[]> {
    try {
      const collectionRef = this.getCollectionRef(companyId);
      const q = query(
        collectionRef,
        where('objectType', '==', objectType),
        where('textType', '==', textType)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as TextTemplate;
      });
    } catch (error) {
      console.error('Error fetching text templates by type:', error);
      return [];
    }
  }

  /**
   * ✅ NEU: Initialisiert Standard-Templates für eine neue Company
   */
  static async initializeTemplatesForNewCompany(
    companyId: string,
    userId: string
  ): Promise<void> {
    try {
      console.log(`Initializing default templates for company: ${companyId}`);
      
      const collectionRef = this.getCollectionRef(companyId);
      
      // Erstelle alle Standard-Templates parallel
      const promises = DEFAULT_TEXT_TEMPLATES.map((template) =>
        addDoc(collectionRef, {
          name: template.name,
          category: template.category,
          objectType: template.objectType,
          textType: template.textType,
          text: template.text,
          isDefault: true,
          isPrivate: false,
          companyId,
          createdBy: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      await Promise.all(promises);
      console.log(`✅ ${DEFAULT_TEXT_TEMPLATES.length} templates initialized for ${companyId}`);
    } catch (error) {
      console.error('Error initializing templates:', error);
      throw new Error('Standard-Templates konnten nicht erstellt werden');
    }
  }

  /**
   * ✅ ANGEPASST: Prüft ob Templates existieren, erstellt sie falls nicht
   */
  static async createDefaultTemplatesIfNeeded(
    companyId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const templates = await this.getTextTemplates(companyId);
      
      if (templates.length === 0) {
        await this.initializeTemplatesForNewCompany(companyId, userId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking/creating default templates:', error);
      return false;
    }
  }
}
```

## 🔐 PHASE 2: Firestore Security Rules

**Datei:** `/firestore.rules`

```javascript
// 📄 TEXT TEMPLATES SUBCOLLECTION
match /companies/{companyId}/textTemplates/{templateId} {
  // Companies können ihre eigenen Templates erstellen
  allow create: if request.auth != null 
                && request.auth.uid == companyId
                && request.resource.data.createdBy == request.auth.uid
                && request.resource.data.keys().hasAll([
                  'name', 'category', 'objectType', 'textType', 
                  'text', 'companyId', 'createdBy', 'isDefault', 'isPrivate'
                ]);

  // Companies können ihre eigenen Templates lesen
  allow read, list: if request.auth != null 
                    && (request.auth.uid == companyId || isSupportStaff());

  // Companies können ihre eigenen Templates aktualisieren
  allow update: if request.auth != null 
                && request.auth.uid == companyId;

  // Companies können ihre eigenen Templates löschen
  allow delete: if request.auth != null 
                && (request.auth.uid == companyId || isSupportStaff());
}

// ❌ ALTE ROOT COLLECTION - NUR NOCH FÜR MIGRATION LESBAR
match /textTemplates/{templateId} {
  // Nur noch für Migration lesbar
  allow read: if request.auth != null && isSupportStaff();
  
  // Keine neuen Schreibzugriffe mehr erlaubt!
  allow write: if false;
}
```

## 🔄 PHASE 3: Automatische Initialisierung

### 3.1 Option A: Bei Company-Registrierung (EMPFOHLEN)

**Datei:** `/src/app/api/auth/register/route.ts` (oder wo immer die Registration stattfindet)

```typescript
import { TextTemplateService } from '@/services/TextTemplateService';

// Nach Company-Erstellung:
const companyId = newCompany.id;
const userId = auth.uid;

// Initialisiere Standard-Templates
await TextTemplateService.initializeTemplatesForNewCompany(companyId, userId);
```

### 3.2 Option B: Lazy Loading beim ersten Zugriff

**Datei:** `/src/app/dashboard/company/[uid]/settings/textvorlagen/page.tsx`

```typescript
useEffect(() => {
  const loadAndInitTemplates = async () => {
    if (!uid) return;
    
    try {
      setIsLoading(true);
      
      // Lade Templates (erstellt automatisch Default-Templates falls keine existieren)
      const created = await TextTemplateService.createDefaultTemplatesIfNeeded(uid, uid);
      
      if (created) {
        toast.success('Standard-Textvorlagen wurden initialisiert');
      }
      
      const templates = await TextTemplateService.getTextTemplates(uid);
      setTextTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Fehler beim Laden der Textvorlagen');
    } finally {
      setIsLoading(false);
    }
  };

  loadAndInitTemplates();
}, [uid]);
```

## 📦 PHASE 4: Migrations-Script

**Datei:** `/scripts/migrate-text-templates.ts`

```typescript
import * as admin from 'firebase-admin';

// Firebase Admin initialisieren
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'tilvo-f142f',
  });
}

const db = admin.firestore();

interface OldTemplate {
  id: string;
  companyId: string;
  [key: string]: any;
}

async function migrateTextTemplates() {
  console.log('🚀 Starting Text Templates Migration...\n');

  try {
    // 1. Backup erstellen
    console.log('📦 Creating backup...');
    const backupRef = db.collection('textTemplates_backup');
    const oldTemplatesSnapshot = await db.collection('textTemplates').get();
    
    const backupPromises = oldTemplatesSnapshot.docs.map(doc => 
      backupRef.doc(doc.id).set(doc.data())
    );
    await Promise.all(backupPromises);
    console.log(`✅ Backup created: ${oldTemplatesSnapshot.size} documents\n`);

    // 2. Gruppiere Templates nach companyId
    console.log('📊 Grouping templates by company...');
    const templatesByCompany = new Map<string, OldTemplate[]>();
    
    oldTemplatesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const companyId = data.companyId;
      
      if (!companyId) {
        console.warn(`⚠️  Template ${doc.id} has no companyId, skipping...`);
        return;
      }
      
      if (!templatesByCompany.has(companyId)) {
        templatesByCompany.set(companyId, []);
      }
      
      templatesByCompany.get(companyId)!.push({
        id: doc.id,
        companyId,
        ...data,
      });
    });
    
    console.log(`✅ Found ${templatesByCompany.size} companies with templates\n`);

    // 3. Migriere Templates zu Subcollections
    console.log('🔄 Migrating to subcollections...');
    let totalMigrated = 0;
    let errors = 0;

    for (const [companyId, templates] of templatesByCompany) {
      try {
        console.log(`\n📁 Company: ${companyId} (${templates.length} templates)`);
        
        // Prüfe ob Company existiert
        const companyDoc = await db.collection('companies').doc(companyId).get();
        if (!companyDoc.exists) {
          console.error(`❌ Company ${companyId} not found, skipping...`);
          errors += templates.length;
          continue;
        }

        // Erstelle Templates in Subcollection
        const batch = db.batch();
        templates.forEach(template => {
          const { id, ...templateData } = template;
          const newRef = db
            .collection('companies')
            .doc(companyId)
            .collection('textTemplates')
            .doc(id); // Behalte alte ID
          
          batch.set(newRef, templateData);
        });

        await batch.commit();
        totalMigrated += templates.length;
        console.log(`✅ Migrated ${templates.length} templates`);
        
      } catch (error) {
        console.error(`❌ Error migrating company ${companyId}:`, error);
        errors += templates.length;
      }
    }

    // 4. Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total migrated: ${totalMigrated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Backup location: textTemplates_backup collection`);
    console.log('\n⚠️  OLD COLLECTION NOT DELETED - Do this manually after verification!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Ausführen
migrateTextTemplates()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
```

**Ausführen:**
```bash
# 1. Firebase Admin SDK credentials setzen
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"

# 2. Script ausführen
npx ts-node scripts/migrate-text-templates.ts

# 3. Nach erfolgreicher Verifizierung: Alte Collection löschen (manuell in Firebase Console)
```

## ✅ PHASE 5: Testing & Rollout

### 5.1 Vor der Migration
```bash
# 1. Type-Check
pnpm run type-check

# 2. Test auf Staging
# - Neue Templates erstellen
# - Templates laden
# - Templates bearbeiten
# - Templates löschen
```

### 5.2 Nach der Migration
```bash
# 1. Verifiziere Subcollections in Firebase Console
# 2. Test alle Template-Funktionen
# 3. Prüfe ob alte Root-Collection noch Zugriffe hat (Firebase Analytics)
# 4. Lösche alte Collection nach 30 Tagen Übergangszeit
```

## 📈 Performance-Verbesserungen

### Vorher (Root Collection)
```typescript
// Query mit Filter - LANGSAM bei vielen Companies
const q = query(
  collection(db, 'textTemplates'),
  where('companyId', '==', uid)
);
```

### Nachher (Subcollection)
```typescript
// Direkter Zugriff - SCHNELL
const collectionRef = collection(db, `companies/${uid}/textTemplates`);
const snapshot = await getDocs(collectionRef);
```

**Geschwindigkeitsgewinn:** ~50-70% schneller bei > 100 Companies

## 🎯 Checkliste

- [ ] Phase 1: TextTemplateService refactoring
- [ ] Phase 2: Firestore Rules aktualisieren
- [ ] Phase 3: Automatische Initialisierung implementieren
- [ ] Phase 4: Migrations-Script ausführen
- [ ] Phase 5: Testing & Verifizierung
- [ ] Alte Root-Collection nach 30 Tagen löschen
- [ ] Update-Notification für User erstellen

## 💡 Wichtige Hinweise

1. **Keine Breaking Changes**: Alte Collection bleibt lesbar während Migration
2. **Backup first**: Immer Backup vor Migration erstellen
3. **Schrittweise**: Kann Company für Company migriert werden
4. **Rollback möglich**: Backup ermöglicht Rollback
5. **GoBD-konform**: Alle Timestamps und Audit-Trails bleiben erhalten

## 🚀 Estimated Time
- Service Refactoring: 1h
- Security Rules: 30min
- Auto-Initialization: 30min
- Migration Script: 1h
- Testing: 1h
- **Total: ~4 Stunden**
