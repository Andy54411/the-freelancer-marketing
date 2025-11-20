'use client';

import React from 'react';
import CampaignObjectiveSelector from '@/components/taskilo-advertising/CampaignObjectiveSelector';

interface CampaignObjectivesPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function CampaignObjectivesPage({ params }: CampaignObjectivesPageProps) {
  const { uid: companyId } = React.use(params);

  return <CampaignObjectiveSelector companyId={companyId} />;
}
