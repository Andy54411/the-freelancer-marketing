'use client';

import { useEffect, useState } from 'react';

export default function DebugCookiesPage() {
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    setCookies(document.cookie);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Debug Cookies</h1>
      <pre className="bg-gray-100 p-4 rounded">{cookies || 'No cookies found'}</pre>
    </div>
  );
}
