const fs = require('fs');
const filePath = './src/components/finance/SendDocumentModal.tsx';

// Lese die Datei
let content = fs.readFileSync(filePath, 'utf8');

// Suche nach der Stelle, wo wir die Verifikation hinzufügen möchten
const searchText = `        if (!invoiceId) {
          toast.error('Dokument muss zuerst gespeichert werden');
          setSending(false);
          return;
        }

        // Bestimme den Type-Parameter für die Print-Seite`;

const replacementText = `        if (!invoiceId) {
          toast.error('Dokument muss zuerst gespeichert werden');
          setSending(false);
          return;
        }

        // Verifiziere, dass das Dokument in Firestore existiert
        try {
          const { db } = await import('@/firebase/clients');
          const { doc, getDoc } = await import('firebase/firestore');
          
          let collectionName = 'invoices';
          if (documentType === 'quote') collectionName = 'quotes';
          if (documentType === 'reminder') collectionName = 'reminders';
          
          const docRef = doc(db, collectionName, invoiceId);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            console.error('❌ Dokument existiert nicht in Firestore:', collectionName, invoiceId);
            toast.error('Dokument wurde noch nicht gespeichert. Bitte speichern Sie es zuerst.');
            setSending(false);
            return;
          }
          
          console.log('✅ Dokument existiert in Firestore');
        } catch (verifyError) {
          console.error('❌ Fehler beim Verifizieren des Dokuments:', verifyError);
          toast.error('Fehler beim Überprüfen des Dokuments');
          setSending(false);
          return;
        }

        // Bestimme den Type-Parameter für die Print-Seite`;

// Ersetze den Text
if (content.includes(searchText)) {
  content = content.replace(searchText, replacementText);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Firestore-Verifikation erfolgreich hinzugefügt!');
} else {
  console.error('❌ Suchtext nicht gefunden. Die Datei wurde möglicherweise bereits geändert.');
  console.log('Suche nach: ', searchText.substring(0, 100) + '...');
}
