'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Placeholder component for template preview
export default function TemplatePreview({
  template,
  data,
  onSelect,
}: {
  template?: any;
  data?: any;
  onSelect?: () => void;
}) {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="text-center text-gray-500">Template Preview - Coming Soon</div>
      </CardContent>
    </Card>
  );
}
