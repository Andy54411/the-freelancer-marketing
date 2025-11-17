'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, Trash2 } from 'lucide-react';
import { EmailConfig } from './types';

interface GmailConnectionCardProps {
  companyId: string;
  gmailConfig?: EmailConfig | any; // Support both old and new Gmail config structures
  onDelete: (configId: string) => void;
  onConnect: () => void;
}

export function GmailConnectionCard({ 
  companyId, 
  gmailConfig, 
  onDelete, 
  onConnect 
}: GmailConnectionCardProps) {
  if (gmailConfig) {
    // Verbundene Gmail-Card
    return (
      <Card className="border-2 border-green-500 bg-green-50">
        <CardContent className="p-8 text-center relative">
          {/* Trash Icon oben rechts */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(gmailConfig.id);
            }}
            size="sm"
            variant="outline"
            className="absolute top-4 right-4 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <div className="relative w-full h-48 mb-6">
            <img 
              src="/images/mail/vecteezy_gmail-icon-google-product-illustration_12871452.png"
              alt="Gmail Integration"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Gmail</h3>
          <p className="text-sm text-green-700 mb-2 font-semibold">{gmailConfig.email}</p>
          <Badge className="bg-green-100 text-green-800 mb-4">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verbunden
          </Badge>
          
          {gmailConfig.userInfo?.name && (
            <p className="text-xs text-gray-600 mt-2">
              {gmailConfig.userInfo.name}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Nicht verbundene Gmail-Card
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-[#14ad9f]"
      onClick={onConnect}
    >
      <CardContent className="p-8 text-center">
        <div className="relative w-full h-48 mb-6">
          <img 
            src="/images/mail/vecteezy_gmail-icon-google-product-illustration_12871452.png"
            alt="Gmail Integration"
            className="w-full h-full object-contain"
          />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Gmail</h3>
        <p className="text-gray-600 mb-4">Verbinden Sie Ihr Gmail-Konto direkt mit Taskilo</p>
        <Button 
          className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white"
        >
          <Mail className="h-4 w-4 mr-2" />
          Mit Gmail verbinden
        </Button>
      </CardContent>
    </Card>
  );
}