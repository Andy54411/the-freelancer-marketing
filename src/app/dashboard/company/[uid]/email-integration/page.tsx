'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { EmailPage } from '@/components/settings/email';

export default function CompanyEmailIntegrationPage() {
  const params = useParams();
  const companyId = params?.uid ? (Array.isArray(params.uid) ? params.uid[0] : params.uid) : '';

  return <EmailPage companyId={companyId} />;
}