'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Eye, 
  ShoppingCart, 
  Video, 
  Target, 
  DollarSign, 
  Calendar,
  Plus,
  X,
  Save,
  Send
} from 'lucide-react';

interface CampaignCreationFormProps {
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
    targetRoas?: number;
  };
  targeting: {
    locations: string[];
    languages: string[];
    keywords: string[];
    demographics: {
      ageRanges: string[];
      genders: string[];
    };
  };
  ads: Array<{
    headlines: string[];
    descriptions: string[];
    finalUrl: string;
    displayUrl?: string;
  }>;
  schedule: {
    startDate: string;
    endDate?: string;
  };
}

const campaignTypes = [
  { value: 'SEARCH', label: 'Suchnetzwerk', icon: Search, description: 'Anzeigen in Google-Suchergebnissen' },
  { value: 'DISPLAY', label: 'Displaynetzwerk', icon: Eye, description: 'Banner auf Partner-Websites' },
  { value: 'SHOPPING', label: 'Shopping', icon: ShoppingCart, description: 'Produktanzeigen mit Bildern' },
  { value: 'VIDEO', label: 'Video', icon: Video, description: 'YouTube-Videoanzeigen' },
  { value: 'PERFORMANCE_MAX', label: 'Performance Max', icon: Target, description: 'Automatisierte Kampagne für alle Kanäle' },
];

const biddingStrategies = [
  { value: 'TARGET_CPA', label: 'Ziel-CPA', description: 'Optimierung auf Kosten pro Conversion' },
  { value: 'TARGET_ROAS', label: 'Ziel-ROAS', description: 'Optimierung auf Return on Ad Spend' },
  { value: 'MAXIMIZE_CLICKS', label: 'Klicks maximieren', description: 'Mehr Klicks im Budget' },
  { value: 'MAXIMIZE_CONVERSIONS', label: 'Conversions maximieren', description: 'Mehr Conversions im Budget' },
  { value: 'MANUAL_CPC', label: 'Manueller CPC', description: 'Manuelle Gebotskontrolle' },
];

export default function CampaignCreationForm({ companyId }: CampaignCreationFormProps) {
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    type: 'SEARCH',
    budget: {
      dailyBudget: 50,
      currency: 'EUR',
    },
    biddingStrategy: {
      type: 'MAXIMIZE_CLICKS',
    },
    targeting: {
      locations: ['Deutschland'],
      languages: ['Deutsch'],
      keywords: [],
      demographics: {
        ageRanges: [],
        genders: [],
      },
    },
    ads: [{
      headlines: ['', '', ''],
      descriptions: ['', ''],
      finalUrl: '',
    }],
    schedule: {
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState('');

  const addKeyword = () => {
    if (currentKeyword.trim() && !campaignData.targeting.keywords.includes(currentKeyword.trim())) {
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

  const removeKeyword = (keyword: string) => {
    setCampaignData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        keywords: prev.targeting.keywords.filter(k => k !== keyword),
      },
    }));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!campaignData.name.trim()) {
      alert('Bitte geben Sie einen Kampagnennamen ein.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/multi-platform-advertising/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          campaignData: {
            ...campaignData,
            status: isDraft ? 'DRAFT' : 'ENABLED',
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(isDraft ? 'Kampagne als Entwurf gespeichert!' : 'Kampagne erfolgreich erstellt und aktiviert!');
        // Redirect zur Kampagnen-Übersicht
        window.location.href = `/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns`;
      } else {
        alert(`Fehler: ${result.error}`);
      }
    } catch (error) {
      console.error('Campaign creation error:', error);
      alert('Fehler beim Erstellen der Kampagne. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCampaignType = campaignTypes.find(type => type.value === campaignData.type);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basics">Grundlagen</TabsTrigger>
          <TabsTrigger value="targeting">Zielgruppe</TabsTrigger>
          <TabsTrigger value="ads">Anzeigen</TabsTrigger>
          <TabsTrigger value="review">Überprüfung</TabsTrigger>
        </TabsList>

        {/* Tab 1: Grundlagen */}
        <TabsContent value="basics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kampagnen-Grundlagen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Kampagnenname */}
              <div className="space-y-2">
                <Label htmlFor="campaignName">Kampagnenname *</Label>
                <Input
                  id="campaignName"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Sommer Sale 2025"
                />
              </div>

              {/* Kampagnentyp */}
              <div className="space-y-3">
                <Label>Kampagnentyp *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {campaignTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          campaignData.type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCampaignData(prev => ({ ...prev, type: type.value as any }))}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${campaignData.type === type.value ? 'text-blue-600' : 'text-gray-500'}`} />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-gray-500">{type.description}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyBudget">Tägliches Budget (EUR) *</Label>
                  <Input
                    id="dailyBudget"
                    type="number"
                    min="1"
                    value={campaignData.budget.dailyBudget}
                    onChange={(e) => setCampaignData(prev => ({
                      ...prev,
                      budget: { ...prev.budget, dailyBudget: Number(e.target.value) }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="biddingStrategy">Gebotsstrategie *</Label>
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
                      {biddingStrategies.map((strategy) => (
                        <SelectItem key={strategy.value} value={strategy.value}>
                          <div>
                            <div className="font-medium">{strategy.label}</div>
                            <div className="text-sm text-gray-500">{strategy.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Laufzeit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Startdatum *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={campaignData.schedule.startDate}
                    onChange={(e) => setCampaignData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, startDate: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Enddatum (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={campaignData.schedule.endDate || ''}
                    onChange={(e) => setCampaignData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, endDate: e.target.value || undefined }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Zielgruppe */}
        <TabsContent value="targeting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zielgruppen-Einstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Keywords */}
              {campaignData.type === 'SEARCH' && (
                <div className="space-y-3">
                  <Label>Keywords</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={currentKeyword}
                      onChange={(e) => setCurrentKeyword(e.target.value)}
                      placeholder="Keyword eingeben"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    />
                    <Button type="button" onClick={addKeyword}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {campaignData.targeting.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {keyword}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => removeKeyword(keyword)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Standorte */}
              <div className="space-y-2">
                <Label>Zielstandorte</Label>
                <Input
                  value={campaignData.targeting.locations.join(', ')}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    targeting: {
                      ...prev.targeting,
                      locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  }))}
                  placeholder="Deutschland, Österreich, Schweiz"
                />
              </div>

              {/* Sprachen */}
              <div className="space-y-2">
                <Label>Zielsprachen</Label>
                <Input
                  value={campaignData.targeting.languages.join(', ')}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    targeting: {
                      ...prev.targeting,
                      languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  }))}
                  placeholder="Deutsch, Englisch"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Anzeigen */}
        <TabsContent value="ads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Anzeigenerstellung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {campaignData.ads.map((ad, adIndex) => (
                <div key={adIndex} className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Anzeige {adIndex + 1}</h4>
                  
                  {/* Headlines */}
                  <div className="space-y-2">
                    <Label>Anzeigentitel (mindestens 3)</Label>
                    {ad.headlines.map((headline, index) => (
                      <Input
                        key={index}
                        value={headline}
                        onChange={(e) => {
                          const newAds = [...campaignData.ads];
                          newAds[adIndex].headlines[index] = e.target.value;
                          setCampaignData(prev => ({ ...prev, ads: newAds }));
                        }}
                        placeholder={`Anzeigentitel ${index + 1} (max. 30 Zeichen)`}
                        maxLength={30}
                      />
                    ))}
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-2">
                    <Label>Beschreibungen (mindestens 2)</Label>
                    {ad.descriptions.map((description, index) => (
                      <Textarea
                        key={index}
                        value={description}
                        onChange={(e) => {
                          const newAds = [...campaignData.ads];
                          newAds[adIndex].descriptions[index] = e.target.value;
                          setCampaignData(prev => ({ ...prev, ads: newAds }));
                        }}
                        placeholder={`Beschreibung ${index + 1} (max. 90 Zeichen)`}
                        maxLength={90}
                        rows={2}
                      />
                    ))}
                  </div>

                  {/* Final URL */}
                  <div className="space-y-2">
                    <Label>Ziel-URL *</Label>
                    <Input
                      value={ad.finalUrl}
                      onChange={(e) => {
                        const newAds = [...campaignData.ads];
                        newAds[adIndex].finalUrl = e.target.value;
                        setCampaignData(prev => ({ ...prev, ads: newAds }));
                      }}
                      placeholder="https://ihre-website.de/landingpage"
                      type="url"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Überprüfung */}
        <TabsContent value="review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kampagnen-Übersicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Kampagnenname</Label>
                  <p className="font-medium">{campaignData.name || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Typ</Label>
                  <p className="font-medium">{selectedCampaignType?.label}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Tägliches Budget</Label>
                  <p className="font-medium">{campaignData.budget.dailyBudget} EUR</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Keywords</Label>
                  <p className="font-medium">{campaignData.targeting.keywords.length} Keywords</p>
                </div>
              </div>

              {campaignData.targeting.keywords.length > 0 && (
                <div>
                  <Label className="text-sm text-gray-600">Keyword-Liste</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {campaignData.targeting.keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => handleSubmit(true)}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Als Entwurf speichern
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !campaignData.name.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Wird erstellt...' : 'Kampagne starten'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}