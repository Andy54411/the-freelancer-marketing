'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';
import { collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';

interface DebugPanelProps {
  uid: string;
  onTestComplete?: (success: boolean) => void;
}

export const FirestoreDebugPanel: React.FC<DebugPanelProps> = ({ uid, onTestComplete }) => {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFirestorePermissions = async () => {
    setTesting(true);
    setResults([]);

    try {
      addResult('🔍 Starte Firestore-Berechtigungstest...');

      // 1. User Authentication Test
      if (!user) {
        addResult('❌ Kein authentifizierter User gefunden');
        onTestComplete?.(false);
        return;
      }

      addResult(`✅ User authentifiziert: ${user.email} (${user.uid})`);

      // 2. UID Match Test
      if (user.uid !== uid) {
        addResult(`❌ UID-Mismatch: User ${user.uid} vs Company ${uid}`);
        onTestComplete?.(false);
        return;
      }

      addResult('✅ UID-Match bestätigt');

      // 3. Token Claims Test
      try {
        // Firebase Auth User direkt verwenden
        const firebaseAuth = (await import('firebase/auth')).getAuth();
        const firebaseUser = firebaseAuth.currentUser;

        if (firebaseUser) {
          const tokenResult = await firebaseUser.getIdTokenResult();
          addResult(`🔑 Token Claims: ${JSON.stringify(tokenResult.claims)}`);

          if (tokenResult.claims.role) {
            addResult(`✅ Role gefunden: ${tokenResult.claims.role}`);
          } else {
            addResult('⚠️ Kein role-Claim gefunden');
          }
        } else {
          addResult('⚠️ Firebase User nicht verfügbar für Token-Test');
        }
      } catch (tokenError) {
        addResult(`❌ Token-Fehler: ${tokenError.message}`);
      }

      // 4. Read Test - Invoices Collection
      try {
        addResult('🔍 Teste Invoices Collection Read...');
        const invoicesQuery = query(
          collection(db, 'invoices'),
          where('companyId', '==', uid),
          limit(5)
        );

        const querySnapshot = await getDocs(invoicesQuery);
        addResult(`✅ Read erfolgreich: ${querySnapshot.size} Rechnungen gefunden`);
      } catch (readError) {
        addResult(`❌ Read-Fehler: ${readError.code} - ${readError.message}`);
      }

      // 5. Write Test - Echte Erstellung
      try {
        addResult('🔍 Teste Write Permission mit echter Rechnung...');

        const testInvoice = {
          companyId: uid,
          createdBy: uid,
          customerName: 'Debug Test Kunde',
          customerEmail: 'debug@test.de',
          customerAddress: 'Test Straße 1\n12345 Test Stadt',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: 'Debug Test Rechnung',
          items: [
            {
              id: 'debug-1',
              description: 'Debug Test Position',
              quantity: 1,
              unitPrice: 1,
              total: 1,
            },
          ],
          amount: 1,
          tax: 0.19,
          total: 1.19,
          status: 'draft',
          template: 'modern',
          notes: 'Automatisch erstellte Debug-Rechnung',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const docRef = await addDoc(collection(db, 'invoices'), testInvoice);
        addResult(`✅ Write erfolgreich! Document ID: ${docRef.id}`);
        addResult('🎉 Alle Tests bestanden - Rechnungserstellung sollte funktionieren!');
        onTestComplete?.(true);
      } catch (writeError) {
        addResult(`❌ Write-Fehler: ${writeError.code} - ${writeError.message}`);

        if (writeError.code === 'permission-denied') {
          addResult('🔍 Permission Denied - prüfe Firestore Rules');
        } else if (writeError.code === 'unauthenticated') {
          addResult('🔍 Unauthenticated - Auth Problem');
        }

        onTestComplete?.(false);
      }
    } catch (error) {
      addResult(`❌ Allgemeiner Fehler: ${error.message}`);
      onTestComplete?.(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="mt-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-800">🔧 Firestore Debug Panel</CardTitle>
        <CardDescription className="text-yellow-700">
          Teste Firestore-Berechtigungen für Rechnungserstellung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={testFirestorePermissions}
          disabled={testing}
          variant="outline"
          className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
        >
          {testing ? 'Teste...' : 'Berechtigungen testen'}
        </Button>

        {results.length > 0 && (
          <div className="bg-white border border-yellow-200 rounded p-3 max-h-40 overflow-y-auto">
            <div className="font-mono text-xs space-y-1">
              {results.map((result, index) => (
                <div key={index} className="text-gray-700">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
