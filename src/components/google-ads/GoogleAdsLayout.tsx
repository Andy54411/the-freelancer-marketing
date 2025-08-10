// Google Ads Shared Layout Component
// Eliminates code duplication across all Google Ads pages

import React from 'react';
import { StatusMessages } from './StatusMessages';
import { useStatusMessages } from '@/hooks/useStatusMessages';

interface BadgeConfig {
  icon: React.ReactNode;
  text: string;
}

interface GoogleAdsLayoutProps {
  title: string;
  description: string;
  badge: BadgeConfig;
  children: React.ReactNode;
  showStatusMessages?: boolean;
}

export const GoogleAdsLayout: React.FC<GoogleAdsLayoutProps> = ({
  title,
  description,
  badge,
  children,
  showStatusMessages = true,
}) => {
  const statusMessages = useStatusMessages();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="mt-2 text-gray-600">{description}</p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Badge */}
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                {badge.icon}
                <span className="text-sm font-medium text-gray-700 ml-2">{badge.text}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {showStatusMessages && <StatusMessages {...statusMessages} />}

        {/* Main Content */}
        {children}
      </div>
    </div>
  );
};
