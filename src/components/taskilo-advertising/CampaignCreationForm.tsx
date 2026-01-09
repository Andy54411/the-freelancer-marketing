'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { 
  Plus,
  X,
  Save,
  Send,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  TrendingUp,
  Settings,
  Sparkles,
  Wand2,
  MousePointerClick,
  Euro,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Lightbulb,
  Search,
  Info
} from 'lucide-react';
import {
  HoverCard,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { AudienceHoverCardContent } from './AudienceHoverCardContent';

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
    maxCpc?: number;
    targetImpressionShare?: number;
    impressionShareLocation?: 'ANYWHERE_ON_PAGE' | 'TOP_OF_PAGE' | 'ABSOLUTE_TOP_OF_PAGE';
  };
  targeting: {
    locations: string[];
    languages: string[];
    keywords: string[];
    demographics: {
      ageRanges: string[];
      genders: string[];
    };
    networks: {
      searchPartners: boolean;
      displayNetwork: boolean;
    };
    locationOption: 'PRESENCE_OR_INTEREST' | 'PRESENCE';
    politicalContent: boolean | null;
    audienceTargeting: 'OBSERVATION' | 'TARGETING';
    excludedLocations: string[];
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
  customerAcquisition: {
    enabled: boolean;
    optimizationMode: 'BID_HIGHER' | 'ONLY_NEW';
    value?: number;
  };
  aiMax: boolean;
  businessDescription: string;
}

const biddingFocusOptions = [
  { value: 'CONVERSIONS', label: 'Conversions', description: 'Aktionen auf Ihrer Website' },
  { value: 'CONVERSION_VALUE', label: 'Conversion-Wert', description: 'Wert der Aktionen' },
  { value: 'CLICKS', label: 'Klicks', description: 'Besuche auf Ihrer Website' },
  { value: 'IMPRESSION_SHARE', label: 'Anteil an möglichen Impressionen', description: 'Sichtbarkeit' },
];

const steps = [
  { id: 'bidding', label: 'Gebote', icon: TrendingUp },
  { id: 'settings', label: 'Kampagneneinstellungen', icon: Settings },
  { id: 'aimax', label: 'AI Max', icon: Sparkles },
  { id: 'assets', label: 'Keywords und Assets erstellen', icon: Wand2 },
  { id: 'keywords_ads', label: 'Keywords und Anzeigen', icon: MousePointerClick },
  { id: 'budget', label: 'Budget', icon: Euro },
  { id: 'review', label: 'Überprüfen', icon: CheckCircle },
];

interface ExpansionPanelProps {
  id: string;
  title: string;
  summary?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
}

const ExpansionPanel = ({ 
  id: _id, 
  title, 
  summary, 
  children, 
  icon: Icon,
  isOpen,
  onToggle
}: ExpansionPanelProps) => {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mb-4 transition-all duration-200">
      <div 
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors",
          isOpen ? "border-b border-gray-200" : ""
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-gray-500" />}
          <div className="flex flex-col">
            <h3 className="text-base font-medium text-gray-900">{title}</h3>
            {!isOpen && summary && (
              <p className="text-sm text-gray-500 mt-1">{summary}</p>
            )}
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </div>

      {isOpen && (
        <div className="p-6 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default function CampaignCreationForm({ companyId }: CampaignCreationFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { settings: companySettings } = useCompanySettings(companyId);
  
  const getCountryName = (codeOrName: string) => {
    if (!codeOrName) return 'Deutschland';
    // If it looks like a country code (2 letters), try to convert it
    if (codeOrName.length === 2) {
      try {
        return new Intl.DisplayNames(['de'], { type: 'region' }).of(codeOrName) || codeOrName;
      } catch {
        return codeOrName;
      }
    }
    return codeOrName;
  };

  const companyCountryName = companySettings?.companyCountry ? getCountryName(companySettings.companyCountry) : 'Deutschland';
  
  const [activeStep, setActiveStep] = useState('bidding');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    'bidding-strategy': true,
    'bidding-customer-acquisition': false,
    'settings-networks': true,
    'settings-locations': true,
    'settings-languages': true,
    'settings-political': true,
    'settings-audience': false,
    'more-settings-container': false,
    'settings-rotation': false,
    'settings-dates': false,
    'settings-schedule': false,
    'settings-url': false,
    'settings-feeds': false,
    'assets-generation': true,
    'budget-main': true,
  });

  const togglePanel = (panelId: string) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  };

  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: searchParams.get('businessName') ? `Kampagne für ${searchParams.get('businessName')}` : '',
    type: (searchParams.get('campaignType')?.toUpperCase().replace('-', '_') as any) || 'SEARCH',
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
      networks: {
        searchPartners: true,
        displayNetwork: true,
      },
      locationOption: 'PRESENCE_OR_INTEREST',
      politicalContent: null,
      audienceTargeting: 'OBSERVATION',
      excludedLocations: [],
    },
    ads: [{
      headlines: ['', '', ''],
      descriptions: ['', ''],
      finalUrl: searchParams.get('websiteUrl') || '',
    }],
    schedule: {
      startDate: new Date().toISOString().split('T')[0],
    },
    customerAcquisition: {
      enabled: false,
      optimizationMode: 'BID_HIGHER',
    },
    aiMax: false,
    businessDescription: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState('');

  // Customer Acquisition Modal State
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [acquisitionModalSelection, setAcquisitionModalSelection] = useState<'SWITCH_STRATEGY' | 'ONLY_NEW'>('SWITCH_STRATEGY');
  const [acquisitionModalRoasEnabled, setAcquisitionModalRoasEnabled] = useState(false);

  // Audience Picker State
  const [audienceSearchQuery, setAudienceSearchQuery] = useState('');
  const [audienceActiveTab, setAudienceActiveTab] = useState<'SEARCH' | 'BROWSE'>('SEARCH');
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedAudienceDetails, setSelectedAudienceDetails] = useState<Map<string, { id: string, name: string, path: string[] }>>(new Map());
  const [audienceSegments, setAudienceSegments] = useState<{
    affinity: any[];
    inMarket: any[];
    demographics: any[];
  }>({ affinity: [], inMarket: [], demographics: [] });
  const [isSearchingAudiences, setIsSearchingAudiences] = useState(false);
  const [audienceError, setAudienceError] = useState<string | null>(null);

  // Fetch audiences when search query changes
  React.useEffect(() => {
    const fetchAudiences = async () => {
      if (!audienceSearchQuery.trim()) {
        // Keep existing segments if query is empty or clear them? 
        // Usually we clear or show defaults. Let's clear for now as we don't have defaults.
        setAudienceSegments({ affinity: [], inMarket: [], demographics: [] });
        setAudienceError(null);
        return;
      }

      setIsSearchingAudiences(true);
      setAudienceError(null);
      try {
        const response = await fetch(`/api/multi-platform-advertising/google-ads/audiences/search?companyId=${companyId}&q=${encodeURIComponent(audienceSearchQuery)}`);
        const result = await response.json();
        
        if (result.success) {
          setAudienceSegments(result.data);
        } else {
          console.error('Audience search failed:', result);
          setAudienceError(result.error || 'Fehler bei der Suche');
          setAudienceSegments({ affinity: [], inMarket: [], demographics: [] });
        }
      } catch (error) {
        console.error('Failed to fetch audiences:', error);
        setAudienceError('Verbindungsfehler zum Server');
      } finally {
        setIsSearchingAudiences(false);
      }
    };

    const timeoutId = setTimeout(fetchAudiences, 500);
    return () => clearTimeout(timeoutId);
  }, [audienceSearchQuery, companyId]);

  const toggleAudience = (segment: { id: string, name: string, path: string[] }) => {
    const newSelected = new Map(selectedAudienceDetails);
    if (newSelected.has(segment.id)) {
      newSelected.delete(segment.id);
    } else {
      newSelected.set(segment.id, segment);
    }
    setSelectedAudienceDetails(newSelected);
    setSelectedAudiences(Array.from(newSelected.keys()));
  };

  React.useEffect(() => {
    if (companySettings?.companyCountry) {
      const countryName = getCountryName(companySettings.companyCountry);
      setCampaignData(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting,
          locations: [countryName]
        }
      }));
    }
  }, [companySettings?.companyCountry]);

  const handleCustomerAcquisitionChange = (checked: boolean) => {
    if (!checked) {
      setCampaignData(prev => ({
        ...prev,
        customerAcquisition: { ...prev.customerAcquisition, enabled: false }
      }));
      return;
    }

    // Check if we need to show modal (if strategy is NOT value-based)
    const isValueBased = ['MAXIMIZE_CONVERSION_VALUE', 'TARGET_ROAS'].includes(campaignData.biddingStrategy.type);
    
    if (!isValueBased) {
      setShowAcquisitionModal(true);
      setAcquisitionModalSelection('SWITCH_STRATEGY');
      setAcquisitionModalRoasEnabled(false);
    } else {
      setCampaignData(prev => ({
        ...prev,
        customerAcquisition: { ...prev.customerAcquisition, enabled: true }
      }));
    }
  };

  const handleAcquisitionModalConfirm = () => {
    if (acquisitionModalSelection === 'SWITCH_STRATEGY') {
      setCampaignData(prev => ({
        ...prev,
        biddingStrategy: {
          type: 'MAXIMIZE_CONVERSION_VALUE',
          targetRoas: acquisitionModalRoasEnabled ? 200 : undefined
        },
        customerAcquisition: {
          enabled: true,
          optimizationMode: 'BID_HIGHER'
        }
      }));
    } else {
      setCampaignData(prev => ({
        ...prev,
        customerAcquisition: {
          enabled: true,
          optimizationMode: 'ONLY_NEW'
        }
      }));
    }
    setShowAcquisitionModal(false);
  };

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
        router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns`);
      } else {
        if (result.error === 'NOT_LINKED_TO_MANAGER' || result.error === 'MANAGER_LINK_REQUIRED') {
          alert(
            `❌ Manager Account Verknüpfung erforderlich\n\n${result.message || 'Ihr Google Ads Account muss mit dem Taskilo Manager Account verknüpft werden.'}\n\nBitte gehen Sie zu den Google Ads Einstellungen und senden Sie eine Verknüpfungsanfrage.`
          );
          router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads`);
        } else {
          alert(`Fehler: ${result.message || result.error}`);
        }
      }
    } catch (error) {
      console.error('Campaign creation error:', error);
      alert('Fehler beim Erstellen der Kampagne. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    const currentIndex = steps.findIndex(s => s.id === activeStep);
    if (currentIndex < steps.length - 1) {
      setActiveStep(steps[currentIndex + 1].id);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-gray-50 -m-6">
      {/* Left Sidebar Stepper */}
      <div className={cn(
        "bg-white border-r border-gray-200 shrink-0 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        {/* Sidebar Header */}
        <div className={cn(
          "p-4 border-b border-gray-100 flex items-center h-16",
          isSidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden mr-2">
              <h3 className="font-semibold text-gray-900 truncate text-sm">Taskilo Advertising</h3>
              <p className="text-xs text-gray-500 truncate">{campaignData.name || 'Neue Kampagne'}</p>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-700"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <div className="py-4 space-y-1">
          {steps.map((step, _index) => {
            const isActive = activeStep === step.id;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center cursor-pointer transition-colors relative group",
                  isSidebarCollapsed ? "justify-center px-2 py-3" : "px-6 py-3",
                  isActive ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setActiveStep(step.id)}
                title={isSidebarCollapsed ? step.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-600" />
                )}
                <div className={cn(
                  "shrink-0",
                  isActive ? "text-teal-600" : "text-gray-400",
                  !isSidebarCollapsed && "mr-3"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                {!isSidebarCollapsed && (
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-teal-700" : "text-gray-600"
                  )}>
                    {step.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 pb-24">
          
          {/* Step Content */}
          <div className="space-y-6">
            
            {/* 2. Bidding */}
            {activeStep === 'bidding' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-normal text-gray-800 mb-6">Gebote</h2>
                
                <ExpansionPanel 
                  id="bidding-strategy" 
                  title="Gebote"
                  summary={biddingFocusOptions.find(o => o.value === (
                    campaignData.biddingStrategy.type === 'MAXIMIZE_CONVERSIONS' || campaignData.biddingStrategy.type === 'TARGET_CPA' ? 'CONVERSIONS' :
                    campaignData.biddingStrategy.type === 'MAXIMIZE_CONVERSION_VALUE' || campaignData.biddingStrategy.type === 'TARGET_ROAS' ? 'CONVERSION_VALUE' :
                    campaignData.biddingStrategy.type === 'MAXIMIZE_CLICKS' || campaignData.biddingStrategy.type === 'MANUAL_CPC' ? 'CLICKS' :
                    campaignData.biddingStrategy.type === 'TARGET_IMPRESSION_SHARE' ? 'IMPRESSION_SHARE' : 'CONVERSIONS'
                  ))?.label}
                  isOpen={expandedPanels['bidding-strategy']}
                  onToggle={() => togglePanel('bidding-strategy')}
                >
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-normal">Worauf möchten Sie den Schwerpunkt legen?</Label>
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                      </div>
                      <Select
                        value={
                          campaignData.biddingStrategy.type === 'MAXIMIZE_CONVERSIONS' || campaignData.biddingStrategy.type === 'TARGET_CPA' ? 'CONVERSIONS' :
                          campaignData.biddingStrategy.type === 'MAXIMIZE_CONVERSION_VALUE' || campaignData.biddingStrategy.type === 'TARGET_ROAS' ? 'CONVERSION_VALUE' :
                          campaignData.biddingStrategy.type === 'MAXIMIZE_CLICKS' || campaignData.biddingStrategy.type === 'MANUAL_CPC' ? 'CLICKS' :
                          campaignData.biddingStrategy.type === 'TARGET_IMPRESSION_SHARE' ? 'IMPRESSION_SHARE' : 'CONVERSIONS'
                        }
                        onValueChange={(value) => {
                          let newType = 'MAXIMIZE_CONVERSIONS';
                          if (value === 'CONVERSION_VALUE') newType = 'MAXIMIZE_CONVERSION_VALUE';
                          if (value === 'CLICKS') newType = 'MAXIMIZE_CLICKS';
                          if (value === 'IMPRESSION_SHARE') newType = 'TARGET_IMPRESSION_SHARE';
                          
                          setCampaignData(prev => ({
                            ...prev,
                            biddingStrategy: { ...prev.biddingStrategy, type: newType }
                          }));
                        }}
                      >
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Empfohlen</SelectLabel>
                            <SelectItem value="CONVERSIONS">Conversions</SelectItem>
                            <SelectItem value="CONVERSION_VALUE">Conversion-Wert</SelectItem>
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel>Weitere Optimierungsmöglichkeiten</SelectLabel>
                            <SelectItem value="CLICKS">Klicks</SelectItem>
                            <SelectItem value="IMPRESSION_SHARE">Anteil an möglichen Impressionen</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Strategy Specific Inputs */}
                    {(campaignData.biddingStrategy.type === 'MAXIMIZE_CONVERSIONS' || campaignData.biddingStrategy.type === 'TARGET_CPA') && (
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="targetCpa" 
                            checked={!!campaignData.biddingStrategy.targetCpa}
                            onCheckedChange={(checked) => setCampaignData(prev => ({
                              ...prev,
                              biddingStrategy: { 
                                ...prev.biddingStrategy, 
                                targetCpa: checked ? 10 : undefined 
                              }
                            }))}
                          />
                          <Label htmlFor="targetCpa" className="font-normal cursor-pointer">
                            Ziel-CPA (Cost-per-Action) festlegen (optional)
                          </Label>
                        </div>
                        {campaignData.biddingStrategy.targetCpa !== undefined && (
                          <div className="pl-7">
                            <div className="flex items-center gap-2 max-w-xs">
                              <Input
                                type="number"
                                value={campaignData.biddingStrategy.targetCpa}
                                onChange={(e) => setCampaignData(prev => ({
                                  ...prev,
                                  biddingStrategy: { ...prev.biddingStrategy, targetCpa: Number(e.target.value) }
                                }))}
                              />
                              <span className="text-sm text-gray-500">EUR</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Target Impression Share Inputs */}
                    {campaignData.biddingStrategy.type === 'TARGET_IMPRESSION_SHARE' && (
                      <div className="space-y-6 pt-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="font-normal">Wo sollen Ihre Anzeigen ausgeliefert werden?</Label>
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                          </div>
                          <Select
                            value={campaignData.biddingStrategy.impressionShareLocation || 'ANYWHERE_ON_PAGE'}
                            onValueChange={(val) => setCampaignData(prev => ({
                              ...prev,
                              biddingStrategy: { ...prev.biddingStrategy, impressionShareLocation: val as any }
                            }))}
                          >
                            <SelectTrigger className="w-full max-w-md">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ANYWHERE_ON_PAGE">Irgendwo auf der Suchergebnisseite</SelectItem>
                              <SelectItem value="TOP_OF_PAGE">Oben auf der Suchergebnisseite</SelectItem>
                              <SelectItem value="ABSOLUTE_TOP_OF_PAGE">Ganz oben auf der Suchergebnisseite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="font-normal">Angestrebter Anteil an möglichen Impressionen in %</Label>
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex items-center gap-2 w-[100px]">
                            <Input
                              type="number"
                              className="text-right"
                              value={campaignData.biddingStrategy.targetImpressionShare}
                              onChange={(e) => setCampaignData(prev => ({
                                ...prev,
                                biddingStrategy: { ...prev.biddingStrategy, targetImpressionShare: Number(e.target.value) }
                              }))}
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="font-normal">Limit für maximales CPC-Gebot</Label>
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex items-center gap-2 w-[100px]">
                            <Input
                              type="number"
                              className="text-right"
                              value={campaignData.biddingStrategy.maxCpc}
                              onChange={(e) => setCampaignData(prev => ({
                                ...prev,
                                biddingStrategy: { ...prev.biddingStrategy, maxCpc: Number(e.target.value) }
                              }))}
                            />
                            <span className="text-sm text-gray-500">€</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ExpansionPanel>

                <ExpansionPanel 
                  id="bidding-customer-acquisition" 
                  title="Kundenakquisition"
                  summary={campaignData.customerAcquisition.enabled ? 'Gebote für Neukunden angepasst' : 'Für Neu- und Bestandskunden dieselben Gebote abgeben'}
                  isOpen={expandedPanels['bidding-customer-acquisition']}
                  onToggle={() => togglePanel('bidding-customer-acquisition')}
                >
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="customerAcquisition" 
                        checked={campaignData.customerAcquisition.enabled}
                        onCheckedChange={(checked) => handleCustomerAcquisitionChange(checked === true)}
                      />
                      <Label htmlFor="customerAcquisition" className="font-normal cursor-pointer">
                        Gebote anpassen, um Neukunden zu gewinnen
                      </Label>
                    </div>

                    {campaignData.customerAcquisition.enabled && (
                      <div className="pl-7 space-y-4">
                        <RadioGroup 
                          value={campaignData.customerAcquisition.optimizationMode}
                          onValueChange={(value) => setCampaignData(prev => ({
                            ...prev,
                            customerAcquisition: { ...prev.customerAcquisition, optimizationMode: value as any }
                          }))}
                          className="space-y-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="BID_HIGHER" id="mode-bid-higher" />
                            <Label htmlFor="mode-bid-higher" className="font-normal">Höher bieten für Neukunden</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ONLY_NEW" id="mode-only-new" />
                            <Label htmlFor="mode-only-new" className="font-normal">Nur für Neukunden bieten</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                </ExpansionPanel>
              </div>
            )}

            {/* 3. Settings */}
            {activeStep === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-normal text-gray-800 mb-6">Kampagneneinstellungen</h2>
                <p className="text-gray-600 mb-6">Zuerst wichtige Einstellungen für die Kampagne festlegen, damit Sie die richtigen Nutzer erreichen</p>

                <ExpansionPanel 
                  id="settings-networks" 
                  title="Werbenetzwerke"
                  summary="Google Suchnetzwerk-Partner, Google Displaynetzwerk"
                  isOpen={expandedPanels['settings-networks']}
                  onToggle={() => togglePanel('settings-networks')}
                >
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="searchPartners" 
                        checked={campaignData.targeting.networks.searchPartners}
                        onCheckedChange={(checked) => setCampaignData(prev => ({
                          ...prev,
                          targeting: { ...prev.targeting, networks: { ...prev.targeting.networks, searchPartners: checked === true } }
                        }))}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="searchPartners" className="font-normal">Google Suchnetzwerk-Partner (empfohlen)</Label>
                        <p className="text-sm text-gray-500">Anzeigen können neben Google-Suchergebnissen und auf anderen Websites von Google Suchnetzwerk-Partnern ausgeliefert werden.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="displayNetwork" 
                        checked={campaignData.targeting.networks.displayNetwork}
                        onCheckedChange={(checked) => setCampaignData(prev => ({
                          ...prev,
                          targeting: { ...prev.targeting, networks: { ...prev.targeting.networks, displayNetwork: checked === true } }
                        }))}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="displayNetwork" className="font-normal">Google Displaynetzwerk (empfohlen)</Label>
                        <p className="text-sm text-gray-500">Wenn Budget aus Suchkampagnen nicht aufgebraucht ist, können Anzeigen auf relevanten Websites ausgeliefert werden.</p>
                      </div>
                    </div>
                  </div>
                </ExpansionPanel>

                <ExpansionPanel 
                  id="settings-locations" 
                  title="Standorte"
                  summary={campaignData.targeting.locations.join(', ') || 'Alle Länder und Gebiete'}
                  isOpen={expandedPanels['settings-locations']}
                  onToggle={() => togglePanel('settings-locations')}
                >
                  <div className="space-y-4">
                    <Label className="text-base font-normal">Standorte für diese Kampagne auswählen</Label>
                    <RadioGroup 
                      value={
                        campaignData.targeting.locations.length === 0 ? 'ALL' : 
                        (campaignData.targeting.locations.length === 1 && campaignData.targeting.locations[0] === companyCountryName) ? 'COUNTRY' : 
                        'CUSTOM'
                      }
                      onValueChange={(val) => {
                        if (val === 'ALL') {
                          setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, locations: [] } }));
                        } else if (val === 'COUNTRY') {
                          setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, locations: [companyCountryName] } }));
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ALL" id="loc-all" />
                        <Label htmlFor="loc-all" className="font-normal">Alle Länder und Gebiete</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="COUNTRY" id="loc-country" onClick={() => setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, locations: [companyCountryName] } }))} />
                        <Label htmlFor="loc-country" className="font-normal">{companyCountryName}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CUSTOM" id="loc-custom" />
                        <Label htmlFor="loc-custom" className="font-normal">Weiteren Standort eingeben</Label>
                      </div>
                    </RadioGroup>
                    
                    <div className="pt-2">
                      <Input 
                        placeholder="Standort eingeben (z.B. Berlin)" 
                        className="max-w-md"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value.trim();
                            if (val && !campaignData.targeting.locations.includes(val)) {
                              setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, locations: [...prev.targeting.locations, val] } }));
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {campaignData.targeting.locations.map(loc => (
                          <Badge key={loc} variant="secondary" className="flex items-center gap-1">
                            {loc} <X className="w-3 h-3 cursor-pointer" onClick={() => setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, locations: prev.targeting.locations.filter(l => l !== loc) } }))} />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Location Options */}
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      <div className="flex items-center gap-2 mb-4 cursor-pointer group" onClick={() => togglePanel('location-options')}>
                        <h4 className="text-sm font-medium text-gray-700 group-hover:text-teal-700">Standortoptionen</h4>
                        {expandedPanels['location-options'] ? 
                          <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        }
                      </div>
                      
                      {expandedPanels['location-options'] && (
                        <div className="pl-4 space-y-4 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium text-gray-700">Hinzufügen</Label>
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                            </div>
                            <RadioGroup 
                              value={campaignData.targeting.locationOption}
                              onValueChange={(val) => setCampaignData(prev => ({ 
                                ...prev, 
                                targeting: { ...prev.targeting, locationOption: val as any } 
                              }))}
                            >
                              <div className="flex items-start space-x-3">
                                <RadioGroupItem value="PRESENCE_OR_INTEREST" id="loc-opt-pi" className="mt-1" />
                                <div className="space-y-1">
                                  <Label htmlFor="loc-opt-pi" className="font-normal cursor-pointer">
                                    Präsenz oder Interesse: Nutzer, die sich gerade oder regelmäßig an Ihren eingeschlossenen Standorten aufhalten oder Interesse daran gezeigt haben (empfohlen)
                                  </Label>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3">
                                <RadioGroupItem value="PRESENCE" id="loc-opt-p" className="mt-1" />
                                <div className="space-y-1">
                                  <Label htmlFor="loc-opt-p" className="font-normal cursor-pointer">
                                    Präsenz: Nutzer, die sich gerade oder regelmäßig an Ihren eingeschlossenen Standorten aufhalten
                                  </Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ExpansionPanel>

                <ExpansionPanel 
                  id="settings-languages" 
                  title="Sprachen"
                  summary={campaignData.targeting.languages.join(', ') || 'Alle Sprachen'}
                  isOpen={expandedPanels['settings-languages']}
                  onToggle={() => togglePanel('settings-languages')}
                >
                  <div className="flex gap-8">
                    {/* Left Column: Selection */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-normal text-gray-700">Wählen Sie die Sprachen aus, die Ihre Kunden sprechen.</Label>
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                      </div>
                      
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <Input 
                          placeholder="Mit Eingabe beginnen oder Sprache auswählen" 
                          className="pl-10 h-12 text-base"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = e.currentTarget.value.trim();
                              if (val && !campaignData.targeting.languages.includes(val)) {
                                setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, languages: [...prev.targeting.languages, val] } }));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {campaignData.targeting.languages.map(lang => (
                          <Badge 
                            key={lang} 
                            variant="secondary" 
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-normal bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-200"
                          >
                            {lang} 
                            <X 
                              className="w-4 h-4 cursor-pointer text-gray-500 hover:text-gray-700 ml-1" 
                              onClick={() => setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, languages: prev.targeting.languages.filter(l => l !== lang) } }))} 
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-gray-200 self-stretch" />

                    {/* Right Column: Suggestions */}
                    <div className="w-80 space-y-4">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Basierend auf Ihren Zielregionen könnten Sie außerdem folgende Sprachen hinzufügen:
                      </p>
                      
                      <div className="space-y-2">
                        {['English', 'Griechisch', 'Russisch'].filter(lang => !campaignData.targeting.languages.includes(lang)).map(lang => (
                          <div 
                            key={lang}
                            className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-full hover:bg-gray-50 cursor-pointer transition-colors group"
                            onClick={() => setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, languages: [...prev.targeting.languages, lang] } }))}
                          >
                            <span className="text-gray-700 font-medium">{lang}</span>
                            <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                          </div>
                        ))}
                        
                        {['English', 'Griechisch', 'Russisch'].every(lang => campaignData.targeting.languages.includes(lang)) && (
                          <p className="text-sm text-gray-400 italic">Keine weiteren Vorschläge verfügbar.</p>
                        )}
                      </div>

                      {['English', 'Griechisch', 'Russisch'].some(lang => !campaignData.targeting.languages.includes(lang)) && (
                        <div className="pt-2">
                          <button 
                            className="text-teal-600 hover:text-teal-700 font-medium text-sm hover:underline"
                            onClick={() => {
                              const newLangs = ['English', 'Griechisch', 'Russisch'].filter(l => !campaignData.targeting.languages.includes(l));
                              setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, languages: [...prev.targeting.languages, ...newLangs] } }));
                            }}
                          >
                            Alle hinzufügen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </ExpansionPanel>

                <ExpansionPanel 
                  id="settings-political" 
                  title="Werbung mit politischen Inhalten in der EU"
                  summary={campaignData.targeting.politicalContent === null ? 'Nicht angegeben' : (campaignData.targeting.politicalContent ? 'Ja' : 'Nein')}
                  isOpen={expandedPanels['settings-political']}
                  onToggle={() => togglePanel('settings-political')}
                >
                  <div className="space-y-4">
                    <Label className="text-base font-normal">Enthält Ihre Kampagne Werbung mit politischen Inhalten, die die Europäische Union betreffen?</Label>
                    <RadioGroup 
                      value={campaignData.targeting.politicalContent === null ? undefined : (campaignData.targeting.politicalContent ? 'YES' : 'NO')}
                      onValueChange={(val) => setCampaignData(prev => ({ ...prev, targeting: { ...prev.targeting, politicalContent: val === 'YES' } }))}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="YES" id="pol-yes" />
                        <Label htmlFor="pol-yes" className="font-normal">Ja, diese Kampagne enthält Werbung mit politischen Inhalten in der EU</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="NO" id="pol-no" />
                        <Label htmlFor="pol-no" className="font-normal">Nein, diese Kampagne enthält keine Werbung mit politischen Inhalten in der EU</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </ExpansionPanel>

                <ExpansionPanel 
                  id="settings-audience" 
                  title="Zielgruppensegmente"
                  summary="Wählen Sie Zielgruppensegmente aus, die Ihrer Kampagne hinzugefügt werden sollen."
                  isOpen={expandedPanels['settings-audience']}
                  onToggle={() => togglePanel('settings-audience')}
                >
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white flex h-[600px]">
                      {/* Left Side: Picker */}
                      <div className="flex-1 flex flex-col border-r border-gray-200">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                          <button
                            className={cn(
                              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                              audienceActiveTab === 'SEARCH' ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                            onClick={() => setAudienceActiveTab('SEARCH')}
                          >
                            Suche
                          </button>
                          <button
                            className={cn(
                              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                              audienceActiveTab === 'BROWSE' ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                            onClick={() => setAudienceActiveTab('BROWSE')}
                          >
                            Stöbern
                          </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              placeholder="Suchen (z.B. &quot;geschäftsdienstleistungen&quot; ausprobieren)" 
                              className="pl-9"
                              value={audienceSearchQuery}
                              onChange={(e) => setAudienceSearchQuery(e.target.value)}
                            />
                            {audienceSearchQuery && (
                              <X 
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                                onClick={() => setAudienceSearchQuery('')}
                              />
                            )}
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                          {audienceActiveTab === 'SEARCH' ? (
                            <>
                              {isSearchingAudiences ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                </div>
                              ) : (
                                <>
                                  {/* Affinity */}
                                  {audienceSegments.affinity.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between group cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <Checkbox 
                                            checked={audienceSegments.affinity.every(s => selectedAudiences.includes(s.id))}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                audienceSegments.affinity.forEach(s => {
                                                  if (!selectedAudiences.includes(s.id)) toggleAudience(s);
                                                });
                                              } else {
                                                audienceSegments.affinity.forEach(s => {
                                                  if (selectedAudiences.includes(s.id)) toggleAudience(s);
                                                });
                                              }
                                            }}
                                          />
                                          <span className="font-medium text-sm text-gray-700">Interessen und Kaufverhalten der Zielgruppe ({audienceSegments.affinity.length})</span>
                                        </div>
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <div className="pl-6 space-y-1">
                                        {audienceSegments.affinity.map(segment => (
                                          <div key={segment.id} className="flex items-start gap-3 py-1.5 hover:bg-gray-50 rounded px-2 -mx-2 group">
                                            <Checkbox 
                                              id={segment.id}
                                              checked={selectedAudiences.includes(segment.id)}
                                              onCheckedChange={() => toggleAudience(segment)}
                                              className="mt-0.5"
                                            />
                                            <div className="flex-1">
                                              <HoverCard openDelay={200}>
                                                <HoverCardTrigger asChild>
                                                  <div className="inline-flex items-center gap-2">
                                                    <Label htmlFor={segment.id} className="text-sm font-normal cursor-pointer text-gray-900 hover:text-teal-700 hover:underline decoration-teal-700/50 underline-offset-2">
                                                      {segment.name}
                                                    </Label>
                                                    <Info className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                                                  </div>
                                                </HoverCardTrigger>
                                                <AudienceHoverCardContent segment={segment} companyId={companyId} typeLabel="Interessen und Kaufverhalten" />
                                              </HoverCard>

                                              {segment.path && segment.path.length > 0 && (
                                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                  {segment.path.map((p: string, i: number) => (
                                                    <React.Fragment key={i}>
                                                      {i > 0 && <span>›</span>}
                                                      <span className="hover:underline cursor-pointer">{p}</span>
                                                    </React.Fragment>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* In-Market */}
                                  {audienceSegments.inMarket.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between group cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <Checkbox 
                                            checked={audienceSegments.inMarket.every(s => selectedAudiences.includes(s.id))}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                audienceSegments.inMarket.forEach(s => {
                                                  if (!selectedAudiences.includes(s.id)) toggleAudience(s);
                                                });
                                              } else {
                                                audienceSegments.inMarket.forEach(s => {
                                                  if (selectedAudiences.includes(s.id)) toggleAudience(s);
                                                });
                                              }
                                            }}
                                          />
                                          <span className="font-medium text-sm text-gray-700">Aktives Suchverhalten bzw. Absichten der Zielgruppe ({audienceSegments.inMarket.length})</span>
                                        </div>
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <div className="pl-6 space-y-1">
                                        {audienceSegments.inMarket.map(segment => (
                                          <div key={segment.id} className="flex items-start gap-3 py-1.5 hover:bg-gray-50 rounded px-2 -mx-2 group">
                                            <Checkbox 
                                              id={segment.id}
                                              checked={selectedAudiences.includes(segment.id)}
                                              onCheckedChange={() => toggleAudience(segment)}
                                              className="mt-0.5"
                                            />
                                            <div className="flex-1">
                                              <HoverCard openDelay={200}>
                                                <HoverCardTrigger asChild>
                                                  <div className="inline-flex items-center gap-2">
                                                    <Label htmlFor={segment.id} className="text-sm font-normal cursor-pointer text-gray-900 hover:text-teal-700 hover:underline decoration-teal-700/50 underline-offset-2">
                                                      {segment.name}
                                                    </Label>
                                                    <Info className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                                                  </div>
                                                </HoverCardTrigger>
                                                <AudienceHoverCardContent segment={segment} companyId={companyId} typeLabel="Kaufbereites Segment" />
                                              </HoverCard>

                                              {segment.path && segment.path.length > 0 && (
                                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                  {segment.path.map((p: string, i: number) => (
                                                    <React.Fragment key={i}>
                                                      {i > 0 && <span>›</span>}
                                                      <span className="hover:underline cursor-pointer">{p}</span>
                                                    </React.Fragment>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Demographics */}
                                  {audienceSegments.demographics.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between group cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <Checkbox 
                                            checked={audienceSegments.demographics.every(s => selectedAudiences.includes(s.id))}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                audienceSegments.demographics.forEach(s => {
                                                  if (!selectedAudiences.includes(s.id)) toggleAudience(s);
                                                });
                                              } else {
                                                audienceSegments.demographics.forEach(s => {
                                                  if (selectedAudiences.includes(s.id)) toggleAudience(s);
                                                });
                                              }
                                            }}
                                          />
                                          <span className="font-medium text-sm text-gray-700">Charakteristik der Zielgruppe ({audienceSegments.demographics.length})</span>
                                        </div>
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <div className="pl-6 space-y-1">
                                        {audienceSegments.demographics.map(segment => (
                                          <div key={segment.id} className="flex items-start gap-3 py-1.5 hover:bg-gray-50 rounded px-2 -mx-2 group">
                                            <Checkbox 
                                              id={segment.id}
                                              checked={selectedAudiences.includes(segment.id)}
                                              onCheckedChange={() => toggleAudience(segment)}
                                              className="mt-0.5"
                                            />
                                            <div className="flex-1">
                                              <HoverCard openDelay={200}>
                                                <HoverCardTrigger asChild>
                                                  <div className="inline-flex items-center gap-2">
                                                    <Label htmlFor={segment.id} className="text-sm font-normal cursor-pointer text-gray-900 hover:text-teal-700 hover:underline decoration-teal-700/50 underline-offset-2">
                                                      {segment.name}
                                                    </Label>
                                                    <Info className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                                                  </div>
                                                </HoverCardTrigger>
                                                <AudienceHoverCardContent segment={segment} companyId={companyId} typeLabel="Detaillierte demografische Merkmale" />
                                              </HoverCard>

                                              {segment.path && segment.path.length > 0 && (
                                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                  {segment.path.map((p: string, i: number) => (
                                                    <React.Fragment key={i}>
                                                      {i > 0 && <span>›</span>}
                                                      <span className="hover:underline cursor-pointer">{p}</span>
                                                    </React.Fragment>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Empty State */}
                                  {!isSearchingAudiences && !audienceError &&
                                   audienceSegments.affinity.length === 0 && 
                                   audienceSegments.inMarket.length === 0 && 
                                   audienceSegments.demographics.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                      {audienceSearchQuery ? 'Keine Ergebnisse gefunden.' : 'Geben Sie einen Suchbegriff ein, um Zielgruppen zu finden.'}
                                    </div>
                                  )}

                                  {/* Error State */}
                                  {!isSearchingAudiences && audienceError && (
                                    <div className="text-center py-8 text-red-500 bg-red-50 rounded-md mx-4">
                                      <p className="font-medium">Fehler bei der Suche</p>
                                      <p className="text-sm mt-1">{audienceError}</p>
                                    </div>
                                  )}

                                  {/* New Segment Button */}
                                  <div className="pt-4">
                                    <Button variant="ghost" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 pl-0">
                                      <Plus className="w-4 h-4 mr-2" />
                                      Neues Segment
                                    </Button>
                                  </div>
                                </>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              <p>Stöbern-Funktion in dieser Demo nicht verfügbar.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Selected */}
                      <div className="w-64 bg-gray-50 flex flex-col">
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {selectedAudiences.length > 0 ? `${selectedAudiences.length} ausgewählt` : 'Nichts ausgewählt'}
                          </span>
                          {selectedAudiences.length > 0 && (
                            <button 
                              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                              onClick={() => {
                                setSelectedAudiences([]);
                                setSelectedAudienceDetails(new Map());
                              }}
                            >
                              Alle löschen
                            </button>
                          )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          {selectedAudiences.length === 0 ? (
                            <div className="text-center py-8 px-4">
                              <p className="text-sm text-gray-400">Wählen Sie ein oder mehrere zu beobachtende Segmente aus.</p>
                            </div>
                          ) : (
                            Array.from(selectedAudienceDetails.values()).map(segment => (
                                <div key={segment.id} className="bg-white p-2 rounded border border-gray-200 shadow-sm flex items-start gap-2 group">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 truncate" title={segment.name}>{segment.name}</p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {segment.path && segment.path.length > 0 ? segment.path[segment.path.length - 1] : 'Segment'}
                                    </p>
                                  </div>
                                  <X 
                                    className="w-4 h-4 text-gray-400 cursor-pointer hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => toggleAudience(segment)}
                                  />
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Ausrichtungseinstellung für diese Kampagne</h4>
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                      </div>
                      
                      <RadioGroup 
                        value={campaignData.targeting.audienceTargeting}
                        onValueChange={(val) => setCampaignData(prev => ({ 
                          ...prev, 
                          targeting: { ...prev.targeting, audienceTargeting: val as any } 
                        }))}
                        className="space-y-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="TARGETING" id="aud-targeting" />
                            <Label htmlFor="aud-targeting" className="font-normal cursor-pointer">Ausrichtung</Label>
                          </div>
                          <p className="text-sm text-gray-500 pl-7">
                            Sie können die Reichweite der Kampagne auf ausgewählte Segmente beschränken und haben die Möglichkeit, Gebote anzupassen
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="OBSERVATION" id="aud-observation" />
                            <Label htmlFor="aud-observation" className="font-normal cursor-pointer">Beobachtung (empfohlen)</Label>
                          </div>
                          <p className="text-sm text-gray-500 pl-7">
                            Die Reichweite der Kampagne wird nicht eingeschränkt und Sie können die Gebote für die ausgewählten Segmente anpassen
                          </p>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </ExpansionPanel>

                {/* More Settings */}
                <div className="mt-8">
                  <div 
                    className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 mb-4"
                    onClick={() => togglePanel('more-settings-container')}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Weitere Einstellungen</span>
                    {expandedPanels['more-settings-container'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {expandedPanels['more-settings-container'] && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pl-2 border-l-2 border-gray-100 ml-2">
                      
                      {/* Ad Rotation */}
                      <ExpansionPanel 
                        id="settings-rotation" 
                        title="Anzeigenrotation"
                        summary="Optimieren: leistungsstärkste Anzeigen bevorzugt bereitstellen"
                        isOpen={expandedPanels['settings-rotation']}
                        onToggle={() => togglePanel('settings-rotation')}
                      >
                        <div className="space-y-4">
                          <RadioGroup defaultValue="OPTIMIZE">
                            <div className="flex items-start space-x-3">
                              <RadioGroupItem value="OPTIMIZE" id="rot-opt" className="mt-1" />
                              <div className="space-y-1">
                                <Label htmlFor="rot-opt" className="font-normal cursor-pointer">Optimieren: leistungsstärkste Anzeigen bevorzugt bereitstellen</Label>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <RadioGroupItem value="NO_OPTIMIZE" id="rot-no-opt" className="mt-1" />
                              <div className="space-y-1">
                                <Label htmlFor="rot-no-opt" className="font-normal cursor-pointer">Nicht optimieren: Anzeigen unbegrenzt wechseln</Label>
                                <p className="text-sm text-gray-500">Nicht empfohlen für die meisten Werbetreibenden</p>
                              </div>
                            </div>
                          </RadioGroup>
                        </div>
                      </ExpansionPanel>

                      {/* Dates */}
                      <ExpansionPanel 
                        id="settings-dates" 
                        title="Start- und Enddatum"
                        summary={`Startdatum: ${new Date(campaignData.schedule.startDate).toLocaleDateString('de-DE')} ${campaignData.schedule.endDate ? `, Enddatum: ${new Date(campaignData.schedule.endDate).toLocaleDateString('de-DE')}` : ', Enddatum: Nicht festgelegt'}`}
                        isOpen={expandedPanels['settings-dates']}
                        onToggle={() => togglePanel('settings-dates')}
                      >
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Startdatum</Label>
                            <Input 
                              type="date" 
                              value={campaignData.schedule.startDate}
                              onChange={(e) => setCampaignData(prev => ({ ...prev, schedule: { ...prev.schedule, startDate: e.target.value } }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Enddatum</Label>
                            <div className="space-y-2">
                              <RadioGroup 
                                value={campaignData.schedule.endDate ? 'SET' : 'NONE'}
                                onValueChange={(val) => {
                                  if (val === 'NONE') {
                                    setCampaignData(prev => ({ ...prev, schedule: { ...prev.schedule, endDate: undefined } }));
                                  } else {
                                    // Set default end date to 1 month from now if not set
                                    const nextMonth = new Date();
                                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                                    setCampaignData(prev => ({ ...prev, schedule: { ...prev.schedule, endDate: nextMonth.toISOString().split('T')[0] } }));
                                  }
                                }}
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="NONE" id="date-none" />
                                  <Label htmlFor="date-none" className="font-normal">Nicht festgelegt</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="SET" id="date-set" />
                                  <Label htmlFor="date-set" className="font-normal">Datum auswählen</Label>
                                </div>
                              </RadioGroup>
                              {campaignData.schedule.endDate && (
                                <Input 
                                  type="date" 
                                  value={campaignData.schedule.endDate}
                                  onChange={(e) => setCampaignData(prev => ({ ...prev, schedule: { ...prev.schedule, endDate: e.target.value } }))}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </ExpansionPanel>

                      {/* Ad Schedule */}
                      <ExpansionPanel 
                        id="settings-schedule" 
                        title="Werbezeitplaner"
                        summary="Ganztägig"
                        isOpen={expandedPanels['settings-schedule']}
                        onToggle={() => togglePanel('settings-schedule')}
                      >
                        <div className="space-y-4">
                          <p className="text-sm text-gray-500">Legen Sie fest, wann Ihre Anzeigen ausgeliefert werden sollen.</p>
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 text-sm">
                            Erweiterte Zeitplanung ist in dieser Version vereinfacht. Standardmäßig werden Anzeigen ganztägig ausgeliefert.
                          </div>
                        </div>
                      </ExpansionPanel>

                      {/* URL Options */}
                      <ExpansionPanel 
                        id="settings-url" 
                        title="URL-Optionen für die Kampagne"
                        summary="Keine Optionen festgelegt"
                        isOpen={expandedPanels['settings-url']}
                        onToggle={() => togglePanel('settings-url')}
                      >
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Vorlage für Tracking</Label>
                            <Input placeholder="{lpurl}?campaign_id={campaignid}" />
                          </div>
                          <div className="space-y-2">
                            <Label>Suffix der finalen URL</Label>
                            <Input placeholder="param1=value1&param2=value2" />
                          </div>
                        </div>
                      </ExpansionPanel>

                      {/* Page Feeds */}
                      <ExpansionPanel 
                        id="settings-feeds" 
                        title="Seitenfeeds"
                        summary="Ihrer Kampagne Seitenfeeds hinzufügen"
                        isOpen={expandedPanels['settings-feeds']}
                        onToggle={() => togglePanel('settings-feeds')}
                      >
                        <div className="space-y-4">
                          <p className="text-sm text-gray-500">Verwenden Sie Seitenfeeds, um festzulegen, welche URLs in Ihren Anzeigen verwendet werden sollen.</p>
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 text-sm">
                            Seitenfeeds sind in dieser Version noch nicht verfügbar.
                          </div>
                        </div>
                      </ExpansionPanel>

                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. AI Max */}
            {activeStep === 'aimax' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-normal text-gray-800 mb-6">AI Max für Suchkampagnen</h2>
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-start gap-4">
                      <Sparkles className="w-8 h-8 text-teal-600 shrink-0" />
                      <div>
                        <h3 className="font-medium text-lg mb-2">Optimale KI-basierte Leistung in der Google Suche</h3>
                        <p className="text-gray-600 mb-4">Werbetreibende, die AI Max in Suchkampagnen aktivieren, erzielen in der Regel 14 % mehr Conversions.</p>
                        
                        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                          <Checkbox 
                            id="aiMax" 
                            checked={campaignData.aiMax}
                            onCheckedChange={(checked) => setCampaignData(prev => ({ ...prev, aiMax: checked === true }))}
                          />
                          <Label htmlFor="aiMax" className="font-medium cursor-pointer">
                            Kampagne mit AI Max optimieren <Badge variant="secondary" className="ml-2">Beta</Badge>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 5. Assets */}
            {activeStep === 'assets' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-normal text-gray-800 mb-6">Keywords und Assets erstellen</h2>
                
                <ExpansionPanel 
                  id="assets-generation" 
                  title="Hilfe bei der Anzeigenerstellung erhalten"
                  summary="Google AI generiert anhand Ihrer URL und der von Ihnen bereitgestellten Informationen Assets."
                  isOpen={expandedPanels['assets-generation']}
                  onToggle={() => togglePanel('assets-generation')}
                >
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="finalUrl">Wohin werden Nutzer weitergeleitet, wenn sie auf Ihre Anzeige klicken?</Label>
                      <Input 
                        id="finalUrl"
                        placeholder="https://www.example.com"
                        value={campaignData.ads[0].finalUrl}
                        onChange={(e) => {
                          const newAds = [...campaignData.ads];
                          newAds[0].finalUrl = e.target.value;
                          setCampaignData(prev => ({ ...prev, ads: newAds }));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessDescription">Was macht Ihre Produkte oder Dienstleistungen besonders?</Label>
                      <Textarea 
                        id="businessDescription"
                        placeholder="Beschreiben Sie das Produkt oder die Dienstleistung..."
                        className="h-32"
                        value={campaignData.businessDescription}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, businessDescription: e.target.value }))}
                      />
                    </div>
                  </div>
                </ExpansionPanel>
              </div>
            )}

            {/* 6. Keywords & Ads */}
            {activeStep === 'keywords_ads' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-normal text-gray-800 mb-6">Keywords und Anzeigen</h2>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Keywords</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      {campaignData.targeting.keywords.length === 0 && (
                        <p className="text-sm text-gray-500 italic">Noch keine Keywords hinzugefügt.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Anzeige</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label>Anzeigentitel (mindestens 3)</Label>
                      {campaignData.ads[0].headlines.map((headline, index) => (
                        <Input
                          key={index}
                          value={headline}
                          onChange={(e) => {
                            const newAds = [...campaignData.ads];
                            newAds[0].headlines[index] = e.target.value;
                            setCampaignData(prev => ({ ...prev, ads: newAds }));
                          }}
                          placeholder={`Anzeigentitel ${index + 1} (max. 30 Zeichen)`}
                          maxLength={30}
                        />
                      ))}
                    </div>

                    <div className="space-y-4">
                      <Label>Beschreibungen (mindestens 2)</Label>
                      {campaignData.ads[0].descriptions.map((description, index) => (
                        <Textarea
                          key={index}
                          value={description}
                          onChange={(e) => {
                            const newAds = [...campaignData.ads];
                            newAds[0].descriptions[index] = e.target.value;
                            setCampaignData(prev => ({ ...prev, ads: newAds }));
                          }}
                          placeholder={`Beschreibung ${index + 1} (max. 90 Zeichen)`}
                          maxLength={90}
                          rows={2}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 7. Budget */}
            {activeStep === 'budget' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-normal text-gray-800 mb-6">Budget</h2>
                
                <ExpansionPanel 
                  id="budget-main" 
                  title="Budget"
                  summary={`${campaignData.budget.dailyBudget} €/Tag`}
                  isOpen={expandedPanels['budget-main']}
                  onToggle={() => togglePanel('budget-main')}
                >
                  <div className="space-y-4">
                    <Label className="text-base font-normal">Durchschnittliches Tagesbudget für diese Kampagne festlegen</Label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <Input
                        type="number"
                        min="1"
                        className="text-lg"
                        value={campaignData.budget.dailyBudget}
                        onChange={(e) => setCampaignData(prev => ({
                          ...prev,
                          budget: { ...prev.budget, dailyBudget: Number(e.target.value) }
                        }))}
                      />
                      <span className="text-lg text-gray-500">€</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Pro Monat zahlen Sie nicht mehr als Ihr Tagesbudget multipliziert mit der durchschnittlichen Anzahl der Tage des Monats.
                    </p>
                  </div>
                </ExpansionPanel>
              </div>
            )}

            {/* 8. Review */}
            {activeStep === 'review' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-normal text-gray-800 mb-6">Überprüfen</h2>
                
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-gray-500">Kampagnenname</Label>
                        <p className="font-medium text-lg">{campaignData.name || 'Nicht angegeben'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Budget</Label>
                        <p className="font-medium text-lg">{campaignData.budget.dailyBudget} €/Tag</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Gebotsstrategie</Label>
                        <p className="font-medium">{biddingFocusOptions.find(o => o.value.includes(campaignData.biddingStrategy.type.split('_')[1]))?.label || campaignData.biddingStrategy.type}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Standorte</Label>
                        <p className="font-medium">{campaignData.targeting.locations.join(', ') || 'Alle'}</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
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
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isSubmitting ? 'Wird erstellt...' : 'Kampagne veröffentlichen'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>

          {/* Navigation Buttons */}
          {activeStep !== 'review' && (
            <div className="mt-8 flex justify-end">
              <Button 
                onClick={handleNext}
                className="bg-teal-600 hover:bg-teal-700 text-white px-8"
              >
                Weiter
              </Button>
            </div>
          )}
          
        </div>
      </div>

      {/* Customer Acquisition Optimization Modal */}
      <Dialog open={showAcquisitionModal} onOpenChange={setShowAcquisitionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal">Jetzt im Hinblick auf das Zielvorhaben „Kundenakquisition“ optimieren</DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              Für diese Kampagne wird derzeit die Gebotsstrategie „{
                biddingFocusOptions.find(o => o.value === (
                    campaignData.biddingStrategy.type === 'MAXIMIZE_CONVERSIONS' || campaignData.biddingStrategy.type === 'TARGET_CPA' ? 'CONVERSIONS' :
                    campaignData.biddingStrategy.type === 'MAXIMIZE_CONVERSION_VALUE' || campaignData.biddingStrategy.type === 'TARGET_ROAS' ? 'CONVERSION_VALUE' :
                    campaignData.biddingStrategy.type === 'MAXIMIZE_CLICKS' || campaignData.biddingStrategy.type === 'MANUAL_CPC' ? 'CLICKS' :
                    campaignData.biddingStrategy.type === 'TARGET_IMPRESSION_SHARE' ? 'IMPRESSION_SHARE' : 'CONVERSIONS'
                  ))?.label || 'Conversions'
              } maximieren“ verwendet. Wenn für Neukunden höhere Gebote als für Bestandskunden abgegeben werden sollen, müssen Sie auf eine Strategie mit wertbezogenen Geboten zurückgreifen.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <h4 className="font-medium mb-4">Vorgehensweise wählen</h4>
            
            <div className="border rounded-lg p-4 space-y-4">
              <RadioGroup 
                value={acquisitionModalSelection} 
                onValueChange={(val) => setAcquisitionModalSelection(val as any)}
              >
                {/* Option 1 */}
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="SWITCH_STRATEGY" id="opt-switch" className="mt-1" />
                  <div className="space-y-3 flex-1">
                    <Label htmlFor="opt-switch" className="font-normal text-base cursor-pointer">
                      Gebotsstrategie „Conversion-Wert maximieren“ verwenden (empfohlen)
                    </Label>
                    
                    {acquisitionModalSelection === 'SWITCH_STRATEGY' && (
                      <div className="pl-0 pt-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <Checkbox 
                            id="modal-roas" 
                            checked={acquisitionModalRoasEnabled}
                            onCheckedChange={(checked) => setAcquisitionModalRoasEnabled(checked === true)}
                          />
                          <Label htmlFor="modal-roas" className="font-normal cursor-pointer">
                            Ziel-ROAS festlegen (optional)
                          </Label>
                        </div>

                        {acquisitionModalRoasEnabled && (
                          <div className="pl-6">
                            <div className="flex items-center gap-2 mb-1">
                              <Label className="text-sm text-gray-600">Ziel-ROAS</Label>
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex items-center gap-2 w-[100px]">
                              <Input 
                                type="number" 
                                className="text-right px-2"
                                defaultValue={200}
                                onChange={() => {
                                  // Optional: Handle ROAS value change if needed for state
                                }}
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Option 2 */}
                <div className="flex items-start space-x-3 pt-2">
                  <RadioGroupItem value="ONLY_NEW" id="opt-only-new" className="mt-1" />
                  <Label htmlFor="opt-only-new" className="font-normal text-base cursor-pointer">
                    Gebotsabgabe nur für Neukunden, ohne die Gebotsstrategie zu ändern
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcquisitionModal(false)}>Abbrechen</Button>
            <Button onClick={handleAcquisitionModalConfirm} className="bg-teal-600 hover:bg-teal-700">Bestätigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Right Sidebar Panel */}
      <div className={cn(
        "bg-white border-l border-gray-200 transition-all duration-300 ease-in-out relative shrink-0",
        isRightPanelOpen ? "w-80" : "w-0"
      )}>
        <div 
            className="absolute -left-4 top-6 bg-white border border-gray-200 border-r-0 rounded-l-md cursor-pointer shadow-sm hover:bg-gray-50 z-10 flex items-center justify-center h-10 w-4"
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
        >
            {isRightPanelOpen ? <ChevronRight className="w-3 h-3 text-gray-500" /> : <ChevronLeft className="w-3 h-3 text-gray-500" />}
        </div>

        <div className={cn("h-full overflow-y-auto w-80", isRightPanelOpen ? "block" : "hidden")}>
            <div className="p-6 space-y-6">
                {/* Weekly Estimates Header */}
                <div>
                    <div className="flex items-center gap-2 text-gray-900 mb-1">
                        <LineChart className="w-5 h-5 text-gray-500" />
                        <h2 className="font-medium text-base">Wöchentliche Schätzungen</h2>
                    </div>
                    <p className="text-xs text-gray-500">
                        Schätzungen basieren auf Ihren Keywords und Ihrem Tagesbudget
                    </p>
                </div>

                {/* Zero State / Not enough data */}
                <div className="py-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <LineChart className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                        Die geschätzte Leistung ist zu sehen nach Angabe von
                    </p>
                    <ul className="text-sm font-medium text-gray-900">
                        <li>Keywords</li>
                    </ul>
                </div>

                <div className="h-px bg-gray-200 my-4" />

                {/* Optiscore Section */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700">Optimierungsfaktor</span>
                        </div>
                        <span className="text-sm font-bold text-gray-400">--.-%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-600 w-0"></div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
