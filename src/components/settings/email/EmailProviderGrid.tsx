'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Server } from 'lucide-react';
import { EmailConfig } from './types';
import { GmailConnectionCard } from './GmailConnectionCard';

interface EmailProviderGridProps {
  companyId: string;
  emailConfigs: EmailConfig[];
  onDeleteConfig: (configId: string) => void;
  onConnectGmail: () => void;
}

export function EmailProviderGrid({ 
  companyId, 
  emailConfigs, 
  onDeleteConfig, 
  onConnectGmail 
}: EmailProviderGridProps) {
  const gmailConfig = emailConfigs.find(c => c.provider === 'gmail' && (c.status === 'connected' || c.isActive));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Gmail Card */}
      <GmailConnectionCard
        companyId={companyId}
        gmailConfig={gmailConfig}
        onDelete={onDeleteConfig}
        onConnect={onConnectGmail}
      />

      {/* Outlook Card */}
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-[#14ad9f] opacity-50">
        <CardContent className="p-8 text-center">
          <div className="relative w-full h-48 mb-6 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="h-24 w-24 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Outlook</h3>
          <p className="text-gray-600 mb-4">Demnächst verfügbar</p>
          <Button 
            className="w-full" 
            variant="outline" 
            disabled
          >
            Bald verfügbar
          </Button>
        </CardContent>
      </Card>

      {/* Custom Email Card */}
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-[#14ad9f] opacity-50">
        <CardContent className="p-8 text-center">
          <div className="relative w-full h-48 mb-6 bg-gray-100 rounded-lg flex items-center justify-center">
            <Server className="h-24 w-24 text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Andere E-Mail</h3>
          <p className="text-gray-600 mb-4">SMTP/IMAP Konfiguration</p>
          <Button 
            className="w-full" 
            variant="outline" 
            disabled
          >
            Bald verfügbar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}