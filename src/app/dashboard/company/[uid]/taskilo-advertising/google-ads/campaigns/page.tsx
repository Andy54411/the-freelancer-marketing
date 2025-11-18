'use client';

import React from 'react';
import CampaignsOverview from '@/components/taskilo-advertising/CampaignsOverview';

interface CampaignsPageProps {
  params: Promise<{ uid: string }>;
}

export default function CampaignsPage({ params }: CampaignsPageProps) {
  const { uid } = React.use(params);

  return <CampaignsOverview companyId={uid} />;
}