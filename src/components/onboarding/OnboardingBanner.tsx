'use client';

import React from 'react';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface OnboardingBannerProps {
  companyUid: string;
  needsOnboarding: boolean;
  completionPercentage: number;
  currentStep: number;
  isLoading: boolean;
  error?: string;
}

/**
 * Banner component to show onboarding status and prompt completion
 * Displayed at the top of company dashboard for incomplete profiles
 */
const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
  companyUid,
  needsOnboarding,
  completionPercentage,
  currentStep,
  isLoading,
  error,
}) => {
  // Don't show banner if loading, no onboarding needed, or there's an error
  if (isLoading || !needsOnboarding || error) {
    return null;
  }

  // Show different states based on completion
  const getStatusBadge = () => {
    if (completionPercentage >= 80) {
      return <Badge className="bg-yellow-100 text-yellow-800">Fast fertig</Badge>;
    } else if (completionPercentage >= 50) {
      return <Badge className="bg-blue-100 text-blue-800">In Bearbeitung</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Unvollständig</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (completionPercentage >= 80) {
      return <CheckCircle className="h-5 w-5 text-yellow-600" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusMessage = () => {
    if (completionPercentage >= 80) {
      return 'Ihr Unternehmensprofil ist fast vollständig! Schließen Sie die letzten Schritte ab, um alle Funktionen freizuschalten.';
    } else if (completionPercentage >= 50) {
      return 'Sie haben bereits gute Fortschritte gemacht! Vervollständigen Sie Ihr Profil, um mehr Kunden zu erreichen.';
    } else {
      return 'Ihr Unternehmensprofil ist noch nicht vollständig. Vervollständigen Sie es, um alle Taskilo-Funktionen nutzen zu können.';
    }
  };

  return (
    <Card className="border-l-4 border-l-[#14ad9f] bg-linear-to-r from-[#14ad9f]/5 to-transparent mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg text-gray-900">
                Unternehmensprofil vervollständigen
              </CardTitle>
              <CardDescription className="mt-1">{getStatusMessage()}</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Fortschritt</span>
            <span className="font-medium text-gray-900">{completionPercentage}%</span>
          </div>
          <Progress
            value={completionPercentage}
            className="h-3"
            style={{
              background: '#f3f4f6',
            }}
          />
        </div>

        {/* Current Step Info */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Nächster Schritt:{' '}
            <span className="font-medium text-gray-900">Schritt {currentStep}</span>
          </div>

          <div className="flex gap-2">
            <Link href={`/dashboard/company/${companyUid}/onboarding/welcome`}>
              <Button variant="outline" size="sm">
                Übersicht
              </Button>
            </Link>
            <Link href={`/dashboard/company/${companyUid}/onboarding/step/${currentStep}`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white" size="sm">
                Weiter <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Additional Information */}
        {completionPercentage < 50 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-800 font-medium">Wichtiger Hinweis:</p>
                <p className="text-amber-700 mt-1">
                  Ein unvollständiges Profil reduziert Ihre Sichtbarkeit für potenzielle Kunden.
                  Vervollständigen Sie alle Schritte, um mehr Aufträge zu erhalten.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingBanner;
