// 🚀 Erweiterte Google Ads Campaign Creator Komponente
// Vollständige Kampagnenerstellung mit Assets, Extensions, Keywords und Anzeigengruppen

'use client';

import React, { useState, useRef } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Settings,
  Target,
  FileText,
  CheckCircle,
  Trash2,
  Image,
  Link,
  Tag,
  Video,
  Lightbulb,
  Phone,
  DollarSign,
  Globe,
} from 'lucide-react';
interface CampaignCreatorProps {
  companyId: string;
  customerId?: string;
  onCampaignCreated?: (campaignId: string) => void;
}

// 🎨 Asset Types für verschiedene Anzeigenformate
interface CampaignAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'LOGO' | 'TEXT';
  assetType: string; // MARKETING_IMAGE, SQUARE_MARKETING_IMAGE, LOGO, etc.
  name: string;
  url?: string;
  text?: string;
  file?: File;
  dimensions?: {
    width: number;
    height: number;
  };
}

// 🔗 Erweiterungen für Anzeigen
interface AdExtension {
  id: string;
  type: 'SITELINK' | 'CALLOUT' | 'STRUCTURED_SNIPPET' | 'CALL' | 'PRICE';
  data: {
    // Sitelinks
    linkText?: string;
    description1?: string;
    description2?: string;
    finalUrl?: string;

    // Callouts
    calloutText?: string;

    // Structured Snippets
    header?: string;
    values?: string[];

    // Call Extensions
    phoneNumber?: string;
    country?: string;

    // Price Extensions
    type?: string;
    qualifier?: string;
    price?: number;
    currency?: string;
    priceUrl?: string;
  };
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
  type: 'RESPONSIVE_SEARCH' | 'RESPONSIVE_DISPLAY' | 'APP' | 'LOCAL';
  headlines: string[];
  descriptions: string[];
  finalUrls: string[];

  // Assets für verschiedene Anzeigentypen
  assets?: {
    marketingImages?: CampaignAsset[];
    squareImages?: CampaignAsset[];
    logos?: CampaignAsset[];
    videos?: CampaignAsset[];
  };
}

interface CampaignFormData {
  // Grundeinstellungen
  name: string;
  budgetAmount: number;
  advertisingChannelType: string;
  biddingStrategyType: string;
  startDate: string;
  endDate?: string;

  // 🎨 Assets
  assets: CampaignAsset[];

  // 🔗 Erweiterungen
  extensions: AdExtension[];

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

  // File upload refs
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const logoUploadRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    budgetAmount: 50,
    advertisingChannelType: 'SEARCH',
    biddingStrategyType: 'MANUAL_CPC',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',

    // ✅ Neue Asset-Felder
    assets: [],
    extensions: [],

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

  // 🎨 ASSET MANAGEMENT FUNKTIONEN

  // Asset hinzufügen
  const addAsset = (type: CampaignAsset['type'], assetType: string) => {
    const newAsset: CampaignAsset = {
      id: Date.now().toString(),
      type,
      assetType,
      name: `${type} Asset ${formData.assets.length + 1}`,
    };

    setFormData(prev => ({
      ...prev,
      assets: [...prev.assets, newAsset],
    }));
  };

  // Asset entfernen
  const removeAsset = (assetId: string) => {
    setFormData(prev => ({
      ...prev,
      assets: prev.assets.filter(asset => asset.id !== assetId),
    }));
  };

  // Asset-File upload
  const handleFileUpload = (assetId: string, file: File) => {
    setFormData(prev => ({
      ...prev,
      assets: prev.assets.map(asset =>
        asset.id === assetId ? { ...asset, file, name: file.name } : asset
      ),
    }));
  };

  // Asset-Text aktualisieren
  const updateAssetText = (assetId: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      assets: prev.assets.map(asset => (asset.id === assetId ? { ...asset, text } : asset)),
    }));
  };

  // 🔗 EXTENSION MANAGEMENT FUNKTIONEN

  // Extension hinzufügen
  const addExtension = (type: AdExtension['type']) => {
    const newExtension: AdExtension = {
      id: Date.now().toString(),
      type,
      data: {},
    };

    setFormData(prev => ({
      ...prev,
      extensions: [...prev.extensions, newExtension],
    }));
  };

  // Extension entfernen
  const removeExtension = (extensionId: string) => {
    setFormData(prev => ({
      ...prev,
      extensions: prev.extensions.filter(ext => ext.id !== extensionId),
    }));
  };

  // Extension-Daten aktualisieren
  const updateExtension = (extensionId: string, data: Partial<AdExtension['data']>) => {
    setFormData(prev => ({
      ...prev,
      extensions: prev.extensions.map(ext =>
        ext.id === extensionId ? { ...ext, data: { ...ext.data, ...data } } : ext
      ),
    }));
  };

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
      type: 'RESPONSIVE_SEARCH',
      headlines: ['Ihre Überschrift 1', 'Ihre Überschrift 2', 'Ihre Überschrift 3'],
      descriptions: ['Ihre Beschreibung 1', 'Ihre Beschreibung 2'],
      finalUrls: [formData.finalUrl || 'https://taskilo.de'],
      assets: {
        marketingImages: [],
        squareImages: [],
        logos: [],
        videos: [],
      },
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

      console.log('🚀 Starting campaign creation for companyId:', companyId);
      console.log('📝 Form data:', JSON.stringify(formData, null, 2));

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
          companyId, // ✅ Nur noch companyId - API wählt automatisch Customer ID
          campaignData: {
            name: formData.name,
            budgetAmountMicros: formData.budgetAmount * 1000000,
            advertisingChannelType: formData.advertisingChannelType,
            biddingStrategyType: formData.biddingStrategyType,
            startDate: formData.startDate,
            endDate: formData.endDate,

            // 🚧 Assets und Extensions vorerst deaktiviert für Debugging
            // assets: formData.assets,
            // extensions: formData.extensions,

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

          // ✅ Neue Asset-Felder
          assets: [],
          extensions: [],

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
          Kampagne erstellen
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="1">Grundlagen</TabsTrigger>
            <TabsTrigger value="2">Assets</TabsTrigger>
            <TabsTrigger value="3">Extensions</TabsTrigger>
            <TabsTrigger value="4">Targeting</TabsTrigger>
            <TabsTrigger value="5">Anzeigengruppen</TabsTrigger>
            <TabsTrigger value="6">Überprüfung</TabsTrigger>
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

          {/* Schritt 2: Assets */}
          <TabsContent value="2" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-[#14ad9f]" />
                  Asset-Management
                </CardTitle>
                <CardDescription>
                  Fügen Sie Bilder, Logos, Videos und Text-Assets für Ihre Kampagne hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Asset Upload Bereich */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Marketing Images */}
                  <Card className="p-4">
                    <div className="text-center">
                      <Image className="w-8 h-8 mx-auto mb-2 text-[#14ad9f]" />
                      <h4 className="font-medium mb-2">Marketing-Bilder</h4>
                      <p className="text-sm text-gray-600 mb-3">1200x628px empfohlen</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addAsset('IMAGE', 'MARKETING_IMAGE')}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Bild hinzufügen
                      </Button>
                    </div>
                  </Card>

                  {/* Square Images */}
                  <Card className="p-4">
                    <div className="text-center">
                      <Image className="w-8 h-8 mx-auto mb-2 text-[#14ad9f]" />
                      <h4 className="font-medium mb-2">Quadratische Bilder</h4>
                      <p className="text-sm text-gray-600 mb-3">1200x1200px empfohlen</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addAsset('IMAGE', 'SQUARE_MARKETING_IMAGE')}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Bild hinzufügen
                      </Button>
                    </div>
                  </Card>

                  {/* Logos */}
                  <Card className="p-4">
                    <div className="text-center">
                      <Tag className="w-8 h-8 mx-auto mb-2 text-[#14ad9f]" />
                      <h4 className="font-medium mb-2">Logos</h4>
                      <p className="text-sm text-gray-600 mb-3">1200x300px empfohlen</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addAsset('LOGO', 'LOGO')}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Logo hinzufügen
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Vorhandene Assets anzeigen */}
                {formData.assets.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Hochgeladene Assets</h4>
                    <div className="space-y-3">
                      {formData.assets.map(asset => (
                        <Card key={asset.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {asset.type === 'IMAGE' && (
                                <Image className="w-5 h-5 text-[#14ad9f]" />
                              )}
                              {asset.type === 'LOGO' && <Tag className="w-5 h-5 text-[#14ad9f]" />}
                              {asset.type === 'VIDEO' && (
                                <Video className="w-5 h-5 text-[#14ad9f]" />
                              )}
                              {asset.type === 'TEXT' && (
                                <FileText className="w-5 h-5 text-[#14ad9f]" />
                              )}

                              <div>
                                <p className="font-medium">{asset.name}</p>
                                <p className="text-sm text-gray-600">{asset.assetType}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {asset.type === 'TEXT' ? (
                                <Input
                                  placeholder="Text eingeben..."
                                  value={asset.text || ''}
                                  onChange={e => updateAssetText(asset.id, e.target.value)}
                                  className="w-48"
                                />
                              ) : (
                                <Input
                                  type="file"
                                  accept={asset.type === 'VIDEO' ? 'video/*' : 'image/*'}
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(asset.id, file);
                                  }}
                                  className="w-48"
                                />
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeAsset(asset.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Assets */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#14ad9f]" />
                    Text-Assets
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => addAsset('TEXT', 'BUSINESS_NAME')}
                      className="p-4 h-auto flex-col"
                    >
                      <Plus className="w-5 h-5 mb-2" />
                      <span className="font-medium">Firmenname</span>
                      <span className="text-sm text-gray-600">Für Branding</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => addAsset('TEXT', 'CALL_TO_ACTION_SELECTION')}
                      className="p-4 h-auto flex-col"
                    >
                      <Plus className="w-5 h-5 mb-2" />
                      <span className="font-medium">Call-to-Action</span>
                      <span className="text-sm text-gray-600">Handlungsaufforderung</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schritt 3: Extensions */}
          <TabsContent value="3" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-[#14ad9f]" />
                  Anzeigenerweiterungen
                </CardTitle>
                <CardDescription>
                  Erweitern Sie Ihre Anzeigen mit zusätzlichen Informationen und Links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Extension Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => addExtension('SITELINK')}
                    className="p-4 h-auto flex-col"
                  >
                    <Link className="w-6 h-6 mb-2 text-[#14ad9f]" />
                    <span className="font-medium">Sitelinks</span>
                    <span className="text-sm text-gray-600">Zusätzliche Links</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => addExtension('CALLOUT')}
                    className="p-4 h-auto flex-col"
                  >
                    <Lightbulb className="w-6 h-6 mb-2 text-[#14ad9f]" />
                    <span className="font-medium">Callouts</span>
                    <span className="text-sm text-gray-600">Vorteile hervorheben</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => addExtension('STRUCTURED_SNIPPET')}
                    className="p-4 h-auto flex-col"
                  >
                    <FileText className="w-6 h-6 mb-2 text-[#14ad9f]" />
                    <span className="font-medium">Snippets</span>
                    <span className="text-sm text-gray-600">Strukturierte Infos</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => addExtension('CALL')}
                    className="p-4 h-auto flex-col"
                  >
                    <Phone className="w-6 h-6 mb-2 text-[#14ad9f]" />
                    <span className="font-medium">Anruf</span>
                    <span className="text-sm text-gray-600">Telefonnummer</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => addExtension('PRICE')}
                    className="p-4 h-auto flex-col"
                  >
                    <DollarSign className="w-6 h-6 mb-2 text-[#14ad9f]" />
                    <span className="font-medium">Preise</span>
                    <span className="text-sm text-gray-600">Preisliste</span>
                  </Button>
                </div>

                {/* Vorhandene Extensions anzeigen */}
                {formData.extensions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Konfigurierte Erweiterungen</h4>
                    <div className="space-y-4">
                      {formData.extensions.map(extension => (
                        <Card key={extension.id} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {extension.type === 'SITELINK' && (
                                <Link className="w-5 h-5 text-[#14ad9f]" />
                              )}
                              {extension.type === 'CALLOUT' && (
                                <Lightbulb className="w-5 h-5 text-[#14ad9f]" />
                              )}
                              {extension.type === 'STRUCTURED_SNIPPET' && (
                                <FileText className="w-5 h-5 text-[#14ad9f]" />
                              )}
                              {extension.type === 'CALL' && (
                                <Phone className="w-5 h-5 text-[#14ad9f]" />
                              )}
                              {extension.type === 'PRICE' && (
                                <DollarSign className="w-5 h-5 text-[#14ad9f]" />
                              )}

                              <span className="font-medium">{extension.type}</span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeExtension(extension.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Extension-spezifische Felder */}
                          {extension.type === 'SITELINK' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                placeholder="Link-Text"
                                value={extension.data.linkText || ''}
                                onChange={e =>
                                  updateExtension(extension.id, { linkText: e.target.value })
                                }
                              />
                              <Input
                                placeholder="Ziel-URL"
                                value={extension.data.finalUrl || ''}
                                onChange={e =>
                                  updateExtension(extension.id, { finalUrl: e.target.value })
                                }
                              />
                              <Input
                                placeholder="Beschreibung 1"
                                value={extension.data.description1 || ''}
                                onChange={e =>
                                  updateExtension(extension.id, { description1: e.target.value })
                                }
                              />
                              <Input
                                placeholder="Beschreibung 2"
                                value={extension.data.description2 || ''}
                                onChange={e =>
                                  updateExtension(extension.id, { description2: e.target.value })
                                }
                              />
                            </div>
                          )}

                          {extension.type === 'CALLOUT' && (
                            <Input
                              placeholder="Callout-Text (z.B. 'Kostenloser Versand')"
                              value={extension.data.calloutText || ''}
                              onChange={e =>
                                updateExtension(extension.id, { calloutText: e.target.value })
                              }
                            />
                          )}

                          {extension.type === 'CALL' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                placeholder="Telefonnummer"
                                value={extension.data.phoneNumber || ''}
                                onChange={e =>
                                  updateExtension(extension.id, { phoneNumber: e.target.value })
                                }
                              />
                              <Select
                                value={extension.data.country || 'DE'}
                                onValueChange={value =>
                                  updateExtension(extension.id, { country: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DE">Deutschland</SelectItem>
                                  <SelectItem value="AT">Österreich</SelectItem>
                                  <SelectItem value="CH">Schweiz</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schritt 4: Targeting */}
          <TabsContent value="4" className="space-y-4">
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

          {/* Schritt 6: Überprüfung */}
          <TabsContent value="6" className="space-y-4">
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

            {currentStep < 6 ? (
              <Button
                onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
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
