'use client';

import React from 'react';
import GoogleAdsCampaignCreator from '../../../../../../../../components/taskilo-advertising/GoogleAdsCampaignCreator';

interface NewCampaignPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function NewCampaignPage({ params }: NewCampaignPageProps) {
  const { uid: companyId } = React.use(params);

  return <GoogleAdsCampaignCreator companyId={companyId} />;
}