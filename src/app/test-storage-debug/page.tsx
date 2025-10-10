'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export default function StorageDebugPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching company data for:', companyId);
        const docRef = doc(db, 'companies', companyId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const docData = snapshot.data();
          console.log('Document data:', docData);
          setData(docData);
        } else {
          setError('Document does not exist');
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Storage Debug - Company {companyId}</h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Storage Limit</h2>
        <p className="font-mono text-sm">
          {data.storageLimit
            ? `${data.storageLimit} bytes (${(data.storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB)`
            : 'Not set'}
        </p>
      </div>

      {data.usage && (
        <div className="bg-green-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Usage Object</h2>
          <div className="space-y-2 font-mono text-sm">
            <p>
              <strong>storageUsed:</strong> {data.usage.storageUsed || 0} bytes (
              {((data.usage.storageUsed || 0) / 1024).toFixed(2)} KB)
            </p>
            <p>
              <strong>firestoreUsed:</strong> {data.usage.firestoreUsed || 0} bytes (
              {((data.usage.firestoreUsed || 0) / (1024 * 1024)).toFixed(2)} MB)
            </p>
            <p>
              <strong>totalUsed:</strong> {data.usage.totalUsed || 0} bytes (
              {((data.usage.totalUsed || 0) / (1024 * 1024)).toFixed(2)} MB)
            </p>
            {data.usage.stats && (
              <>
                <p>
                  <strong>totalFiles:</strong> {data.usage.stats.totalFiles}
                </p>
                <p>
                  <strong>totalDocuments:</strong> {data.usage.stats.totalDocuments}
                </p>
              </>
            )}
            {data.usage.lastUpdate && (
              <p>
                <strong>lastUpdate:</strong>{' '}
                {new Date(data.usage.lastUpdate.seconds * 1000).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {!data.usage && (
        <div className="bg-red-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3 text-red-700">⚠️ Usage Object Missing!</h2>
          <p className="text-red-600">
            Das <code>usage</code> Objekt existiert nicht im Firestore Document.
          </p>
        </div>
      )}

      {data.usage?.firestoreBreakdown && (
        <div className="bg-blue-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Firestore Breakdown</h2>
          <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
            {Object.entries(data.usage.firestoreBreakdown).map(
              ([collection, stats]: [string, any]) => (
                <p key={collection}>
                  <strong>{collection}:</strong> {stats.count} docs, {stats.size} bytes (
                  {(stats.size / 1024).toFixed(2)} KB)
                </p>
              )
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Raw Document Data</h2>
        <pre className="text-xs overflow-x-auto bg-white p-3 rounded border">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
