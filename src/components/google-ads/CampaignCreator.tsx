// 🚀 Erweiterte Google Ads Campaign Creator Komponente
// Vollständige Kampagnenerstellung mit Keywords, Anzeigengruppen und Anzeigen

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Target, Globe, Lightbulb, DollarSign } from 'lucide-react';

interface CampaignCreatorProps {
  companyId: string;
  customerId?: string;
  onCampaignCreated?: (campaignId: string) => void;
}

interface AdGroup {
  id: string;
  name: string;
  cpcBidMicros: number;
  keywords: Array<{
    text: string;
    matchType: string;
  }>;
  ads: Advertisement[];
}

interface Advertisement {
  id: string;
  headlines: string[];
  descriptions: string[];
  finalUrls: string[];
}

interface CampaignFormData {
  // Grundeinstellungen
  name: string;
  budgetAmount: number;
  advertisingChannelType: string;
  biddingStrategyType: string;
  startDate: string;
  endDate?: string;

  // Targeting
  locations: string[];
  languages: string[];
  demographics: {
    ageRanges: string[];
    genders: string[];
  };

  // Anzeigengruppen
  adGroups: AdGroup[];

  // URLs und Tracking
  finalUrl: string;
  trackingTemplate?: string;
}

export function CampaignCreator({
  companyId,
  customerId,
  onCampaignCreated,
}: CampaignCreatorProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    budgetAmount: 50,
    advertisingChannelType: 'SEARCH',
    biddingStrategyType: 'MANUAL_CPC',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    locations: ['Deutschland'],
    languages: ['Deutsch'],
    demographics: {
      ageRanges: [],
      genders: [],
    },
    adGroups: [
      {
        id: '1',
        name: 'Anzeigengruppe 1',
        cpcBidMicros: 1000000, // 1 EUR in Mikros
        keywords: [],
        ads: [],
      },
    ],
    finalUrl: '',
  });

  // Neue Anzeigengruppe hinzufügen
  const addAdGroup = () => {
    const newAdGroup: AdGroup = {
      id: Date.now().toString(),
      name: `Anzeigengruppe ${formData.adGroups.length + 1}`,
      cpcBidMicros: 1000000, // 1 EUR in Mikros
      keywords: [],
      ads: [],
    };
    setFormData(prev => ({
      ...prev,
      adGroups: [...prev.adGroups, newAdGroup],
    }));
  };

  // Anzeigengruppe entfernen
  const removeAdGroup = (id: string) => {
    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.filter(ag => ag.id !== id),
    }));
  };

  // Keyword zu Anzeigengruppe hinzufügen
  const addKeyword = (adGroupId: string, keyword: string) => {
    if (!keyword.trim()) return;

    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag =>
        ag.id === adGroupId
          ? {
              ...ag,
              keywords: [...ag.keywords, { text: keyword.trim(), matchType: 'EXACT' }],
            }
          : ag
      ),
    }));
  };

  // Keyword entfernen
  const removeKeyword = (adGroupId: string, keywordIndex: number) => {
    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag =>
        ag.id === adGroupId
          ? { ...ag, keywords: ag.keywords.filter((_, i) => i !== keywordIndex) }
          : ag
      ),
    }));
  };

  // Anzeige hinzufügen
  const addAd = (adGroupId: string) => {
    const newAd: Advertisement = {
      id: Date.now().toString(),
      headlines: ['Ihre Überschrift 1', 'Ihre Überschrift 2', 'Ihre Überschrift 3'],
      descriptions: ['Ihre Beschreibung 1', 'Ihre Beschreibung 2'],
      finalUrls: [formData.finalUrl || 'https://taskilo.de'],
    };

    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag =>
        ag.id === adGroupId ? { ...ag, ads: [...ag.ads, newAd] } : ag
      ),
    }));
  };

  // Anzeige entfernen
  const removeAd = (adGroupId: string, adId: string) => {
    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag =>
        ag.id === adGroupId ? { ...ag, ads: ag.ads.filter(ad => ad.id !== adId) } : ag
      ),
    }));
  };

  // Anzeige aktualisieren
  const updateAd = (
    adGroupId: string,
    adId: string,
    field: string,
    value: string,
    index?: number
  ) => {
    setFormData(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(ag =>
        ag.id === adGroupId
          ? {
              ...ag,
              ads: ag.ads.map(ad =>
                ad.id === adId
                  ? (() => {
                      if (field === 'headlines' && index !== undefined) {
                        const newHeadlines = [...ad.headlines];
                        newHeadlines[index] = value;
                        return { ...ad, headlines: newHeadlines };
                      } else if (field === 'descriptions' && index !== undefined) {
                        const newDescriptions = [...ad.descriptions];
                        newDescriptions[index] = value;
                        return { ...ad, descriptions: newDescriptions };
                      } else if (field === 'finalUrls') {
                        return { ...ad, finalUrls: [value] };
                      }
                      return ad;
                    })()
                  : ad
              ),
            }
          : ag
      ),
    }));
  };

  // Kampagne erstellen
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

      // Überprüfe, dass jede Anzeigengruppe Keywords und Anzeigen hat
      for (const adGroup of formData.adGroups) {
        if (adGroup.keywords.length === 0) {
          throw new Error(`Anzeigengruppe "${adGroup.name}" benötigt mindestens ein Keyword`);
        }
        if (adGroup.ads.length === 0) {
          throw new Error(`Anzeigengruppe "${adGroup.name}" benötigt mindestens eine Anzeige`);
        }

        // Validiere jede Anzeige
        for (const ad of adGroup.ads) {
          const validHeadlines = ad.headlines.filter(h => h && h.trim().length > 0);
          const validDescriptions = ad.descriptions.filter(d => d && d.trim().length > 0);

          if (validHeadlines.length < 3) {
            throw new Error(`Anzeige in "${adGroup.name}" benötigt mindestens 3 Überschriften`);
          }

          if (validDescriptions.length < 2) {
            throw new Error(`Anzeige in "${adGroup.name}" benötigt mindestens 2 Beschreibungen`);
          }

          if (!ad.finalUrls || ad.finalUrls.length === 0 || !ad.finalUrls[0]) {
            throw new Error(`Anzeige in "${adGroup.name}" benötigt mindestens eine Ziel-URL`);
          }
        }
      }

      const response = await fetch('/api/google-ads/campaigns/create-comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          customerId: customerId || 'auto-detect',
          campaignData: {
            name: formData.name,
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kampagne konnte nicht erstellt werden');
      }

      const result = await response.json();

      if (result.success) {
        setOpen(false);
        setCurrentStep(1);
        setFormData({
          name: '',
          budgetAmount: 50,
          advertisingChannelType: 'SEARCH',
          biddingStrategyType: 'MANUAL_CPC',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          locations: ['Deutschland'],
          languages: ['Deutsch'],
          demographics: {
            ageRanges: [],
            genders: [],
          },
          adGroups: [
            {
              id: '1',
              name: 'Anzeigengruppe 1',
              cpcBidMicros: 1000000, // 1 EUR in Mikros
              keywords: [],
              ads: [],
            },
          ],
          finalUrl: '',
        });

        if (onCampaignCreated) {
          onCampaignCreated(result.data.campaignId);
        }
      }
    } catch (err: any) {
      console.error('Campaign creation error:', err);
      setError(err.message || 'Unbekannter Fehler beim Erstellen der Kampagne');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Erweiterte Kampagne erstellen
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#14ad9f]" />
            Neue Google Ads Kampagne erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie eine vollständige Kampagne mit Anzeigengruppen, Keywords und Anzeigen
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs
          value={currentStep.toString()}
          onValueChange={value => setCurrentStep(parseInt(value))}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="1">Grundlagen</TabsTrigger>
            <TabsTrigger value="2">Targeting</TabsTrigger>
            <TabsTrigger value="3">Anzeigengruppen</TabsTrigger>
            <TabsTrigger value="4">Überprüfung</TabsTrigger>
          </TabsList>

          {/* Schritt 1: Grundlagen */}
          <TabsContent value="1" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Grundeinstellungen</CardTitle>
                <CardDescription>
                  Definieren Sie die grundlegenden Eigenschaften Ihrer Kampagne
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Kampagnenname *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Sommeraktion 2025"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Tagesbudget (€) *</Label>
                    <Input
                      id="budget"
                      type="number"
                      min="1"
                      value={formData.budgetAmount}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          budgetAmount: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Empfohlen: Mindestens 10€ täglich für optimale Ergebnisse
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="channelType">Kampagnentyp</Label>
                    <Select
                      value={formData.advertisingChannelType}
                      onValueChange={value =>
                        setFormData(prev => ({ ...prev, advertisingChannelType: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEARCH">Such-Kampagne</SelectItem>
                        <SelectItem value="DISPLAY">Display-Kampagne</SelectItem>
                        <SelectItem value="PERFORMANCE_MAX">Performance Max</SelectItem>
                        <SelectItem value="SHOPPING">Shopping-Kampagne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Startdatum</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">Enddatum (optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="finalUrl">Ziel-URL *</Label>
                  <Input
                    id="finalUrl"
                    type="url"
                    value={formData.finalUrl}
                    onChange={e => setFormData(prev => ({ ...prev, finalUrl: e.target.value }))}
                    placeholder="https://ihre-website.de/landingpage"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schritt 2: Targeting */}
          <TabsContent value="2" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Zielgruppen-Targeting</CardTitle>
                <CardDescription>Definieren Sie, wer Ihre Anzeigen sehen soll</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Standorte</Label>
                  <div className="mt-2 space-y-2">
                    {formData.locations.map((location, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#14ad9f]" />
                        <Badge variant="secondary">{location}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Sprachen</Label>
                  <div className="mt-2 space-y-2">
                    {formData.languages.map((language, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#14ad9f]" />
                        <Badge variant="secondary">{language}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Altersgruppen</Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map(age => (
                      <label key={age} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.demographics.ageRanges.includes(age)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                demographics: {
                                  ...prev.demographics,
                                  ageRanges: [...prev.demographics.ageRanges, age],
                                },
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                demographics: {
                                  ...prev.demographics,
                                  ageRanges: prev.demographics.ageRanges.filter(a => a !== age),
                                },
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{age}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schritt 3: Anzeigengruppen */}
          <TabsContent value="3" className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{adGroup.name}</CardTitle>
                    {formData.adGroups.length > 1 && (
                      <Button
                        onClick={() => removeAdGroup(adGroup.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Anzeigengruppen-Name */}
                  <div>
                    <Label>Name der Anzeigengruppe</Label>
                    <Input
                      value={adGroup.name}
                      onChange={e => {
                        setFormData(prev => ({
                          ...prev,
                          adGroups: prev.adGroups.map(ag =>
                            ag.id === adGroup.id ? { ...ag, name: e.target.value } : ag
                          ),
                        }));
                      }}
                      className="mt-1"
                    />
                  </div>

                  {/* Keywords */}
                  <div>
                    <Label>Keywords</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Keyword eingeben..."
                          onKeyPress={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              addKeyword(adGroup.id, input.value);
                              input.value = '';
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={e => {
                            const input = (e.target as HTMLElement).parentElement?.querySelector(
                              'input'
                            ) as HTMLInputElement;
                            if (input) {
                              addKeyword(adGroup.id, input.value);
                              input.value = '';
                            }
                          }}
                          className="bg-[#14ad9f] hover:bg-[#129488]"
                        >
                          Hinzufügen
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {adGroup.keywords.map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
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
                  </div>

                  {/* Anzeigen */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Anzeigen</Label>
                      <Button
                        onClick={() => addAd(adGroup.id)}
                        size="sm"
                        className="bg-[#14ad9f] hover:bg-[#129488]"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Anzeige hinzufügen
                      </Button>
                    </div>

                    {adGroup.ads.map(ad => (
                      <Card key={ad.id} className="mt-2">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Textanzeige</h4>
                            <Button
                              onClick={() => removeAd(adGroup.id, ad.id)}
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

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
                                    updateAd(
                                      adGroup.id,
                                      ad.id,
                                      'descriptions',
                                      e.target.value,
                                      index
                                    )
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
          <TabsContent value="4" className="space-y-4">
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

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            Zurück
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
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
                {creating ? 'Erstelle...' : 'Kampagne erstellen'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
