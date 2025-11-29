'use client';

import React from 'react';
import CampaignCreationForm from '@/components/taskilo-advertising/CampaignCreationForm';

interface CreateCampaignPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function CreateCampaignPage({ params }: CreateCampaignPageProps) {
  const { uid: companyId } = React.use(params);

  return <CampaignCreationForm companyId={companyId} />;
}
