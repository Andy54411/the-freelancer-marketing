'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FiRefreshCw, FiUser, FiDatabase, FiShield, FiCheck, FiX } from 'react-icons/fi';

interface DebugInfo {
  authContext: any;
  firebaseAuth: any;
  firestoreTest: any;
  customClaims: any;
}

export default function AuthDebugPage() {
  const { user, firebaseUser, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runDebugTests = async () => {
    setIsRefreshing(true);

    try {
      const info: DebugInfo = {
        authContext: {
          user: user,
          firebaseUser: firebaseUser
            ? {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
              }
            : null,
          loading: loading,
        },
        firebaseAuth: null,
        firestoreTest: {
          userDoc: null,
          companyDoc: null,
          errors: [],
        },
        customClaims: null,
      };

      // Test Firebase Auth directly
      if (auth.currentUser) {
        try {
          const idTokenResult = await auth.currentUser.getIdTokenResult(true);
          info.firebaseAuth = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            emailVerified: auth.currentUser.emailVerified,
            claims: idTokenResult.claims,
          };
          info.customClaims = idTokenResult.claims;
        } catch (error: any) {
          info.firebaseAuth = { error: error.message };
        }
      }

      // Test Firestore access
      if (auth.currentUser) {
        const uid = auth.currentUser.uid;

        // Test user document
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          info.firestoreTest.userDoc = {
            exists: userDocSnap.exists(),
            data: userDocSnap.exists() ? userDocSnap.data() : null,
          };
        } catch (error: any) {
          info.firestoreTest.errors.push(`User doc error: ${error.message}`);
          info.firestoreTest.userDoc = { error: error.message };
        }

        // Test company document
        try {
          const companyDocRef = doc(db, 'companies', uid);
          const companyDocSnap = await getDoc(companyDocRef);
          info.firestoreTest.companyDoc = {
            exists: companyDocSnap.exists(),
            data: companyDocSnap.exists() ? companyDocSnap.data() : null,
          };
        } catch (error: any) {
          info.firestoreTest.errors.push(`Company doc error: ${error.message}`);
          info.firestoreTest.companyDoc = { error: error.message };
        }
      }

      setDebugInfo(info);
    } catch (error: any) {
      setDebugInfo({
        authContext: { error: error.message },
        firebaseAuth: { error: error.message },
        firestoreTest: { error: error.message },
        customClaims: { error: error.message },
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    runDebugTests();
  }, [user, firebaseUser, loading]);

  const StatusIcon = ({ success }: { success: boolean }) =>
    success ? <FiCheck className="text-green-500" /> : <FiX className="text-red-500" />;

  const hasError = (obj: any): boolean => {
    return obj && typeof obj === 'object' && 'error' in obj;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Firebase Auth Debug</h1>
          <p className="text-gray-600 mt-1">
            Überprüfung der Firebase-Authentifizierung und -Berechtigungen
          </p>
        </div>
        <Button
          onClick={runDebugTests}
          disabled={isRefreshing}
          className="bg-[#14ad9f] hover:bg-[#129488]"
        >
          <FiRefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {debugInfo && (
        <div className="grid gap-6">
          {/* Auth Context Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiUser className="text-[#14ad9f]" />
                Auth Context Status
                <StatusIcon
                  success={!hasError(debugInfo.authContext) && !!debugInfo.authContext.user}
                />
              </CardTitle>
              <CardDescription>Status des React Auth Context</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(debugInfo.authContext, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Firebase Auth Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiShield className="text-[#14ad9f]" />
                Firebase Auth Status
                <StatusIcon
                  success={!hasError(debugInfo.firebaseAuth) && !!debugInfo.firebaseAuth?.uid}
                />
              </CardTitle>
              <CardDescription>Direkter Firebase Auth Status und Custom Claims</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(debugInfo.firebaseAuth, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Firestore Access Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiDatabase className="text-[#14ad9f]" />
                Firestore Access Test
                <StatusIcon success={debugInfo.firestoreTest.errors?.length === 0} />
              </CardTitle>
              <CardDescription>
                Test des Firestore-Zugriffs auf user und company Dokumente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo.firestoreTest.errors && debugInfo.firestoreTest.errors.length > 0 && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <FiX className="text-red-500" />
                  <AlertDescription>
                    <strong>Firestore Fehler:</strong>
                    <ul className="mt-2 list-disc list-inside">
                      {debugInfo.firestoreTest.errors.map((error, index) => (
                        <li key={index} className="text-red-700">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(debugInfo.firestoreTest, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Custom Claims */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiShield className="text-[#14ad9f]" />
                Custom Claims
                <StatusIcon
                  success={!hasError(debugInfo.customClaims) && !!debugInfo.customClaims}
                />
              </CardTitle>
              <CardDescription>
                Firebase Custom Claims für Rollenbasierte Berechtigungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(debugInfo.customClaims, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Fixes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#14ad9f]">Mögliche Lösungen</CardTitle>
          <CardDescription>Häufige Probleme und deren Behebung</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">1. Authentifizierung prüfen</h4>
            <p className="text-sm text-gray-600">
              Stellen Sie sicher, dass Sie eingeloggt sind und die Firebase Auth korrekt
              funktioniert.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">2. Firestore-Regeln überprüfen</h4>
            <p className="text-sm text-gray-600">
              Möglicherweise sind die Firestore-Sicherheitsregeln zu restriktiv für Ihren Benutzer.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">3. Custom Claims aktualisieren</h4>
            <p className="text-sm text-gray-600">
              Die Benutzerrolle (Custom Claims) muss möglicherweise vom Admin aktualisiert werden.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">4. Token erneuern</h4>
            <p className="text-sm text-gray-600">
              Versuchen Sie sich ab- und wieder anzumelden, um das Token zu erneuern.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
