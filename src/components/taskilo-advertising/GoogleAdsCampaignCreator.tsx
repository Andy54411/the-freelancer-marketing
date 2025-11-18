'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Eye, 
  ShoppingCart, 
  Video, 
  Target,
  Plus,
  X,
  Save,
  Send,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';

interface GoogleAdsCampaignCreatorProps {
  companyId: string;
}

interface CampaignData {
  name: string;
  type: 'SEARCH' | 'DISPLAY' | 'SHOPPING' | 'VIDEO' | 'PERFORMANCE_MAX';
  budget: {
    dailyBudget: number;
    currency: string;
  };
  biddingStrategy: {
    type: string;
    targetCpa?: number;
  };
  targeting: {
    locations: string[];
    languages: string[];
    keywords: string[];
    audiences: string[];
  };
  schedule: {
    startDate: string;
    endDate?: string;
    adSchedule: string[];
  };
  ads: Array<{
    headlines: string[];
    descriptions: string[];
    finalUrl: string;
  }>;
  status: 'ENABLED' | 'PAUSED';
}

const campaignTypes = [
  { value: 'SEARCH', label: 'Suchnetzwerk', icon: Search, color: 'text-blue-600' },
  { value: 'DISPLAY', label: 'Displaynetzwerk', icon: Eye, color: 'text-green-600' },
  { value: 'SHOPPING', label: 'Shopping', icon: ShoppingCart, color: 'text-orange-600' },
  { value: 'VIDEO', label: 'Video', icon: Video, color: 'text-red-600' },
  { value: 'PERFORMANCE_MAX', label: 'Performance Max', icon: Target, color: 'text-purple-600' },
];

export default function GoogleAdsCampaignCreator({ companyId }: GoogleAdsCampaignCreatorProps) {
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    type: 'SEARCH',
    budget: {
      dailyBudget: 10,
      currency: 'EUR',
    },
    biddingStrategy: {
      type: 'MANUAL_CPC',
    },
    targeting: {
      locations: ['Deutschland'],
      languages: ['Deutsch'],
      keywords: [],
      audiences: [],
    },
    schedule: {
      startDate: new Date().toISOString().split('T')[0],
      adSchedule: [],
    },
    ads: [{
      headlines: ['', '', ''],
      descriptions: ['', ''],
      finalUrl: '',
    }],
    status: 'ENABLED',
  });

  const [currentKeyword, setCurrentKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addKeyword = () => {
    if (currentKeyword.trim()) {
      setCampaignData(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting,
          keywords: [...prev.targeting.keywords, currentKeyword.trim()],
        },
      }));
      setCurrentKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setCampaignData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        keywords: prev.targeting.keywords.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/multi-platform-advertising/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...campaignData,
          companyId,
        }),
      });

      if (response.ok) {
        alert('Kampagne erfolgreich erstellt!');
        // Reset form oder navigate
      } else {
        const errorData = await response.json();
        alert(`Fehler: ${errorData.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Kampagne:', error);
      alert('Fehler beim Erstellen der Kampagne. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Ads Style Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-linear-to-br from-blue-500 via-green-500 to-yellow-500 rounded-sm"></div>
            <h1 className="text-2xl font-semibold text-gray-900">Neue Google Ads Kampagne</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded border">
              <CalendarDays className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">22. Okt bis 18. Nov 2025</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
            <Button variant="outline" size="sm">
              Letzte 30 Tage anzeigen
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-blue-700">
            Kampagnenstatus: Neu
          </div>
          <Input 
            placeholder="Filter hinzufügen"
            className="w-48 h-8"
          />
          <Button variant="outline" size="sm" className="h-8">
            <Save className="w-4 h-4 mr-1" />
            Als Vorlage speichern
          </Button>
        </div>
      </div>

      {/* Campaign Creation Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Campaign Type Selection */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Kampagnentyp auswählen</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaignTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-all ${
                        campaignData.type === type.value
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setCampaignData(prev => ({ ...prev, type: type.value as any }))}
                    >
                      <CardContent className="p-4 text-center">
                        <IconComponent className={`w-8 h-8 mx-auto mb-2 ${type.color}`} />
                        <h3 className="font-medium text-gray-900">{type.label}</h3>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Grundlagen</TabsTrigger>
                <TabsTrigger value="targeting">Zielgruppe</TabsTrigger>
                <TabsTrigger value="ads">Anzeigen</TabsTrigger>
                <TabsTrigger value="budget">Budget & Zeitplan</TabsTrigger>
              </TabsList>

              {/* Grundlagen Tab */}
              <TabsContent value="basic" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="campaignName" className="text-sm font-medium">
                      Kampagnenname *
                    </Label>
                    <Input
                      id="campaignName"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Meine Google Ads Kampagne"
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="biddingStrategy" className="text-sm font-medium">
                      Gebotstrategie
                    </Label>
                    <Select
                      value={campaignData.biddingStrategy.type}
                      onValueChange={(value) => setCampaignData(prev => ({
                        ...prev,
                        biddingStrategy: { ...prev.biddingStrategy, type: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANUAL_CPC">Manueller CPC</SelectItem>
                        <SelectItem value="TARGET_CPA">Ziel-CPA</SelectItem>
                        <SelectItem value="TARGET_ROAS">Ziel-ROAS</SelectItem>
                        <SelectItem value="MAXIMIZE_CLICKS">Klicks maximieren</SelectItem>
                        <SelectItem value="MAXIMIZE_CONVERSIONS">Conversions maximieren</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignStatus" className="text-sm font-medium">
                    Kampagnenstatus
                  </Label>
                  <Select
                    value={campaignData.status}
                    onValueChange={(value: 'ENABLED' | 'PAUSED') => setCampaignData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENABLED">Aktiviert</SelectItem>
                      <SelectItem value="PAUSED">Pausiert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Zielgruppe Tab */}
              <TabsContent value="targeting" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Standorte</h3>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Zielstandorte</Label>
                      <div className="flex flex-wrap gap-2">
                        {campaignData.targeting.locations.map((location, index) => (
                          <div key={index} className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-sm text-blue-700 flex items-center">
                            {location}
                            <X 
                              className="w-4 h-4 ml-2 cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                setCampaignData(prev => ({
                                  ...prev,
                                  targeting: {
                                    ...prev.targeting,
                                    locations: prev.targeting.locations.filter((_, i) => i !== index)
                                  }
                                }));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Sprachen</h3>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Zielsprachen</Label>
                      <div className="flex flex-wrap gap-2">
                        {campaignData.targeting.languages.map((language, index) => (
                          <div key={index} className="bg-green-50 border border-green-200 px-3 py-1 rounded-full text-sm text-green-700 flex items-center">
                            {language}
                            <X 
                              className="w-4 h-4 ml-2 cursor-pointer hover:text-green-900"
                              onClick={() => {
                                setCampaignData(prev => ({
                                  ...prev,
                                  targeting: {
                                    ...prev.targeting,
                                    languages: prev.targeting.languages.filter((_, i) => i !== index)
                                  }
                                }));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Keywords</h3>
                  <div className="flex space-x-2">
                    <Input
                      value={currentKeyword}
                      onChange={(e) => setCurrentKeyword(e.target.value)}
                      placeholder="Keyword hinzufügen"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      className="flex-1"
                    />
                    <Button type="button" onClick={addKeyword} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {campaignData.targeting.keywords.map((keyword, index) => (
                      <div key={index} className="bg-purple-50 border border-purple-200 px-3 py-1 rounded-full text-sm text-purple-700 flex items-center">
                        {keyword}
                        <X 
                          className="w-4 h-4 ml-2 cursor-pointer hover:text-purple-900"
                          onClick={() => removeKeyword(index)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Anzeigen Tab */}
              <TabsContent value="ads" className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Responsive Suchanzeige</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Anzeigentitel (bis zu 3)</Label>
                    {campaignData.ads[0].headlines.map((headline, index) => (
                      <Input
                        key={index}
                        value={headline}
                        onChange={(e) => {
                          const newAds = [...campaignData.ads];
                          newAds[0].headlines[index] = e.target.value;
                          setCampaignData(prev => ({ ...prev, ads: newAds }));
                        }}
                        placeholder={`Anzeigentitel ${index + 1}`}
                        maxLength={30}
                        className="w-full"
                      />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Beschreibungen (bis zu 2)</Label>
                    {campaignData.ads[0].descriptions.map((description, index) => (
                      <Textarea
                        key={index}
                        value={description}
                        onChange={(e) => {
                          const newAds = [...campaignData.ads];
                          newAds[0].descriptions[index] = e.target.value;
                          setCampaignData(prev => ({ ...prev, ads: newAds }));
                        }}
                        placeholder={`Beschreibung ${index + 1}`}
                        maxLength={90}
                        className="w-full"
                        rows={2}
                      />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Finale URL</Label>
                    <Input
                      value={campaignData.ads[0].finalUrl}
                      onChange={(e) => {
                        const newAds = [...campaignData.ads];
                        newAds[0].finalUrl = e.target.value;
                        setCampaignData(prev => ({ ...prev, ads: newAds }));
                      }}
                      placeholder="https://example.com"
                      type="url"
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Budget & Zeitplan Tab */}
              <TabsContent value="budget" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dailyBudget" className="text-sm font-medium">
                      Tagesbudget (EUR) *
                    </Label>
                    <Input
                      id="dailyBudget"
                      type="number"
                      value={campaignData.budget.dailyBudget}
                      onChange={(e) => setCampaignData(prev => ({
                        ...prev,
                        budget: { ...prev.budget, dailyBudget: Number(e.target.value) }
                      }))}
                      min="1"
                      step="0.01"
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-medium">
                      Startdatum *
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={campaignData.schedule.startDate}
                      onChange={(e) => setCampaignData(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, startDate: e.target.value }
                      }))}
                      className="w-full"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm font-medium">
                    Enddatum (optional)
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={campaignData.schedule.endDate || ''}
                    onChange={(e) => setCampaignData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, endDate: e.target.value || undefined }
                    }))}
                    className="w-full md:w-48"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Submit Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                type="button" 
                variant="outline"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
              
              <div className="flex space-x-3">
                <Button type="button" variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Als Entwurf speichern
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>Erstelle Kampagne...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Kampagne erstellen
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}