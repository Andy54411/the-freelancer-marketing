'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { EmailClient } from '@/components/email-client';

export default function CompanyEmailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params?.uid ? (Array.isArray(params.uid) ? params.uid[0] : params.uid) : '';
  const initialFolder = searchParams?.get('folder') || 'inbox';
  const shouldCompose = searchParams?.get('compose') === 'true';

  return (
    <div className="h-full w-full overflow-hidden">
      <EmailClient 
        companyId={companyId} 
        initialFolder={initialFolder}
        autoCompose={shouldCompose}
        className="h-full w-full"
      />
    </div>
  );
}