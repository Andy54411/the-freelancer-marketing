import React, { useState, useEffect } from 'react';
import { MarketingberaterData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface MarketingberaterFormProps {
  data: MarketingberaterData;
  onDataChange: (data: MarketingberaterData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MarketingberaterForm: React.FC<MarketingberaterFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MarketingberaterData>(data);

  const serviceTypeOptions = [
    { value: 'marketing_strategie', label: 'Marketing-Strategie' },
    { value: 'digital_marketing', label: 'Digital Marketing' },
    { value: 'online_marketing', label: 'Online Marketing' },
    { value: 'social_media_marketing', label: 'Social Media Marketing' },
    { value: 'content_marketing', label: 'Content Marketing' },
    { value: 'email_marketing', label: 'E-Mail Marketing' },
    { value: 'influencer_marketing', label: 'Influencer Marketing' },
    { value: 'affiliate_marketing', label: 'Affiliate Marketing' },
    { value: 'performance_marketing', label: 'Performance Marketing' },
    { value: 'growth_marketing', label: 'Growth Marketing' },
    { value: 'brand_marketing', label: 'Brand Marketing' },
    { value: 'product_marketing', label: 'Product Marketing' },
    { value: 'event_marketing', label: 'Event Marketing' },
    { value: 'guerilla_marketing', label: 'Guerilla Marketing' },
    { value: 'viral_marketing', label: 'Viral Marketing' },
    { value: 'mobile_marketing', label: 'Mobile Marketing' },
    { value: 'video_marketing', label: 'Video Marketing' },
    { value: 'podcast_marketing', label: 'Podcast Marketing' },
    { value: 'seo_consulting', label: 'SEO Consulting' },
    { value: 'sea_consulting', label: 'SEA Consulting' },
    { value: 'ppc_consulting', label: 'PPC Consulting' },
    { value: 'conversion_optimierung', label: 'Conversion-Optimierung' },
    { value: 'marketing_automation', label: 'Marketing Automation' },
    { value: 'crm_consulting', label: 'CRM Consulting' },
    { value: 'lead_generation', label: 'Lead Generation' },
    { value: 'customer_retention', label: 'Customer Retention' },
    { value: 'market_research', label: 'Marktforschung' },
    { value: 'competitor_analysis', label: 'Konkurrenzanalyse' },
    { value: 'marketing_audit', label: 'Marketing-Audit' },
    { value: 'andere', label: 'Andere' },
  ];

  const marketingGoalOptions = [
    { value: 'brand_awareness', label: 'Brand Awareness' },
    { value: 'lead_generation', label: 'Lead Generation' },
    { value: 'sales_increase', label: 'Umsatzsteigerung' },
    { value: 'customer_acquisition', label: 'Kundengewinnung' },
    { value: 'customer_retention', label: 'Kundenbindung' },
    { value: 'market_expansion', label: 'Marktexpansion' },
    { value: 'product_launch', label: 'Produktlaunch' },
    { value: 'traffic_increase', label: 'Traffic-Steigerung' },
    { value: 'conversion_optimization', label: 'Conversion-Optimierung' },
    { value: 'roi_improvement', label: 'ROI-Verbesserung' },
    { value: 'cost_reduction', label: 'Kostenreduzierung' },
    { value: 'engagement_increase', label: 'Engagement-Steigerung' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_1000', label: 'Unter 1000€' },
    { value: '1000_5000', label: '1000€ - 5000€' },
    { value: '5000_10000', label: '5000€ - 10000€' },
    { value: '10000_25000', label: '10000€ - 25000€' },
    { value: '25000_50000', label: '25000€ - 50000€' },
    { value: 'über_50000', label: 'Über 50000€' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const projectSizeOptions = [
    { value: 'klein', label: 'Klein' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'gross', label: 'Groß' },
    { value: 'sehr_gross', label: 'Sehr groß' },
  ];

  const companySizeOptions = [
    { value: 'startup', label: 'Startup (1-10 Mitarbeiter)' },
    { value: 'klein', label: 'Klein (11-50 Mitarbeiter)' },
    { value: 'mittel', label: 'Mittel (51-250 Mitarbeiter)' },
    { value: 'gross', label: 'Groß (251-1000 Mitarbeiter)' },
    { value: 'konzern', label: 'Konzern (1000+ Mitarbeiter)' },
  ];

  const industryOptions = [
    { value: 'technologie', label: 'Technologie' },
    { value: 'e_commerce', label: 'E-Commerce' },
    { value: 'saas', label: 'SaaS' },
    { value: 'fintech', label: 'FinTech' },
    { value: 'gesundheit', label: 'Gesundheit' },
    { value: 'bildung', label: 'Bildung' },
    { value: 'immobilien', label: 'Immobilien' },
    { value: 'automobil', label: 'Automobil' },
    { value: 'mode', label: 'Mode' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'reise', label: 'Reise' },
    { value: 'gastronomie', label: 'Gastronomie' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'sport', label: 'Sport' },
    { value: 'nonprofit', label: 'Nonprofit' },
    { value: 'b2b', label: 'B2B' },
    { value: 'b2c', label: 'B2C' },
    { value: 'andere', label: 'Andere' },
  ];

  const targetAudienceOptions = [
    { value: 'b2b', label: 'B2B' },
    { value: 'b2c', label: 'B2C' },
    { value: 'millennials', label: 'Millennials' },
    { value: 'gen_z', label: 'Generation Z' },
    { value: 'gen_x', label: 'Generation X' },
    { value: 'baby_boomers', label: 'Baby Boomers' },
    { value: 'männlich', label: 'Männlich' },
    { value: 'weiblich', label: 'Weiblich' },
    { value: 'divers', label: 'Divers' },
    { value: 'urban', label: 'Urban' },
    { value: 'ländlich', label: 'Ländlich' },
    { value: 'high_income', label: 'High Income' },
    { value: 'middle_income', label: 'Middle Income' },
    { value: 'low_income', label: 'Low Income' },
    { value: 'andere', label: 'Andere' },
  ];

  const marketingChannelOptions = [
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'facebook_ads', label: 'Facebook Ads' },
    { value: 'instagram_ads', label: 'Instagram Ads' },
    { value: 'linkedin_ads', label: 'LinkedIn Ads' },
    { value: 'twitter_ads', label: 'Twitter Ads' },
    { value: 'youtube_ads', label: 'YouTube Ads' },
    { value: 'tiktok_ads', label: 'TikTok Ads' },
    { value: 'pinterest_ads', label: 'Pinterest Ads' },
    { value: 'snapchat_ads', label: 'Snapchat Ads' },
    { value: 'display_advertising', label: 'Display Advertising' },
    { value: 'native_advertising', label: 'Native Advertising' },
    { value: 'programmatic_advertising', label: 'Programmatic Advertising' },
    { value: 'email_marketing', label: 'E-Mail Marketing' },
    { value: 'sms_marketing', label: 'SMS Marketing' },
    { value: 'push_notifications', label: 'Push Notifications' },
    { value: 'content_marketing', label: 'Content Marketing' },
    { value: 'influencer_marketing', label: 'Influencer Marketing' },
    { value: 'affiliate_marketing', label: 'Affiliate Marketing' },
    { value: 'seo', label: 'SEO' },
    { value: 'organic_social', label: 'Organic Social' },
    { value: 'pr', label: 'PR' },
    { value: 'events', label: 'Events' },
    { value: 'webinars', label: 'Webinars' },
    { value: 'podcasts', label: 'Podcasts' },
    { value: 'print', label: 'Print' },
    { value: 'radio', label: 'Radio' },
    { value: 'tv', label: 'TV' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'marketing_strategie_entwicklung', label: 'Marketing-Strategie-Entwicklung' },
    { value: 'go_to_market_strategie', label: 'Go-to-Market-Strategie' },
    { value: 'brand_positioning', label: 'Brand Positioning' },
    { value: 'unique_value_proposition', label: 'Unique Value Proposition' },
    { value: 'customer_journey_mapping', label: 'Customer Journey Mapping' },
    { value: 'personas_entwicklung', label: 'Personas-Entwicklung' },
    { value: 'market_segmentation', label: 'Marktsegmentierung' },
    { value: 'competitive_analysis', label: 'Wettbewerbsanalyse' },
    { value: 'swot_analysis', label: 'SWOT-Analyse' },
    { value: 'market_research', label: 'Marktforschung' },
    { value: 'customer_research', label: 'Kundenforschung' },
    { value: 'user_experience_audit', label: 'User Experience Audit' },
    { value: 'conversion_audit', label: 'Conversion-Audit' },
    { value: 'marketing_audit', label: 'Marketing-Audit' },
    { value: 'digital_audit', label: 'Digital-Audit' },
    { value: 'social_media_audit', label: 'Social Media Audit' },
    { value: 'content_audit', label: 'Content-Audit' },
    { value: 'seo_audit', label: 'SEO-Audit' },
    { value: 'sea_audit', label: 'SEA-Audit' },
    { value: 'email_audit', label: 'E-Mail-Audit' },
    { value: 'analytics_setup', label: 'Analytics-Setup' },
    { value: 'tracking_setup', label: 'Tracking-Setup' },
    { value: 'dashboard_setup', label: 'Dashboard-Setup' },
    { value: 'reporting_setup', label: 'Reporting-Setup' },
    { value: 'kpi_definition', label: 'KPI-Definition' },
    { value: 'measurement_plan', label: 'Messplan' },
    { value: 'ab_testing', label: 'A/B-Testing' },
    { value: 'multivariate_testing', label: 'Multivariate Testing' },
    { value: 'user_testing', label: 'User Testing' },
    { value: 'surveys', label: 'Umfragen' },
    { value: 'focus_groups', label: 'Fokusgruppen' },
    { value: 'interviews', label: 'Interviews' },
    { value: 'campaign_planning', label: 'Kampagnenplanung' },
    { value: 'campaign_execution', label: 'Kampagnenumsetzung' },
    { value: 'campaign_optimization', label: 'Kampagnenoptimierung' },
    { value: 'campaign_analysis', label: 'Kampagnenanalyse' },
    { value: 'media_planning', label: 'Mediaplanung' },
    { value: 'media_buying', label: 'Media Buying' },
    { value: 'budget_allocation', label: 'Budget-Allokation' },
    { value: 'roi_analysis', label: 'ROI-Analyse' },
    { value: 'performance_analysis', label: 'Performance-Analyse' },
    { value: 'attribution_modeling', label: 'Attribution-Modellierung' },
    { value: 'customer_lifetime_value', label: 'Customer Lifetime Value' },
    { value: 'churn_analysis', label: 'Churn-Analyse' },
    { value: 'retention_strategies', label: 'Retention-Strategien' },
    { value: 'loyalty_programs', label: 'Loyalitätsprogramme' },
    { value: 'referral_programs', label: 'Empfehlungsprogramme' },
    { value: 'partnership_marketing', label: 'Partnership Marketing' },
    { value: 'co_marketing', label: 'Co-Marketing' },
    { value: 'cross_selling', label: 'Cross-Selling' },
    { value: 'up_selling', label: 'Up-Selling' },
    { value: 'pricing_strategy', label: 'Preisstrategie' },
    { value: 'product_positioning', label: 'Produktpositionierung' },
    { value: 'product_launch', label: 'Produktlaunch' },
    { value: 'rebranding', label: 'Rebranding' },
    { value: 'brand_refresh', label: 'Brand Refresh' },
    { value: 'crisis_management', label: 'Krisenmanagement' },
    { value: 'reputation_management', label: 'Reputation Management' },
    { value: 'influencer_relations', label: 'Influencer Relations' },
    { value: 'media_relations', label: 'Media Relations' },
    { value: 'community_management', label: 'Community Management' },
    { value: 'social_listening', label: 'Social Listening' },
    { value: 'sentiment_analysis', label: 'Sentiment-Analyse' },
    { value: 'trend_analysis', label: 'Trend-Analyse' },
    { value: 'innovation_workshops', label: 'Innovation-Workshops' },
    { value: 'brainstorming_sessions', label: 'Brainstorming-Sessions' },
    { value: 'creative_concepts', label: 'Creative Concepts' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'content_creation', label: 'Content Creation' },
    { value: 'visual_design', label: 'Visual Design' },
    { value: 'video_production', label: 'Video Production' },
    { value: 'photography', label: 'Photography' },
    { value: 'graphic_design', label: 'Graphic Design' },
    { value: 'web_design', label: 'Web Design' },
    { value: 'landing_page_design', label: 'Landing Page Design' },
    { value: 'email_design', label: 'E-Mail Design' },
    { value: 'social_media_design', label: 'Social Media Design' },
    { value: 'training', label: 'Training' },
    { value: 'workshops', label: 'Workshops' },
    { value: 'coaching', label: 'Coaching' },
    { value: 'mentoring', label: 'Mentoring' },
    { value: 'team_building', label: 'Team Building' },
    { value: 'change_management', label: 'Change Management' },
    { value: 'process_optimization', label: 'Prozessoptimierung' },
    { value: 'automation_setup', label: 'Automation-Setup' },
    { value: 'tool_selection', label: 'Tool-Selection' },
    { value: 'tool_implementation', label: 'Tool-Implementation' },
    { value: 'integration_support', label: 'Integration-Support' },
    { value: 'technical_support', label: 'Technical Support' },
    { value: 'andere', label: 'Andere' },
  ];

  const handleInputChange = (field: keyof MarketingberaterData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.marketingGoal &&
      formData.budgetRange &&
      formData.urgency &&
      formData.projectSize &&
      formData.companySize &&
      formData.industry &&
      formData.description
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Marketingberatung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Beratung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Beratung"
            />
          </FormField>

          <FormField label="Marketing-Ziel" required>
            <FormSelect
              value={formData.marketingGoal || ''}
              onChange={value => handleInputChange('marketingGoal', value)}
              options={marketingGoalOptions}
              placeholder="Wählen Sie das Marketing-Ziel"
            />
          </FormField>

          <FormField label="Budget-Rahmen" required>
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
            />
          </FormField>

          <FormField label="Projektgröße" required>
            <FormSelect
              value={formData.projectSize || ''}
              onChange={value => handleInputChange('projectSize', value)}
              options={projectSizeOptions}
              placeholder="Wählen Sie die Projektgröße"
            />
          </FormField>

          <FormField label="Unternehmensgröße" required>
            <FormSelect
              value={formData.companySize || ''}
              onChange={value => handleInputChange('companySize', value)}
              options={companySizeOptions}
              placeholder="Wählen Sie die Unternehmensgröße"
            />
          </FormField>

          <FormField label="Branche" required>
            <FormSelect
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              options={industryOptions}
              placeholder="Wählen Sie die Branche"
            />
          </FormField>

          <FormField label="Zielgruppe">
            <FormSelect
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              options={targetAudienceOptions}
              placeholder="Wählen Sie die Zielgruppe"
            />
          </FormField>

          <FormField label="Gewünschter Starttermin">
            <FormInput
              type="text"
              value={formData.preferredStartDate || ''}
              onChange={value => handleInputChange('preferredStartDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gewünschter Liefertermin">
            <FormInput
              type="text"
              value={formData.preferredDeliveryDate || ''}
              onChange={value => handleInputChange('preferredDeliveryDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Kontaktperson">
            <FormInput
              type="text"
              value={formData.contactPerson || ''}
              onChange={value => handleInputChange('contactPerson', value)}
              placeholder="Name der Kontaktperson"
            />
          </FormField>

          <FormField label="Unternehmen">
            <FormInput
              type="text"
              value={formData.company || ''}
              onChange={value => handleInputChange('company', value)}
              placeholder="Unternehmen"
            />
          </FormField>

          <FormField label="Telefonnummer">
            <FormInput
              type="text"
              value={formData.phoneNumber || ''}
              onChange={value => handleInputChange('phoneNumber', value)}
              placeholder="Telefonnummer"
            />
          </FormField>

          <FormField label="E-Mail">
            <FormInput
              type="email"
              value={formData.email || ''}
              onChange={value => handleInputChange('email', value)}
              placeholder="E-Mail-Adresse"
            />
          </FormField>

          <FormField label="Website">
            <FormInput
              type="text"
              value={formData.website || ''}
              onChange={value => handleInputChange('website', value)}
              placeholder="Website-URL"
            />
          </FormField>

          <FormField label="Aktuelle Marketing-Ausgaben">
            <FormInput
              type="text"
              value={formData.currentMarketingSpend || ''}
              onChange={value => handleInputChange('currentMarketingSpend', value)}
              placeholder="Aktuelle Marketing-Ausgaben"
            />
          </FormField>

          <FormField label="Geplante Marketing-Ausgaben">
            <FormInput
              type="text"
              value={formData.plannedMarketingSpend || ''}
              onChange={value => handleInputChange('plannedMarketingSpend', value)}
              placeholder="Geplante Marketing-Ausgaben"
            />
          </FormField>

          <FormField label="Aktuelle Umsätze">
            <FormInput
              type="text"
              value={formData.currentRevenue || ''}
              onChange={value => handleInputChange('currentRevenue', value)}
              placeholder="Aktuelle Umsätze"
            />
          </FormField>

          <FormField label="Umsatzziel">
            <FormInput
              type="text"
              value={formData.revenueGoal || ''}
              onChange={value => handleInputChange('revenueGoal', value)}
              placeholder="Umsatzziel"
            />
          </FormField>

          <FormField label="Aktuelle Kundenzahl">
            <FormInput
              type="text"
              value={formData.currentCustomers || ''}
              onChange={value => handleInputChange('currentCustomers', value)}
              placeholder="Aktuelle Kundenzahl"
            />
          </FormField>

          <FormField label="Ziel-Kundenzahl">
            <FormInput
              type="text"
              value={formData.customerGoal || ''}
              onChange={value => handleInputChange('customerGoal', value)}
              placeholder="Ziel-Kundenzahl"
            />
          </FormField>

          <FormField label="Durchschnittlicher Bestellwert">
            <FormInput
              type="text"
              value={formData.averageOrderValue || ''}
              onChange={value => handleInputChange('averageOrderValue', value)}
              placeholder="Durchschnittlicher Bestellwert"
            />
          </FormField>

          <FormField label="Customer Lifetime Value">
            <FormInput
              type="text"
              value={formData.customerLifetimeValue || ''}
              onChange={value => handleInputChange('customerLifetimeValue', value)}
              placeholder="Customer Lifetime Value"
            />
          </FormField>

          <FormField label="Conversion Rate">
            <FormInput
              type="text"
              value={formData.conversionRate || ''}
              onChange={value => handleInputChange('conversionRate', value)}
              placeholder="Aktuelle Conversion Rate"
            />
          </FormField>

          <FormField label="Cost per Acquisition">
            <FormInput
              type="text"
              value={formData.costPerAcquisition || ''}
              onChange={value => handleInputChange('costPerAcquisition', value)}
              placeholder="Cost per Acquisition"
            />
          </FormField>

          <FormField label="Return on Ad Spend">
            <FormInput
              type="text"
              value={formData.returnOnAdSpend || ''}
              onChange={value => handleInputChange('returnOnAdSpend', value)}
              placeholder="Return on Ad Spend"
            />
          </FormField>

          <FormField label="Hauptkonkurrenten">
            <FormInput
              type="text"
              value={formData.mainCompetitors || ''}
              onChange={value => handleInputChange('mainCompetitors', value)}
              placeholder="Hauptkonkurrenten"
            />
          </FormField>

          <FormField label="Unique Selling Proposition">
            <FormInput
              type="text"
              value={formData.uniqueSellingProposition || ''}
              onChange={value => handleInputChange('uniqueSellingProposition', value)}
              placeholder="Unique Selling Proposition"
            />
          </FormField>

          <FormField label="Markenpositionierung">
            <FormInput
              type="text"
              value={formData.brandPositioning || ''}
              onChange={value => handleInputChange('brandPositioning', value)}
              placeholder="Markenpositionierung"
            />
          </FormField>

          <FormField label="Aktuelle Marketing-Kanäle">
            <FormInput
              type="text"
              value={formData.currentMarketingChannels || ''}
              onChange={value => handleInputChange('currentMarketingChannels', value)}
              placeholder="Aktuelle Marketing-Kanäle"
            />
          </FormField>

          <FormField label="Erfolgreichste Kanäle">
            <FormInput
              type="text"
              value={formData.mostSuccessfulChannels || ''}
              onChange={value => handleInputChange('mostSuccessfulChannels', value)}
              placeholder="Erfolgreichste Kanäle"
            />
          </FormField>

          <FormField label="Bisherige Herausforderungen">
            <FormInput
              type="text"
              value={formData.previousChallenges || ''}
              onChange={value => handleInputChange('previousChallenges', value)}
              placeholder="Bisherige Herausforderungen"
            />
          </FormField>

          <FormField label="Bisherige Erfolge">
            <FormInput
              type="text"
              value={formData.previousSuccesses || ''}
              onChange={value => handleInputChange('previousSuccesses', value)}
              placeholder="Bisherige Erfolge"
            />
          </FormField>

          <FormField label="Marketing-Team">
            <FormInput
              type="text"
              value={formData.marketingTeam || ''}
              onChange={value => handleInputChange('marketingTeam', value)}
              placeholder="Marketing-Team"
            />
          </FormField>

          <FormField label="Verfügbare Ressourcen">
            <FormInput
              type="text"
              value={formData.availableResources || ''}
              onChange={value => handleInputChange('availableResources', value)}
              placeholder="Verfügbare Ressourcen"
            />
          </FormField>

          <FormField label="Technische Infrastruktur">
            <FormInput
              type="text"
              value={formData.technicalInfrastructure || ''}
              onChange={value => handleInputChange('technicalInfrastructure', value)}
              placeholder="Technische Infrastruktur"
            />
          </FormField>

          <FormField label="Marketing-Tools">
            <FormInput
              type="text"
              value={formData.marketingTools || ''}
              onChange={value => handleInputChange('marketingTools', value)}
              placeholder="Aktuell verwendete Marketing-Tools"
            />
          </FormField>

          <FormField label="CRM-System">
            <FormInput
              type="text"
              value={formData.crmSystem || ''}
              onChange={value => handleInputChange('crmSystem', value)}
              placeholder="CRM-System"
            />
          </FormField>

          <FormField label="Analytics-Tools">
            <FormInput
              type="text"
              value={formData.analyticsTools || ''}
              onChange={value => handleInputChange('analyticsTools', value)}
              placeholder="Analytics-Tools"
            />
          </FormField>

          <FormField label="Langfristige Zusammenarbeit gewünscht">
            <FormRadioGroup
              name="longTermCollaboration"
              value={formData.longTermCollaboration || ''}
              onChange={value => handleInputChange('longTermCollaboration', value)}
              options={[
                { value: 'ja', label: 'Ja, langfristige Zusammenarbeit' },
                { value: 'nein', label: 'Nein, einmalige Beratung' },
                { value: 'möglich', label: 'Möglich' },
              ]}
            />
          </FormField>

          <FormField label="Inhouse-Team gewünscht">
            <FormRadioGroup
              name="inhouseTeam"
              value={formData.inhouseTeam || ''}
              onChange={value => handleInputChange('inhouseTeam', value)}
              options={[
                { value: 'ja', label: 'Ja, Inhouse-Team aufbauen' },
                { value: 'nein', label: 'Nein, externe Beratung' },
                { value: 'hybrid', label: 'Hybrid-Ansatz' },
              ]}
            />
          </FormField>

          <FormField label="Schnelle Ergebnisse gewünscht">
            <FormRadioGroup
              name="quickResults"
              value={formData.quickResults || ''}
              onChange={value => handleInputChange('quickResults', value)}
              options={[
                { value: 'ja', label: 'Ja, schnelle Ergebnisse' },
                { value: 'nein', label: 'Nein, langfristige Strategie' },
                { value: 'beides', label: 'Beides' },
              ]}
            />
          </FormField>

          <FormField label="Datengetriebene Entscheidungen">
            <FormRadioGroup
              name="dataDecisions"
              value={formData.dataDecisions || ''}
              onChange={value => handleInputChange('dataDecisions', value)}
              options={[
                { value: 'ja', label: 'Ja, datengetrieben' },
                { value: 'nein', label: 'Nein, intuitive Entscheidungen' },
                { value: 'mix', label: 'Mischung aus beiden' },
              ]}
            />
          </FormField>

          <FormField label="Risikotoleranz">
            <FormRadioGroup
              name="riskTolerance"
              value={formData.riskTolerance || ''}
              onChange={value => handleInputChange('riskTolerance', value)}
              options={[
                { value: 'niedrig', label: 'Niedrig' },
                { value: 'mittel', label: 'Mittel' },
                { value: 'hoch', label: 'Hoch' },
              ]}
            />
          </FormField>

          <FormField label="Innovation gewünscht">
            <FormRadioGroup
              name="innovation"
              value={formData.innovation || ''}
              onChange={value => handleInputChange('innovation', value)}
              options={[
                { value: 'ja', label: 'Ja, innovative Ansätze' },
                { value: 'nein', label: 'Nein, bewährte Methoden' },
                { value: 'ausgewogen', label: 'Ausgewogener Ansatz' },
              ]}
            />
          </FormField>

          <FormField label="Automatisierung gewünscht">
            <FormRadioGroup
              name="automation"
              value={formData.automation || ''}
              onChange={value => handleInputChange('automation', value)}
              options={[
                { value: 'ja', label: 'Ja, Automatisierung gewünscht' },
                { value: 'nein', label: 'Nein, manueller Ansatz' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Personalisierung gewünscht">
            <FormRadioGroup
              name="personalization"
              value={formData.personalization || ''}
              onChange={value => handleInputChange('personalization', value)}
              options={[
                { value: 'ja', label: 'Ja, Personalisierung gewünscht' },
                { value: 'nein', label: 'Nein, genereller Ansatz' },
                { value: 'segmentierung', label: 'Segmentierung' },
              ]}
            />
          </FormField>

          <FormField label="Omnichannel-Ansatz">
            <FormRadioGroup
              name="omnichannel"
              value={formData.omnichannel || ''}
              onChange={value => handleInputChange('omnichannel', value)}
              options={[
                { value: 'ja', label: 'Ja, Omnichannel-Ansatz' },
                { value: 'nein', label: 'Nein, einzelne Kanäle' },
                { value: 'multichannel', label: 'Multichannel' },
              ]}
            />
          </FormField>

          <FormField label="Mobile-First-Ansatz">
            <FormRadioGroup
              name="mobileFirst"
              value={formData.mobileFirst || ''}
              onChange={value => handleInputChange('mobileFirst', value)}
              options={[
                { value: 'ja', label: 'Ja, Mobile-First' },
                { value: 'nein', label: 'Nein, Desktop-First' },
                { value: 'responsive', label: 'Responsive' },
              ]}
            />
          </FormField>

          <FormField label="Social Commerce">
            <FormRadioGroup
              name="socialCommerce"
              value={formData.socialCommerce || ''}
              onChange={value => handleInputChange('socialCommerce', value)}
              options={[
                { value: 'ja', label: 'Ja, Social Commerce' },
                { value: 'nein', label: 'Nein, traditioneller Commerce' },
                { value: 'prüfen', label: 'Prüfen' },
              ]}
            />
          </FormField>

          <FormField label="Influencer Marketing">
            <FormRadioGroup
              name="influencerMarketing"
              value={formData.influencerMarketing || ''}
              onChange={value => handleInputChange('influencerMarketing', value)}
              options={[
                { value: 'ja', label: 'Ja, Influencer Marketing' },
                { value: 'nein', label: 'Nein, kein Influencer Marketing' },
                { value: 'micro_influencer', label: 'Micro-Influencer' },
                { value: 'macro_influencer', label: 'Macro-Influencer' },
              ]}
            />
          </FormField>

          <FormField label="Content Marketing">
            <FormRadioGroup
              name="contentMarketing"
              value={formData.contentMarketing || ''}
              onChange={value => handleInputChange('contentMarketing', value)}
              options={[
                { value: 'ja', label: 'Ja, Content Marketing' },
                { value: 'nein', label: 'Nein, kein Content Marketing' },
                { value: 'blog', label: 'Blog' },
                { value: 'video', label: 'Video' },
                { value: 'podcast', label: 'Podcast' },
              ]}
            />
          </FormField>

          <FormField label="Email Marketing">
            <FormRadioGroup
              name="emailMarketing"
              value={formData.emailMarketing || ''}
              onChange={value => handleInputChange('emailMarketing', value)}
              options={[
                { value: 'ja', label: 'Ja, Email Marketing' },
                { value: 'nein', label: 'Nein, kein Email Marketing' },
                { value: 'newsletter', label: 'Newsletter' },
                { value: 'automation', label: 'Automation' },
              ]}
            />
          </FormField>

          <FormField label="Marketing Automation">
            <FormRadioGroup
              name="marketingAutomation"
              value={formData.marketingAutomation || ''}
              onChange={value => handleInputChange('marketingAutomation', value)}
              options={[
                { value: 'ja', label: 'Ja, Marketing Automation' },
                { value: 'nein', label: 'Nein, manueller Ansatz' },
                { value: 'einfach', label: 'Einfache Automation' },
                { value: 'komplex', label: 'Komplexe Automation' },
              ]}
            />
          </FormField>

          <FormField label="CRM Integration">
            <FormRadioGroup
              name="crmIntegration"
              value={formData.crmIntegration || ''}
              onChange={value => handleInputChange('crmIntegration', value)}
              options={[
                { value: 'ja', label: 'Ja, CRM Integration' },
                { value: 'nein', label: 'Nein, keine Integration' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Attribution Modelling">
            <FormRadioGroup
              name="attributionModelling"
              value={formData.attributionModelling || ''}
              onChange={value => handleInputChange('attributionModelling', value)}
              options={[
                { value: 'ja', label: 'Ja, Attribution Modelling' },
                { value: 'nein', label: 'Nein, einfache Attribution' },
                { value: 'first_click', label: 'First-Click' },
                { value: 'last_click', label: 'Last-Click' },
                { value: 'multi_touch', label: 'Multi-Touch' },
              ]}
            />
          </FormField>

          <FormField label="Predictive Analytics">
            <FormRadioGroup
              name="predictiveAnalytics"
              value={formData.predictiveAnalytics || ''}
              onChange={value => handleInputChange('predictiveAnalytics', value)}
              options={[
                { value: 'ja', label: 'Ja, Predictive Analytics' },
                { value: 'nein', label: 'Nein, deskriptive Analytics' },
                { value: 'prüfen', label: 'Prüfen' },
              ]}
            />
          </FormField>

          <FormField label="A/B Testing">
            <FormRadioGroup
              name="abTesting"
              value={formData.abTesting || ''}
              onChange={value => handleInputChange('abTesting', value)}
              options={[
                { value: 'ja', label: 'Ja, A/B Testing' },
                { value: 'nein', label: 'Nein, kein Testing' },
                { value: 'multivariate', label: 'Multivariate Testing' },
              ]}
            />
          </FormField>

          <FormField label="Customer Journey Optimization">
            <FormRadioGroup
              name="customerJourneyOptimization"
              value={formData.customerJourneyOptimization || ''}
              onChange={value => handleInputChange('customerJourneyOptimization', value)}
              options={[
                { value: 'ja', label: 'Ja, Customer Journey Optimization' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'mapping', label: 'Journey Mapping' },
              ]}
            />
          </FormField>

          <FormField label="Conversion Rate Optimization">
            <FormRadioGroup
              name="conversionRateOptimization"
              value={formData.conversionRateOptimization || ''}
              onChange={value => handleInputChange('conversionRateOptimization', value)}
              options={[
                { value: 'ja', label: 'Ja, CRO gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'landing_pages', label: 'Landing Pages' },
                { value: 'checkout', label: 'Checkout-Prozess' },
              ]}
            />
          </FormField>

          <FormField label="Growth Hacking">
            <FormRadioGroup
              name="growthHacking"
              value={formData.growthHacking || ''}
              onChange={value => handleInputChange('growthHacking', value)}
              options={[
                { value: 'ja', label: 'Ja, Growth Hacking' },
                { value: 'nein', label: 'Nein, traditionelles Marketing' },
                { value: 'experimente', label: 'Experimente' },
              ]}
            />
          </FormField>

          <FormField label="Viral Marketing">
            <FormRadioGroup
              name="viralMarketing"
              value={formData.viralMarketing || ''}
              onChange={value => handleInputChange('viralMarketing', value)}
              options={[
                { value: 'ja', label: 'Ja, Viral Marketing' },
                { value: 'nein', label: 'Nein, organisches Wachstum' },
                { value: 'referral', label: 'Referral Programs' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Marketing-Kanäle">
            <FormCheckboxGroup
              value={formData.marketingChannels || []}
              onChange={value => handleInputChange('marketingChannels', value)}
              options={marketingChannelOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.description || ''}
              onChange={value => handleInputChange('description', value)}
              placeholder="Beschreiben Sie Ihr Marketingprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Situation">
            <FormTextarea
              value={formData.currentSituation || ''}
              onChange={value => handleInputChange('currentSituation', value)}
              placeholder="Beschreiben Sie die aktuelle Marketingsituation"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ziele">
            <FormTextarea
              value={formData.goals || ''}
              onChange={value => handleInputChange('goals', value)}
              placeholder="Welche Ziele sollen erreicht werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Herausforderungen">
            <FormTextarea
              value={formData.challenges || ''}
              onChange={value => handleInputChange('challenges', value)}
              placeholder="Welche Herausforderungen bestehen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfolgsmessung">
            <FormTextarea
              value={formData.successMeasurement || ''}
              onChange={value => handleInputChange('successMeasurement', value)}
              placeholder="Wie soll der Erfolg gemessen werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erwartungen">
            <FormTextarea
              value={formData.expectations || ''}
              onChange={value => handleInputChange('expectations', value)}
              placeholder="Welche Erwartungen haben Sie?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zeitplan">
            <FormTextarea
              value={formData.timeline || ''}
              onChange={value => handleInputChange('timeline', value)}
              placeholder="Zeitplan und Meilensteine"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Weitere Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default MarketingberaterForm;
