// Campaign Basics Step Component
// Basic campaign information form

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CampaignBasicsProps {
  formData: {
    name: string;
    budgetAmount: number;
    advertisingChannelType: string;
    biddingStrategyType: string;
    startDate: string;
    endDate: string;
    finalUrl: string;
  };
  onUpdate: (field: string, value: any) => void;
}

export const CampaignBasics: React.FC<CampaignBasicsProps> = ({ formData, onUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Grundlegende Einstellungen */}
      <Card>
        <CardHeader>
          <CardTitle>Grundlegende Kampagnen-Informationen</CardTitle>
          <CardDescription>
            Definieren Sie die Basis-Parameter für Ihre neue Google Ads Kampagne.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Kampagnenname */}
          <div>
            <Label htmlFor="campaignName">Kampagnenname*</Label>
            <Input
              id="campaignName"
              type="text"
              placeholder="z.B. Sommer Promotion 2024"
              value={formData.name}
              onChange={e => onUpdate('name', e.target.value)}
            />
          </div>

          {/* Budget */}
          <div>
            <Label htmlFor="budget">Tagesbudget (€)*</Label>
            <Input
              id="budget"
              type="number"
              min="1"
              step="0.01"
              placeholder="50"
              value={formData.budgetAmount || ''}
              onChange={e => onUpdate('budgetAmount', parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Empfohlenes Minimum: 10€ pro Tag für optimale Performance
            </p>
          </div>

          {/* Ziel-URL */}
          <div>
            <Label htmlFor="finalUrl">Ziel-URL (Landing Page)*</Label>
            <Input
              id="finalUrl"
              type="url"
              placeholder="https://ihre-website.de/landingpage"
              value={formData.finalUrl}
              onChange={e => onUpdate('finalUrl', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Die URL, auf die Nutzer nach dem Klick auf Ihre Anzeige weitergeleitet werden
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Kampagnen-Typ und Bidding */}
      <Card>
        <CardHeader>
          <CardTitle>Kampagnen-Konfiguration</CardTitle>
          <CardDescription>
            Wählen Sie den Kampagnen-Typ und die Bidding-Strategie für optimale Ergebnisse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Kampagnen-Typ */}
          <div>
            <Label>Kampagnen-Typ*</Label>
            <Select
              value={formData.advertisingChannelType}
              onValueChange={value => onUpdate('advertisingChannelType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kampagnen-Typ auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEARCH">Such-Kampagne (Google Suche)</SelectItem>
                <SelectItem value="DISPLAY">Display-Kampagne (Banner-Anzeigen)</SelectItem>
                <SelectItem value="SHOPPING">Shopping-Kampagne (Produktanzeigen)</SelectItem>
                <SelectItem value="VIDEO">Video-Kampagne (YouTube)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Such-Kampagnen sind für die meisten Unternehmen der beste Startpunkt
            </p>
          </div>

          {/* Bidding-Strategie */}
          <div>
            <Label>Bidding-Strategie*</Label>
            <Select
              value={formData.biddingStrategyType}
              onValueChange={value => onUpdate('biddingStrategyType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bidding-Strategie auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL_CPC">Manueller CPC (Volle Kontrolle)</SelectItem>
                <SelectItem value="TARGET_CPA">Ziel-CPA (Automatisch optimiert)</SelectItem>
                <SelectItem value="TARGET_ROAS">Ziel-ROAS (Return on Ad Spend)</SelectItem>
                <SelectItem value="MAXIMIZE_CLICKS">Klicks maximieren</SelectItem>
                <SelectItem value="MAXIMIZE_CONVERSIONS">Conversions maximieren</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Manueller CPC ist empfohlen für neue Kampagnen, um Kontrolle zu behalten
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Zeitraum */}
      <Card>
        <CardHeader>
          <CardTitle>Kampagnen-Zeitraum</CardTitle>
          <CardDescription>
            Definieren Sie den Zeitraum, in dem Ihre Kampagne aktiv sein soll.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Startdatum</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={e => onUpdate('startDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">Enddatum (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={e => onUpdate('endDate', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Leer lassen für unbefristete Kampagne</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
