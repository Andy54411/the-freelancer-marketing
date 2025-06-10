'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>404 – Seite nicht gefunden</h1>
      <p>Diese Seite existiert nicht.</p>
      <Link href="/">Zurück zur Startseite</Link>
    </div>
  );
}

