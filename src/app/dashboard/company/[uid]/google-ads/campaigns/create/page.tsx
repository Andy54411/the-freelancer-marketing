'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Plus, Trash2, Save, TestTube, AlertTriangle, Info } from 'lucide-react';

interface AdGroup {
  id: string;
  name: string;
  cpcBidMicros: number;
  keywords: Array<{
    text: string;
    matchType: string;
  }>;
  ads: Array<{
    id: string;
    headlines: string[];
    descriptions: string[];
    finalUrls: string[];
  }>;
}

interface CampaignFormData {
  name: string;
  budgetAmount: number;
  advertisingChannelType: string;
  biddingStrategyType: string;
  startDate: string;
  endDate: string;
  finalUrl: string;
  adGroups: AdGroup[];
}

interface GoogleAdsStatus {
  connected: boolean;
  accounts: Array<{
    id: string;
    name: string;
    testAccount: boolean;
    status: string;
  }>;
  tokenStatus: {
    hasRefreshToken: boolean;
    isExpired: boolean;
  };
}

export default function CreateCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.uid as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleAdsStatus, setGoogleAdsStatus] = useState<GoogleAdsStatus | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    budgetAmount: 50,
    advertisingChannelType: 'SEARCH',
    biddingStrategyType: 'MANUAL_CPC',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    finalUrl: '',
    adGroups: [
      {
        id: '1',
        name: 'Anzeigengruppe 1',
        cpcBidMicros: 1000000, // 1€
        keywords: [],
        ads: [
          {
            id: '1',
            headlines: ['', '', ''],
            descriptions: ['', ''],
            finalUrls: [''],
          },
        ],
      },
    ],
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordMatch, setNewKeywordMatch] = useState('BROAD');

  // Load Google Ads status on component mount
  useEffect(() => {
    const loadGoogleAdsStatus = async () => {
      try {
        const response = await fetch(`/api/google-ads/status?companyId=${companyId}`);
        const data = await response.json();

        if (data.success !== false) {
          setGoogleAdsStatus(data);

          // Check if any account is a test account
          const hasTestAccounts = data.accounts?.some((acc: any) => acc.testAccount === true);
          const hasProductionAccounts = data.accounts?.some(
            (acc: any) => acc.testAccount === false
          );

          // If only test accounts or mixed, enable test mode
          setIsTestMode(hasTestAccounts && !hasProductionAccounts);

          console.log('🎯 Google Ads Status:', {
            connected: data.connected,
            accounts: data.accounts?.length || 0,
            hasTestAccounts,
            hasProductionAccounts,
            testModeEnabled: hasTestAccounts && !hasProductionAccounts,
          });
        }
      } catch (error) {
        console.error('Failed to load Google Ads status:', error);
      }
    };

    loadGoogleAdsStatus();
  }, [companyId]);

  // Keyword-Management
  const addKeyword = (adGroupId: string) => {
    if (!newKeyword.trim()) return;

    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag =>
        ag.id === adGroupId
          ? {
              ...ag,
              keywords: [...ag.keywords, { text: newKeyword.trim(), matchType: newKeywordMatch }],
            }
          : ag
      ),
    }));

    setNewKeyword('');
  };

  const removeKeyword = (adGroupId: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag =>
        ag.id === adGroupId ? { ...ag, keywords: ag.keywords.filter((_, i) => i !== index) } : ag
      ),
    }));
  };

  // Anzeigengruppen-Management
  const addAdGroup = () => {
    const newId = (formData.adGroups.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      adGroups: [
        ...prev.adGroups,
        {
          id: newId,
          name: `Anzeigengruppe ${newId}`,
          cpcBidMicros: 1000000,
          keywords: [],
          ads: [
            {
              id: '1',
              headlines: ['', '', ''],
              descriptions: ['', ''],
              finalUrls: [''],
            },
          ],
        },
      ],
    }));
  };

  const updateAdGroup = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag => (ag.id === id ? { ...ag, [field]: value } : ag)),
    }));
  };

  const updateAd = (adGroupId: string, adId: string, field: string, value: any, index?: number) => {
    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag =>
        ag.id === adGroupId
          ? {
              ...ag,
              ads: ag.ads.map(ad =>
                ad.id === adId
                  ? {
                      ...ad,
                      [field]:
                        index !== undefined
                          ? (ad[field as keyof typeof ad] as string[]).map(
                              (item: string, i: number) => (i === index ? value : item)
                            )
                          : [value],
                    }
                  : ad
              ),
            }
          : ag
      ),
    }));
  };

  const handleCreateCampaign = async () => {
    try {
      setCreating(true);
      setError(null);

      // Validierung
      if (!formData.name.trim()) {
        throw new Error('Kampagnenname ist erforderlich');
      }

      if (!formData.finalUrl.trim()) {
        throw new Error('Ziel-URL ist erforderlich');
      }

      if (formData.adGroups.length === 0) {
        throw new Error('Mindestens eine Anzeigengruppe ist erforderlich');
      }

      // Test Account Warning
      if (!isTestMode && googleAdsStatus?.accounts?.some(acc => !acc.testAccount)) {
        const confirmProduction = window.confirm(
          '⚠️ WARNUNG: Sie verwenden Produktionskonten!\n\n' +
            'Ihr Google Ads Developer Token ist nur für Testkonten zugelassen.\n' +
            'Die Kampagne wird wahrscheinlich fehlschlagen.\n\n' +
            'Möchten Sie trotzdem fortfahren?'
        );

        if (!confirmProduction) {
          setCreating(false);
          return;
        }
      }

      const requestData = {
        companyId,
        testMode: isTestMode,
        campaignData: {
          name: `${isTestMode ? '[TEST] ' : ''}${formData.name}`,
          budgetAmountMicros: formData.budgetAmount * 1000000,
          advertisingChannelType: formData.advertisingChannelType,
          biddingStrategyType: formData.biddingStrategyType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          adGroups: formData.adGroups.map(ag => ({
            name: ag.name,
            cpcBidMicros: ag.cpcBidMicros,
            keywords: ag.keywords,
            ads: ag.ads.map(ad => ({
              headlines: ad.headlines,
              descriptions: ad.descriptions,
              finalUrls: ad.finalUrls,
            })),
          })),
        },
      };

      console.log('🚀 Creating campaign:', { isTestMode, data: requestData });

      const response = await fetch('/api/google-ads/campaigns/create-comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kampagne konnte nicht erstellt werden');
      }

      const result = await response.json();

      if (result.success) {
        router.push(`/dashboard/company/${companyId}/google-ads/campaigns`);
      }
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Neue Google Ads Kampagne erstellen</h1>
          <p className="text-gray-600">
            Erstellen Sie eine vollständige Kampagne mit Anzeigengruppen, Keywords und Anzeigen
          </p>
        </div>
      </div>

      {/* Test Account Detection */}
      {googleAdsStatus && (
        <div className="mb-6">
          {isTestMode ? (
            <Alert className="border-blue-200 bg-blue-50">
              <TestTube className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Test Modus aktiv</AlertTitle>
              <AlertDescription className="text-blue-700">
                Diese Kampagne wird in Ihren Test Accounts erstellt. Keine echten Kosten entstehen.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Developer Token Limitation</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Ihr Google Ads Developer Token ist nur für Test Accounts zugelassen. Campaign
                Creation in Produktions-Accounts wird fehlschlagen.
                <br />
                <strong>Empfehlung:</strong> Beantragen Sie Basic Access für echte Kampagnen.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Google Ads Account Status */}
      {googleAdsStatus?.accounts && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Verbundene Google Ads Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {googleAdsStatus.accounts.map(account => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <span className="font-medium">{account.name || `Account ${account.id}`}</span>
                    <span className="text-sm text-gray-500 ml-2">ID: {account.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={account.testAccount ? 'secondary' : 'default'}
                      className={account.testAccount ? 'bg-blue-100 text-blue-800' : ''}
                    >
                      {account.testAccount ? 'Test Account' : 'Produktions Account'}
                    </Badge>
                    <Badge
                      variant={account.status === 'ENABLED' ? 'default' : 'secondary'}
                      className={account.status === 'ENABLED' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {account.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Progress Tabs */}
      <Tabs value={currentStep.toString()} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="1" className={currentStep >= 1 ? 'text-[#14ad9f]' : ''}>
            Grundlagen
          </TabsTrigger>
          <TabsTrigger value="2" className={currentStep >= 2 ? 'text-[#14ad9f]' : ''}>
            Targeting
          </TabsTrigger>
          <TabsTrigger value="3" className={currentStep >= 3 ? 'text-[#14ad9f]' : ''}>
            Anzeigengruppen
          </TabsTrigger>
          <TabsTrigger value="4" className={currentStep >= 4 ? 'text-[#14ad9f]' : ''}>
            Überprüfung
          </TabsTrigger>
        </TabsList>

        {/* Schritt 1: Grundlagen */}
        <TabsContent value="1" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grundeinstellungen</CardTitle>
              <CardDescription>
                Definieren Sie die grundlegenden Eigenschaften Ihrer Kampagne
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Kampagnenname *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Sommeraktion 2025"
                  />
                </div>
                <div>
                  <Label htmlFor="budget">Tagesbudget (€) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="1"
                    value={formData.budgetAmount}
                    onChange={e =>
                      setFormData({ ...formData, budgetAmount: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-sm text-gray-600 mt-1">Empfohlen: Mindestens 10€ täglich</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Startdatum</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Enddatum (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="finalUrl">Ziel-URL *</Label>
                <Input
                  id="finalUrl"
                  type="url"
                  value={formData.finalUrl}
                  onChange={e => setFormData({ ...formData, finalUrl: e.target.value })}
                  placeholder="https://ihre-website.de/landingpage"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schritt 2: Targeting */}
        <TabsContent value="2" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zielgruppenausrichtung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Targeting-Optionen werden in einer späteren Version verfügbar sein.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schritt 3: Anzeigengruppen */}
        <TabsContent value="3" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Anzeigengruppen</h3>
            <Button onClick={addAdGroup} size="sm" className="bg-[#14ad9f] hover:bg-[#129488]">
              <Plus className="w-4 h-4 mr-2" />
              Anzeigengruppe hinzufügen
            </Button>
          </div>

          {formData.adGroups.map(adGroup => (
            <Card key={adGroup.id}>
              <CardHeader>
                <CardTitle className="text-lg">{adGroup.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Anzeigengruppen-Name */}
                <div>
                  <Label>Name der Anzeigengruppe</Label>
                  <Input
                    value={adGroup.name}
                    onChange={e => updateAdGroup(adGroup.id, 'name', e.target.value)}
                    placeholder="z.B. Handwerker Berlin"
                  />
                </div>

                {/* Keywords */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Keywords</Label>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Keyword eingeben"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          addKeyword(adGroup.id);
                        }
                      }}
                    />
                    <Select value={newKeywordMatch} onValueChange={setNewKeywordMatch}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BROAD">Weitgehend</SelectItem>
                        <SelectItem value="PHRASE">Wortgruppe</SelectItem>
                        <SelectItem value="EXACT">Genau</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => addKeyword(adGroup.id)}
                      className="bg-[#14ad9f] hover:bg-[#129488]"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {adGroup.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {keyword.text} ({keyword.matchType})
                        <button
                          onClick={() => removeKeyword(adGroup.id, index)}
                          className="ml-1 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Anzeigen */}
                <div>
                  <Label className="text-base font-medium">Anzeigen</Label>
                  {adGroup.ads.map(ad => (
                    <Card key={ad.id} className="mt-2">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <Label>Überschriften (max. 30 Zeichen)</Label>
                            {ad.headlines.map((headline, index) => (
                              <Input
                                key={index}
                                value={headline}
                                onChange={e =>
                                  updateAd(adGroup.id, ad.id, 'headlines', e.target.value, index)
                                }
                                placeholder={`Überschrift ${index + 1}`}
                                maxLength={30}
                                className="mt-1"
                              />
                            ))}
                          </div>

                          <div>
                            <Label>Beschreibungen (max. 90 Zeichen)</Label>
                            {ad.descriptions.map((description, index) => (
                              <Textarea
                                key={index}
                                value={description}
                                onChange={e =>
                                  updateAd(adGroup.id, ad.id, 'descriptions', e.target.value, index)
                                }
                                placeholder={`Beschreibung ${index + 1}`}
                                maxLength={90}
                                className="mt-1"
                                rows={2}
                              />
                            ))}
                          </div>

                          <div>
                            <Label>Ziel-URL</Label>
                            <Input
                              type="url"
                              value={ad.finalUrls[0] || ''}
                              onChange={e =>
                                updateAd(adGroup.id, ad.id, 'finalUrls', e.target.value)
                              }
                              placeholder="https://ihre-website.de"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Schritt 4: Überprüfung */}
        <TabsContent value="4" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kampagne überprüfen</CardTitle>
              <CardDescription>
                Überprüfen Sie alle Einstellungen vor der Erstellung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kampagnenname</Label>
                  <p className="font-medium">{formData.name || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <Label>Tagesbudget</Label>
                  <p className="font-medium">€{formData.budgetAmount}</p>
                </div>
              </div>

              <div>
                <Label>Anzeigengruppen ({formData.adGroups.length})</Label>
                {formData.adGroups.map(adGroup => (
                  <div key={adGroup.id} className="mt-2 p-3 border rounded">
                    <h4 className="font-medium">{adGroup.name}</h4>
                    <p className="text-sm text-gray-600">
                      {adGroup.keywords.length} Keywords, {adGroup.ads.length} Anzeigen
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Zurück
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Abbrechen
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              Weiter
            </Button>
          ) : (
            <Button
              onClick={handleCreateCampaign}
              disabled={creating}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              <Save className="w-4 h-4 mr-2" />
              {creating ? 'Erstelle...' : 'Kampagne erstellen'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
