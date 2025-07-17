// Hauptkomponente für dynamische Unterkategorie-Formulare
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SubcategoryData,
  getSubcategoryType,
  validateSubcategoryData,
} from '@/types/subcategory-forms';
import { useRegistration } from '@/contexts/Registration-Context';
import AppEntwicklungForm from './AppEntwicklungForm';
import ArchivierungForm from './ArchivierungForm';
import AutoreparaturForm from './AutoreparaturForm';
import AutowäscheForm from './AutowäscheForm';
import BaumpflegeForm from './BaumpflegeForm';
import BodenlegerForm from './BodenlegerForm';
import BodenreinigungForm from './BodenreinigungForm';
import BuchhaltungForm from './BuchhaltungForm';
import CateringForm from './CateringForm';
import CloudComputingForm from './CloudComputingForm';
import CoachingForm from './CoachingForm';
import ITSupportForm from './ITSupportForm';
import ComputerkurseForm from './ComputerkurseForm';
import ContentMarketingForm from './ContentMarketingForm';
import CybersecurityForm from './CybersecurityForm';
import DJServiceForm from './DJServiceForm';
import DachdeckerForm from './DachdeckerForm';
import DatenbankentwicklungForm from './DatenbankentwicklungForm';
import DatenerfassungForm from './DatenerfassungForm';
import DekorationForm from './DekorationForm';
import ElektrikerForm from './ElektrikerForm';
import EntrümpelungForm from './EntrümpelungForm';
import ErnährungsberatungForm from './ErnährungsberatungForm';
import EventOrganisationForm from './EventOrganisationForm';
import EventplanungForm from './EventplanungForm';
import FahrerForm from './FahrerForm';
import FahrunterrichtForm from './FahrunterrichtForm';
import FensterTürenbauForm from './FensterTürenbauForm';
import FensterputzerForm from './FensterputzerForm';
import FinanzberatungForm from './FinanzberatungForm';
import FitnessTrainingForm from './FitnessTrainingForm';
import FliesenlegerForm from './FliesenlegerForm';
import FotografForm from './FotografForm';
import FriseurForm from './FriseurForm';
import GartenLandschaftspflegeForm from './GartenLandschaftspflegeForm';
import GartengestaltungForm from './GartengestaltungForm';
import GartenpflegeForm from './GartenpflegeForm';
import GlaserForm from './GlaserForm';
import GraphikdesignerForm from './GraphikdesignerForm';
import GärtnerForm from './GärtnerForm';
import HaushaltshilfeForm from './HaushaltshilfeForm';
import HausmeisterdienstForm from './HausmeisterdienstForm';
import HausreinigungForm from './HausreinigungForm';
import HeizungForm from './HeizungForm';
import HeizungSanitärForm from './HeizungSanitärForm';
import HundetrainerForm from './HundetrainerForm';
import ITBeratungForm from './ITBeratungForm';
import ITForm from './ITForm';
import InventurForm from './InventurForm';
import KinderbetreuungForm from './KinderbetreuungForm';
import KlempnerForm from './KlempnerForm';
import KosmetikForm from './KosmetikForm';
import KurierdienstForm from './KurierdienstForm';
import LagerlogistikForm from './LagerlogistikForm';
import LandschaftsgärtnerForm from './LandschaftsgärtnerForm';
import LogistikForm from './LogistikForm';
import MalerForm from './MalerForm';
import MalerFormNew from './MalerFormNew';
import MarketingberaterForm from './MarketingberaterForm';
import MarktforschungForm from './MarktforschungForm';
import MassageForm from './MassageForm';
import MaurerForm from './MaurerForm';
import MetallbauerForm from './MetallbauerForm';
import MietkellnerForm from './MietkellnerForm';
import MietkochForm from './MietkochForm';
import MontageserviceForm from './MontageserviceForm';
import MusikunterrichtForm from './MusikunterrichtForm';
import MusikerForm from './MusikerForm';
import MöbelTransportierenForm from './MöbelTransportierenForm';
import MöbelmontageForm from './MöbelmontageForm';
import NachhilfeForm from './NachhilfeForm';
import NachhilfeleherForm from './NachhilfeleherForm';
import NetzwerkadministrationForm from './NetzwerkadministrationForm';
import OnlineMarketingForm from './OnlineMarketingForm';
import PhysiotherapieForm from './PhysiotherapieForm';
import ProjektmanagementForm from './ProjektmanagementForm';
import PrüfungsvorbereitungForm from './PrüfungsvorbereitungForm';
import QualitätskontrolleForm from './QualitätskontrolleForm';
import RechercheForm from './RechercheForm';
import RechtsberatungForm from './RechtsberatungForm';
import ReinigungskraftForm from './ReinigungskraftForm';
import SchlosserForm from './SchlosserForm';
import SchreibdiensteForm from './SchreibdiensteForm';
import SchreinerForm from './SchreinerForm';
import SeniorenbetreuungForm from './SeniorenbetreuungForm';
import SicherheitsdienstForm from './SicherheitsdienstForm';
import SocialMediaMarketingForm from './SocialMediaMarketingForm';
import SoftwareentwicklerForm from './SoftwareentwicklerForm';
import SoftwareentwicklungForm from './SoftwareentwicklungForm';
import SprachunterrichtForm from './SprachunterrichtForm';
import SteuerberatungForm from './SteuerberatungForm';
import SystemintegrationForm from './SystemintegrationForm';
import TechnikServiceForm from './TechnikServiceForm';
import TelefonserviceForm from './TelefonserviceForm';
import TeppichreinigungForm from './TeppichreinigungForm';
import TexterForm from './TexterForm';
import TierarztAssistenzForm from './TierarztAssistenzForm';
import TierbetreuungForm from './TierbetreuungForm';
import TierpflegeForm from './TierpflegeForm';
import TischlerForm from './TischlerForm';
import TransportdienstleistungenForm from './TransportdienstleistungenForm';
import TrockenbauerForm from './TrockenbauerForm';
import UXUIDesignForm from './UXUIDesignForm';
import UmzugForm from './UmzugForm';
import UnternehmensberatungForm from './UnternehmensberatungForm';
import VersicherungsberatungForm from './VersicherungsberatungForm';
import VerwaltungForm from './VerwaltungForm';
import VideografForm from './VideografForm';
import WebdesignerForm from './WebdesignerForm';
import WebentwicklungForm from './WebentwicklungForm';
import WeiterbildungForm from './WeiterbildungForm';
import WinterdienstForm from './WinterdienstForm';
import ZimmererForm from './ZimmererForm';
import ÜbersetzerForm from './ÜbersetzerForm';

interface SubcategoryFormManagerProps {
  subcategory: string;
  onDataChange: (data: SubcategoryData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SubcategoryFormManager: React.FC<SubcategoryFormManagerProps> = ({
  subcategory,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SubcategoryData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();
  const { customerType, selectedCategory, selectedSubcategory } = useRegistration();

  // Initialisiere Formulardaten basierend auf Unterkategorie
  useEffect(() => {
    const initializeFormData = (): SubcategoryData => {
      switch (subcategory) {
        case 'Maler & Lackierer':
          return {
            subcategory: 'Maler & Lackierer',
            roomType: 'zimmer',
            paintType: 'innenfarbe',
            materialProvided: 'handwerker',
            surfaceCondition: 'gut',
            additionalServices: [],
            timeframe: 'flexibel',
          };
        case 'Elektriker':
          return {
            subcategory: 'Elektriker',
            serviceType: 'installation',
            workType: 'steckdosen',
            buildingType: 'einfamilienhaus',
            existingInstallation: 'vorhanden',
            certificationNeeded: false,
            materialProvided: 'handwerker',
          };
        case 'Tischler':
          return {
            subcategory: 'Tischler',
            serviceType: 'reparatur',
            furnitureType: 'tisch',
            material: 'holz',
            complexity: 'mittel',
            materialProvided: 'handwerker',
            timeframe: 'flexibel',
          };
        case 'Klempner':
          return {
            subcategory: 'Klempner',
            serviceType: 'reparatur',
            problemType: 'undichtigkeit',
            roomType: 'bad',
            buildingType: 'wohnung',
            accessibilityIssues: false,
            materialProvided: 'handwerker',
          };
        case 'Reinigungskraft':
          return {
            subcategory: 'Reinigungskraft',
            serviceType: 'regelmäßig',
            cleaningType: 'unterhaltsreinigung',
            specialAreas: ['bad', 'küche'],
            equipment: 'mitbringen',
            chemicals: 'mitbringen',
            timePreference: 'flexibel',
            accessMethod: 'anwesend',
          };
        case 'Webentwicklung':
          return {
            subcategory: 'Webentwicklung',
            serviceType: 'neubau',
            projectType: 'website',
            technology: ['html_css', 'javascript'],
            complexity: 'mittel',
            features: ['responsive', 'seo'],
            timeframe: 'flexibel',
            support: 'einmalig',
          };
        case 'AppEntwicklung':
          return {
            subcategory: 'AppEntwicklung',
            serviceType: 'neubau',
            platform: ['android', 'ios'],
            appType: 'business',
            complexity: 'mittel',
            features: ['push_notifications', 'offline'],
            design: 'benötigt',
            timeframe: 'flexibel',
            support: 'laufend',
          };
        case 'ITSupport':
          return {
            subcategory: 'ITSupport',
            serviceType: 'hardware_support',
            problemType: 'computer_laptop',
            supportLocation: 'vor_ort',
            operatingSystem: 'windows',
            businessSize: 'privatperson',
            problemDescription: '',
          };
        case 'Umzug':
          return {
            subcategory: 'Umzug',
            serviceType: 'komplettservice',
            fromFloor: 1,
            toFloor: 1,
            hasElevator: 'keine',
            distance: 10,
            roomCount: 3,
            furnitureType: ['schwere_möbel'],
            packingMaterial: 'benötigt',
            vehicleSize: 'mittel',
            additionalServices: [],
            dateFlexible: false,
          };
        case 'Umzugshelfer':
          return {
            subcategory: 'Umzugshelfer',
            serviceType: 'komplettservice',
            fromFloor: 1,
            toFloor: 1,
            hasElevator: 'keine',
            distance: 10,
            roomCount: 3,
            furnitureType: ['schwere_möbel'],
            packingMaterial: 'benötigt',
            vehicleSize: 'mittel',
            additionalServices: [],
            dateFlexible: false,
          };
        case 'Haushaltshilfe':
          return {
            subcategory: 'Haushaltshilfe',
            serviceType: 'regelmäßig',
            services: ['putzen'],
            timePreference: 'flexibel',
            languages: ['deutsch'],
            experience: 'egal',
            ownTransport: false,
          };
        case 'IT-Support':
          return {
            subcategory: 'IT-Support',
            serviceType: 'reparatur',
            location: 'vor_ort',
            dataBackup: 'vorhanden',
            businessHours: true,
          };
        case 'HeizungSanitär':
          return {
            subcategory: 'HeizungSanitär',
            serviceType: 'reparatur',
            systemType: 'heizung',
            buildingType: 'einfamilienhaus',
            heatingType: 'gas',
            certification: false,
          };
        case 'Fliesenleger':
          return {
            subcategory: 'Fliesenleger',
            serviceType: 'neubau',
            roomType: 'bad',
            tileType: 'keramik',
            tileSize: 'mittel',
            pattern: 'standard',
            preparationWork: 'nicht_nötig',
            materialProvided: 'handwerker',
            waterproofing: false,
          };
        case 'Dachdecker':
          return {
            subcategory: 'Dachdecker',
            serviceType: 'neubau',
            roofType: 'steildach',
            material: 'ziegel',
            roofSize: 'mittel',
            scaffolding: 'benötigt',
            insulation: 'nicht_nötig',
            gutters: 'nicht_nötig',
          };
        case 'Maurer':
          return {
            subcategory: 'Maurer',
            serviceType: 'neubau',
            workType: 'mauer',
            materialType: 'ziegel',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Trockenbauer':
          return {
            subcategory: 'Trockenbauer',
            serviceType: 'neubau',
            workType: 'wand',
            materialType: 'gipskarton',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Schreiner':
          return {
            subcategory: 'Schreiner',
            serviceType: 'anfertigung',
            workType: 'möbel',
            woodType: 'eiche',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Zimmerer':
          return {
            subcategory: 'Zimmerer',
            serviceType: 'neubau',
            workType: 'dachstuhl',
            woodType: 'fichte',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            insulation: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Bodenleger':
          return {
            subcategory: 'Bodenleger',
            serviceType: 'neubau',
            floorType: 'parkett',
            roomType: 'wohnzimmer',
            underfloor: 'estrich',
            projectSize: 'mittel',
            preparationWork: 'nicht_nötig',
            underfloorHeating: 'nicht_vorhanden',
            skirting: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Glaser':
          return {
            subcategory: 'Glaser',
            serviceType: 'reparatur',
            glassType: 'fenster',
            glassMaterial: 'einfachglas',
            measurement: 'benötigt',
            installation: 'inklusive',
            disposal: 'nicht_nötig',
          };
        case 'Schlosser':
          return {
            subcategory: 'Schlosser',
            serviceType: 'reparatur',
            workType: 'schloss',
            lockType: 'zylinder',
            securityLevel: 'standard',
            keyService: 'inklusive',
            installation: 'inklusive',
          };
        case 'Metallbauer':
          return {
            subcategory: 'Metallbauer',
            serviceType: 'neubau',
            workType: 'treppe',
            material: 'stahl',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Mietkoch':
          return {
            subcategory: 'Mietkoch',
            serviceType: 'event',
            eventType: 'dinner',
            guestCount: '4-6',
            cuisine: 'deutsch',
            dietaryRestrictions: [],
            kitchenEquipment: 'vorhanden',
            duration: 'halbtag',
            timeframe: 'flexibel',
          } as any;
        case 'FitnessTraining':
          return {
            subcategory: 'FitnessTraining',
            trainingType: 'personal',
            fitnessLevel: 'mittel',
            location: 'zuhause',
            equipment: 'minimal',
            frequency: '1-2',
            goals: ['fitness', 'ausdauer'],
            specialRequirements: '',
          } as any;
        case 'Bodenreinigung':
          return {
            subcategory: 'Bodenreinigung',
            serviceType: 'einmalig',
            floorType: 'parkett',
            area: 50,
            frequency: 'einmalig',
            equipment: 'vorhanden',
            chemicals: 'standard',
          } as any;
        case 'Massage':
          return {
            subcategory: 'Massage',
            massageType: 'klassisch',
            duration: '60',
            frequency: 'einmalig',
            location: 'zuhause',
            equipment: 'mitbringen',
            specialRequirements: '',
          } as any;
        case 'Heizung':
          return {
            subcategory: 'Heizung',
            serviceType: 'wartung',
            heatingType: 'gas',
            buildingType: 'einfamilienhaus',
            yearBuilt: '2000-2010',
            lastService: 'über_1_jahr',
          } as any;
        case 'Landschaftsgärtner':
          return {
            subcategory: 'Landschaftsgärtner',
            serviceType: 'pflege',
            gardenType: 'ziergarten',
            area: 100,
            frequency: 'regelmäßig',
            specialAreas: ['rasen', 'beete'],
            equipment: 'teilweise',
          } as any;
        case 'Videograf':
          return {
            subcategory: 'Videograf',
            eventType: 'hochzeit',
            duration: 'halbtag',
            location: 'innen',
            output: ['highlights', 'vollvideo'],
            equipment: 'komplett',
            specialRequirements: '',
          } as any;
        case 'Baumpflege':
          return {
            subcategory: 'Baumpflege',
            serviceType: 'schnitt',
            treeType: 'laubbaum',
            treeCount: '1-3',
            treeHeight: '5-10m',
            disposal: 'inklusive',
          } as any;
        case 'Softwareentwicklung':
          return {
            subcategory: 'Softwareentwicklung',
            projectType: 'webentwicklung',
            complexity: 'mittel',
            platform: 'web',
            features: ['benutzeranmeldung', 'datenbank'],
            timeframe: 'mittel',
            maintenance: 'gewünscht',
          } as any;
        case 'Hausmeisterdienst':
          return {
            subcategory: 'Hausmeisterdienst',
            serviceType: 'regelmäßig',
            buildingType: 'mehrfamilienhaus',
            tasks: ['reinigung', 'technik', 'außenanlagen'],
            frequency: 'wöchentlich',
          } as any;
        case 'Systemintegration':
          return {
            subcategory: 'Systemintegration',
            systemType: 'software',
            existingSystem: 'vorhanden',
            complexity: 'mittel',
            dataVolume: 'mittel',
            timeframe: 'mittel',
            support: 'inklusive',
          } as any;
        case 'SocialMediaMarketing':
          return {
            subcategory: 'SocialMediaMarketing',
            platforms: ['facebook', 'instagram'],
            contentType: ['posts', 'ads'],
            frequency: 'wöchentlich',
            goals: ['bekanntheit', 'verkäufe'],
            duration: 'fortlaufend',
            analytics: true,
          } as any;
        case 'ContentMarketing':
          return {
            subcategory: 'ContentMarketing',
            contentType: ['blog', 'newsletter'],
            frequency: 'monatlich',
            industry: 'allgemein',
            seo: true,
            keywords: [],
            contentLength: 'mittel',
            languages: ['deutsch'],
          } as any;
        case 'Kurierdienst':
          return {
            subcategory: 'Kurierdienst',
            serviceType: 'eilsendung',
            packageSize: 'klein',
            distance: '10-20',
            trackingNeeded: true,
            insurance: 'standard',
          } as any;
        case 'DJ-Service':
          return {
            subcategory: 'DJ-Service',
            eventType: 'hochzeit',
            duration: '4-6',
            musicStyle: ['pop', 'charts'],
            equipment: 'komplett',
            guestCount: '50-100',
            specialRequirements: '',
          } as any;
        case 'Finanzberatung':
          return {
            subcategory: 'Finanzberatung',
            adviceType: 'anlageberatung',
            consultationDuration: '60',
            investmentAmount: 'mittel',
            riskTolerance: 'mittel',
            goals: ['altersvorsorge', 'vermögensaufbau'],
            timeHorizon: 'langfristig',
          } as any;
        case 'Lagerlogistik':
          return {
            subcategory: 'Lagerlogistik',
            serviceType: 'lagerung',
            itemType: 'möbel',
            spaceNeeded: 'mittel',
            duration: '1-3_monate',
            accessNeeded: 'selten',
            specialRequirements: '',
          } as any;
        case 'UXUI-Design':
          return {
            subcategory: 'UXUI-Design',
            projectType: 'website',
            complexity: 'mittel',
            deliverables: ['wireframes', 'prototypen'],
            revisions: 2,
            research: true,
          } as any;
        case 'Softwareentwickler':
          return {
            subcategory: 'Softwareentwickler',
            projectType: 'webentwicklung',
            programmingLanguage: ['javascript', 'python'],
            complexity: 'mittel',
            timeframe: 'mittel',
            maintenance: true,
          } as any;
        case 'Autowäsche':
          return {
            subcategory: 'Autowäsche',
            serviceType: 'standard',
            vehicleType: 'pkw',
            location: 'vorort',
            interior: true,
            special: [],
          } as any;
        case 'Netzwerkadministration':
          return {
            subcategory: 'Netzwerkadministration',
            serviceType: 'einrichtung',
            networkSize: 'klein',
            security: 'standard',
            monitoring: true,
            documentation: true,
          } as any;
        case 'Transportdienstleistungen':
          return {
            subcategory: 'Transportdienstleistungen',
            serviceType: 'umzug',
            goodsType: 'möbel',
            distance: 'lokal',
            loadingHelp: true,
            vehicleType: 'transporter',
          } as any;
        case 'Frachtführer':
          return {
            subcategory: 'Frachtführer',
            serviceType: 'fracht',
            goodsType: 'palette',
            distance: 'fernverkehr',
            loadingHelp: true,
            vehicleType: 'lkw',
          } as any;
        case 'Buchhaltung':
          return {
            subcategory: 'Buchhaltung',
            serviceType: 'monatlich',
            companySize: 'klein',
            taxReporting: true,
            payroll: false,
            software: 'standard',
          } as any;
        case 'Graphikdesigner':
          return {
            subcategory: 'Graphikdesigner',
            projectType: 'logo',
            complexity: 'mittel',
            revisions: 2,
            fileFormats: ['jpg', 'png', 'svg'],
            printReady: true,
          } as any;
        case 'Texter':
          return {
            subcategory: 'Texter',
            contentType: 'werbung',
            wordCount: '500-1000',
            tone: 'professionell',
            research: true,
            seo: true,
          } as any;
        case 'FensterTürenbau':
          return {
            subcategory: 'FensterTürenbau',
            serviceType: 'installation',
            itemType: 'fenster',
            material: 'kunststoff',
            quantity: '1-5',
            measurement: true,
          } as any;
        case 'Mietkellner':
          return {
            subcategory: 'Mietkellner',
            eventType: 'privat',
            duration: '4-6',
            guestCount: '20-50',
            serviceLevel: 'standard',
            beverages: true,
            food: true,
          } as any;
        case 'Fensterputzer':
          return {
            subcategory: 'Fensterputzer',
            propertyType: 'wohnung',
            windowCount: '5-10',
            frequency: 'einmalig',
            height: 'standard',
            access: 'einfach',
          } as any;
        case 'Cybersecurity':
          return {
            subcategory: 'Cybersecurity',
            serviceType: 'audit',
            systemType: 'computer',
            companySize: 'klein',
            ongoing: false,
          } as any;
        case 'Hausreinigung':
          return {
            subcategory: 'Hausreinigung',
            propertyType: 'wohnung',
            roomCount: '2-3',
            frequency: 'wöchentlich',
            specialAreas: ['bad', 'küche'],
            equipment: 'mitbringen',
          } as any;
        case 'Entrümpelung':
          return {
            subcategory: 'Entrümpelung',
            propertyType: 'wohnung',
            roomCount: '2-3',
            heavyItems: true,
            disposal: true,
            timeframe: 'flexibel',
          } as any;
        case 'Möbelmontage':
          return {
            subcategory: 'Möbelmontage',
            furnitureType: 'schrank',
            complexity: 'mittel',
            quantity: '1-3',
            tools: 'mitbringen',
            disposal: true,
          } as any;
        case 'Nachhilfe':
          return {
            subcategory: 'Nachhilfe',
            subject: 'mathematik',
            level: 'mittelstufe',
            frequency: 'wöchentlich',
            duration: '60',
            location: 'online',
          } as any;
        case 'Rechtsberatung':
          return {
            subcategory: 'Rechtsberatung',
            legalArea: 'vertragsrecht',
            complexity: 'mittel',
            duration: '60',
            documentation: true,
          } as any;
        case 'CloudComputing':
          return {
            subcategory: 'CloudComputing',
            serviceType: 'einrichtung',
            platform: 'aws',
            complexity: 'mittel',
            migration: true,
            training: false,
          } as any;
        case 'Eventplanung':
          return {
            subcategory: 'Eventplanung',
            eventType: 'privat',
            guestCount: '20-50',
            duration: '4-6',
            location: 'indoor',
            catering: true,
            decoration: true,
          } as any;
        case 'IT-Beratung':
          return {
            subcategory: 'IT-Beratung',
            consultationType: 'strategie',
            companySize: 'klein',
            duration: '4-8',
            documentation: true,
            implementation: false,
          } as any;
        case 'Fotograf':
          return {
            subcategory: 'Fotograf',
            shootingType: 'portrait',
            duration: '1-2',
            location: 'studio',
            edited: true,
            prints: false,
          } as any;
        case 'Fahrer':
          return {
            subcategory: 'Fahrer',
            serviceType: 'personentransport',
            distance: 'lokal',
            duration: '1-4',
            passengers: '1-4',
            vehicle: 'kunde',
          } as any;
        case 'Autoreparatur':
          return {
            subcategory: 'Autoreparatur',
            serviceType: 'inspektion',
            vehicleType: 'pkw',
            partsNeeded: 'standard',
            location: 'werkstatt',
          } as any;
        case 'Webdesigner':
          return {
            subcategory: 'Webdesigner',
            projectType: 'website',
            pages: '5-10',
            responsive: true,
            contentManagement: true,
            seo: true,
          } as any;
        case 'Datenbankentwicklung':
          return {
            subcategory: 'Datenbankentwicklung',
            databaseType: 'relational',
            complexity: 'mittel',
            dataVolume: 'mittel',
            migration: true,
            maintenance: true,
          } as any;
        case 'Teppichreinigung':
          return {
            subcategory: 'Teppichreinigung',
            areaSize: 'mittel',
            teppichType: 'kurzflor',
            stains: true,
            method: 'nassreinigung',
            furniture: true,
          } as any;
        case 'Gartengestaltung':
          return {
            subcategory: 'Gartengestaltung',
            gardenType: 'ziergarten',
            areaSize: 'mittel',
            elements: ['pflanzen', 'rasen'],
            design: true,
            implementation: true,
          } as any;
        case 'Winterdienst':
          return {
            subcategory: 'Winterdienst',
            propertyType: 'privathaus',
            areaSize: 'klein',
            frequency: 'bei_bedarf',
            salt: true,
            timing: 'morgens',
          } as any;
        case 'Steuerberatung':
          return {
            subcategory: 'Steuerberatung',
            serviceType: 'steuererklärung',
            clientType: 'privatperson',
            complexity: 'mittel',
            year: new Date().getFullYear() - 1,
            ongoing: false,
          } as any;
        case 'Coaching':
          return {
            subcategory: 'Coaching',
            coachingType: 'business',
            duration: '60',
            frequency: 'wöchentlich',
            goal: 'leistungssteigerung',
            location: 'online',
          } as any;
        case 'Physiotherapie':
          return {
            subcategory: 'Physiotherapie',
            treatmentType: 'klassisch',
            duration: '60',
            frequency: 'wöchentlich',
            location: 'praxis',
            prescription: false,
          } as any;
        case 'Tierbetreuung':
          return {
            subcategory: 'Tierbetreuung',
            petType: 'hund',
            serviceType: 'gassi',
            duration: '30-60',
            frequency: 'täglich',
            location: 'zuhause',
          } as any;
        case 'OnlineMarketing':
          return {
            subcategory: 'OnlineMarketing',
            marketingType: 'seo',
            duration: 'fortlaufend',
            goals: ['bekanntheit', 'verkäufe'],
            reporting: true,
          } as any;
        case 'Hundetrainer':
          return {
            subcategory: 'Hundetrainer',
            trainingType: 'gehorsam',
            dogAge: 'erwachsen',
            dogSize: 'mittel',
            duration: '60',
            frequency: 'wöchentlich',
            location: 'außen',
          } as any;
        case 'Sprachunterricht':
          return {
            subcategory: 'Sprachunterricht',
            language: 'englisch',
            level: 'anfänger',
            duration: '60',
            frequency: 'wöchentlich',
            goal: 'alltagssprache',
            location: 'online',
          } as any;
        case 'Versicherungsberatung':
          return {
            subcategory: 'Versicherungsberatung',
            insuranceType: 'hausrat',
            clientType: 'privatperson',
            duration: '60',
            comparison: true,
            implementation: false,
          } as any;
        case 'Catering':
          return {
            subcategory: 'Catering',
            eventType: 'privat',
            guestCount: '20-50',
            cuisine: 'deutsch',
            dietaryRestrictions: [],
            serviceIncluded: true,
            equipment: true,
          } as any;
        case 'App-Entwicklung':
          return {
            subcategory: 'App-Entwicklung',
            platform: ['android', 'ios'],
            complexity: 'mittel',
            features: ['benutzeranmeldung', 'datenbank'],
            design: true,
            maintenance: true,
          } as any;
        case 'Tierpflege':
          return {
            subcategory: 'Tierpflege',
            petType: 'hund',
            serviceType: 'fellpflege',
            petSize: 'mittel',
            location: 'zuhause',
            frequency: 'einmalig',
          } as any;
        case 'Seniorenbetreuung':
          return {
            subcategory: 'Seniorenbetreuung',
            careType: 'begleitung',
            duration: '2-4',
            frequency: 'wöchentlich',
            mobility: 'eingeschränkt',
            medicalNeeds: false,
          } as any;
        case 'Gärtner':
          return {
            subcategory: 'Gärtner',
            serviceType: 'pflege',
            gardenType: 'ziergarten',
            areaSize: 'mittel',
            frequency: 'monatlich',
            tasks: ['rasen', 'hecke', 'beete'],
          } as any;
        case 'Nachhilfeleher':
          return {
            subcategory: 'Nachhilfeleher',
            subject: 'mathematik',
            level: 'mittelstufe',
            duration: '60',
            frequency: 'wöchentlich',
            goal: 'notenverbesserung',
            location: 'online',
          } as any;
        case 'Marketingberater':
          return {
            subcategory: 'Marketingberater',
            consultationType: 'strategie',
            companySize: 'klein',
            duration: '4-8',
            implementation: false,
            reporting: true,
          } as any;
        case 'Friseur':
          return {
            subcategory: 'Friseur',
            serviceType: 'haarschnitt',
            gender: 'unisex',
            hairType: 'normal',
            additional: ['waschen', 'föhnen'],
            location: 'zuhause',
          } as any;
        case 'Musikunterricht':
          return {
            subcategory: 'Musikunterricht',
            instrument: 'klavier',
            level: 'anfänger',
            duration: '60',
            frequency: 'wöchentlich',
            location: 'lehrer',
            instrumentProvided: false,
          } as any;
        case 'Kinderbetreuung':
          return {
            subcategory: 'Kinderbetreuung',
            childrenCount: '1-2',
            childrenAge: '3-6',
            duration: '2-4',
            frequency: 'wöchentlich',
            location: 'zuhause',
            activities: ['spielen', 'basteln'],
          } as any;
        case 'Musiker':
          return {
            subcategory: 'Musiker',
            musicType: 'band',
            eventType: 'privat',
            duration: '2-4',
            genre: 'pop',
            equipment: true,
            songWishes: false,
          } as any;
        case 'Gartenpflege':
          return {
            subcategory: 'Gartenpflege',
            gardenType: 'ziergarten',
            areaSize: 'mittel',
            frequency: 'monatlich',
            tasks: ['rasen', 'hecke', 'beete'],
            equipment: 'mitbringen',
          } as any;
        case 'Montageservice':
          return {
            subcategory: 'Montageservice',
            itemType: 'möbel',
            complexity: 'mittel',
            quantity: '1-5',
            tools: 'mitbringen',
            disposal: true,
          } as any;
        case 'Sicherheitsdienst':
          return {
            subcategory: 'Sicherheitsdienst',
            serviceType: 'veranstaltung',
            duration: '4-8',
            personnel: '1-3',
            equipment: 'standard',
            training: true,
          } as any;
        case 'Übersetzer':
          return {
            subcategory: 'Übersetzer',
            languageFrom: 'englisch',
            languageTo: 'deutsch',
            documentType: 'geschäftlich',
            wordCount: '500-1000',
            certification: false,
          } as any;
        case 'Ernährungsberatung':
          return {
            subcategory: 'Ernährungsberatung',
            serviceType: 'beratung',
            duration: '1-3',
            goal: 'gewichtsabnahme',
            restrictions: ['keine'],
            frequency: 'wöchentlich',
          } as any;
        case 'Kosmetik':
          return {
            subcategory: 'Kosmetik',
            serviceType: 'gesichtsbehandlung',
            duration: '1-2',
            skinType: 'normal',
            concerns: ['reinigung'],
            addOns: false,
          } as any;
        // Ergänzung der neuen Formulare
        case 'Archivierung':
          return {
            subcategory: 'Archivierung',
            documentType: 'physisch',
            serviceType: 'einmalig',
            quantity: 'gering',
            timeframe: 'flexibel',
            storageType: 'digital',
            specialRequirements: '',
          } as any;
        case 'Computerkurse':
          return {
            subcategory: 'Computerkurse',
            courseType: 'grundlagen',
            level: 'anfänger',
            duration: '1-2',
            frequency: 'wöchentlich',
            format: 'einzelunterricht',
            specialRequirements: '',
          } as any;
        case 'Datenerfassung':
          return {
            subcategory: 'Datenerfassung',
            dataType: 'text',
            volume: 'gering',
            format: 'digital',
            specialRequirements: '',
          } as any;
        case 'Dekoration':
          return {
            subcategory: 'Dekoration',
            decorationType: 'wohnung',
            eventType: 'keine',
            style: 'modern',
            timeframe: 'flexibel',
            specialRequirements: '',
          } as any;
        case 'Event-Organisation':
          return {
            subcategory: 'Event-Organisation',
            eventType: 'privat',
            guestCount: '20-50',
            services: ['planung'],
            location: 'indoor',
            catering: 'nicht_benötigt',
            timeframe: 'innerhalb_monat',
          } as any;
        case 'Fahrunterricht':
          return {
            subcategory: 'Fahrunterricht',
            licenseType: 'pkw',
            lessonType: 'standard',
            experience: 'anfänger',
            frequency: 'wöchentlich',
            location: 'stadt',
            specialRequirements: '',
          } as any;
        case 'Garten- & Landschaftspflege':
          return {
            subcategory: 'Garten- & Landschaftspflege',
            serviceType: 'pflege',
            gardenType: 'ziergarten',
            areaSize: 'mittel',
            frequency: 'monatlich',
            tasks: ['rasen', 'hecke', 'beete'],
            equipment: 'mitbringen',
          } as any;
        case 'Inventur':
          return {
            subcategory: 'Inventur',
            serviceType: 'vollständig',
            itemType: 'möbel',
            quantity: 'mittel',
            documentation: 'digital',
            specialRequirements: '',
          } as any;
        case 'Logistik':
          return {
            subcategory: 'Logistik',
            serviceType: 'lagerung',
            itemType: 'pakete',
            quantity: 'mittel',
            duration: 'kurz',
            specialRequirements: '',
          } as any;
        case 'Marktforschung':
          return {
            subcategory: 'Marktforschung',
            surveyType: 'online',
            targetGroup: 'verbraucher',
            duration: 'kurz',
            sampleSize: 'klein',
            methodology: 'fragebogen',
            specialRequirements: '',
          } as any;
        case 'MöbelTransportieren':
          return {
            subcategory: 'MöbelTransportieren',
            serviceType: 'transport',
            itemType: 'möbel',
            quantity: 'mittel',
            distance: 'lokal',
            assembly: 'nein',
            specialRequirements: '',
          } as any;
        case 'Möbel transportieren':
          return {
            subcategory: 'Möbel transportieren',
            serviceType: 'transport',
            itemType: 'möbel',
            quantity: 'mittel',
            distance: 'lokal',
            assembly: 'nein',
            specialRequirements: '',
          } as any;
        case 'Projektmanagement':
          return {
            subcategory: 'Projektmanagement',
            projectType: 'it',
            duration: 'mittel',
            teamSize: 'klein',
            methodology: 'agile',
            communication: 'regelmäßig',
            specialRequirements: '',
          } as any;
        case 'Prüfungsvorbereitung':
          return {
            subcategory: 'Prüfungsvorbereitung',
            subject: 'mathematik',
            level: 'mittelstufe',
            duration: '1-2',
            frequency: 'wöchentlich',
            goal: 'bestehen',
            specialRequirements: '',
          } as any;
        case 'Qualitätskontrolle':
          return {
            subcategory: 'Qualitätskontrolle',
            serviceType: 'inspektion',
            itemType: 'produkte',
            quantity: 'mittel',
            standards: 'iso',
            documentation: 'erforderlich',
            specialRequirements: '',
          } as any;
        case 'Recherche':
          return {
            subcategory: 'Recherche',
            researchType: 'online',
            topic: 'markt',
            duration: 'kurz',
            sources: 'primär',
            deliverable: 'bericht',
            specialRequirements: '',
          } as any;
        case 'Schreibdienste':
          return {
            subcategory: 'Schreibdienste',
            serviceType: 'abschreibung',
            documentType: 'geschäftlich',
            volume: 'mittel',
            format: 'digital',
            specialRequirements: '',
          } as any;
        case 'Technik-Service':
          return {
            subcategory: 'Technik-Service',
            serviceType: 'reparatur',
            deviceType: 'computer',
            location: 'vor_ort',
            warranty: 'standard',
            specialRequirements: '',
          } as any;
        case 'Telefonservice':
          return {
            subcategory: 'Telefonservice',
            serviceType: 'hotline',
            duration: 'business',
            languages: ['deutsch'],
            expertise: 'kundenservice',
            availability: 'normal',
            specialRequirements: '',
          } as any;
        case 'Tierarzt-Assistenz':
          return {
            subcategory: 'Tierarzt-Assistenz',
            serviceType: 'begleitung',
            petType: 'hund',
            duration: '1-2',
            location: 'praxis',
            experience: 'vorhanden',
            specialRequirements: '',
          } as any;
        case 'Unternehmensberatung':
          return {
            subcategory: 'Unternehmensberatung',
            consultationType: 'strategie',
            companySize: 'klein',
            duration: 'mittel',
            industry: 'allgemein',
            deliverable: 'bericht',
            specialRequirements: '',
          } as any;
        case 'Verwaltung':
          return {
            subcategory: 'Verwaltung',
            serviceType: 'büro',
            taskType: 'organisation',
            duration: 'regelmäßig',
            software: 'office',
            experience: 'vorhanden',
            specialRequirements: '',
          } as any;
        case 'Weiterbildung':
          return {
            subcategory: 'Weiterbildung',
            courseType: 'beruflich',
            format: 'präsenz',
            duration: 'kurz',
            level: 'anfänger',
            certification: 'gewünscht',
            specialRequirements: '',
          } as any;
      }

      // Default-Fall: Rückgabe eines generischen Datentyps
      return {
        subcategory: subcategory || 'Unbekannt',
        serviceType: 'einmalig',
        timeframe: 'flexibel',
      } as any;
    };

    const initialData = initializeFormData();
    setFormData(initialData);
  }, [subcategory]);

  // Validierung und Datenweiterleitung
  useEffect(() => {
    if (!formData) return;

    const validationErrors = validateSubcategoryData(formData);
    setErrors(validationErrors);
    onValidationChange(validationErrors.length === 0);
    onDataChange(formData);
  }, [formData, onDataChange, onValidationChange]);

  const handleDataChange = (newData: SubcategoryData) => {
    setFormData(newData);
  };

  // Validierungslogik für alle Formulare
  const isFormValid = () => {
    if (!formData) return false;

    // Prüfe ob Formulardaten vorhanden sind
    const hasFormData = Object.keys(formData).length > 0;
    if (!hasFormData) return false;

    // Spezielle Behandlung für Mietkoch
    if (subcategory === 'Mietkoch') {
      const requiredMietkochFields = [
        'serviceType',
        'cuisineType',
        'eventType',
        'level',
        'numberOfGuests',
        'location',
        'eventDate',
      ];

      const missingMietkochFields = requiredMietkochFields.filter(field => {
        const value = formData[field];
        return (
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        );
      });

      console.log('Mietkoch specific validation:', {
        requiredFields: requiredMietkochFields,
        missingFields: missingMietkochFields,
        formData,
        isValid: missingMietkochFields.length === 0,
      });

      return missingMietkochFields.length === 0;
    }

    // Definiere explizit optionale Felder
    const optionalFields = [
      'additionalInfo',
      'specialRequirements',
      'additionalNotes',
      'zusätzlicheInfos',
      'besondereAnforderungen',
      'subcategory',
      'additionalServices',
      'timeframe',
      'specialNotes',
      'description',
      'notes',
      'comment',
      'remarks',
      'extras',
      'additional',
      'allergien',
      'allergies',
      'menüwünsche',
      'menuWishes',
      'specialRequests',
      'kitchenSize',
      'kitchenEquipment',
      'küchengröße',
      'küchenaustattung',
      'startTime',
      'startzeit',
      'duration',
      'dauer',
      'preisProPerson',
      // Spezifische Mietkoch-Felder
      'menuWishes',
      'serviceType', // Wird automatisch gesetzt
      'additionalServices', // Checkboxes können leer sein
    ];

    // Prüfe alle Felder auf Vollständigkeit
    const missingFields: string[] = [];
    Object.entries(formData).forEach(([key, value]) => {
      // Überspringen von optionalen Feldern
      if (
        optionalFields.includes(key) ||
        key.includes('optional') ||
        key.includes('Optional') ||
        key.includes('zusätzlich') ||
        key.includes('additional') ||
        key.includes('extra') ||
        key.includes('Extra') ||
        key.includes('time') ||
        key.includes('Time') ||
        key.includes('zeit') ||
        key.includes('Zeit') ||
        key.includes('dauer') ||
        key.includes('Dauer') ||
        key.includes('duration') ||
        key.includes('Duration')
      ) {
        return;
      }

      // Prüfe ob das Feld leer ist oder Platzhalter enthält
      if (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        // Überspringe Platzhalter-Werte
        value === 'HH:MM' ||
        value === 'Dauer in Stunden' ||
        value === 'Klein, Mittel, Groß oder Professionell' ||
        value === 'vorhanden' ||
        (typeof value === 'string' && value.includes('Platzhalter')) ||
        (typeof value === 'string' && value.includes('placeholder'))
      ) {
        missingFields.push(key);
      }
    });

    const allRequiredFieldsFilled = missingFields.length === 0;

    console.log('SubcategoryFormManager validation:', {
      subcategory,
      totalFields: Object.keys(formData).length,
      missingFields,
      allRequiredFieldsFilled,
      formData,
      // Debug: Zeige alle Felder und ihre Werte
      fieldDetails: Object.entries(formData).map(([key, value]) => ({
        field: key,
        value,
        isEmpty:
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0),
        isOptional:
          optionalFields.includes(key) ||
          key.includes('optional') ||
          key.includes('Optional') ||
          key.includes('zusätzlich') ||
          key.includes('additional') ||
          key.includes('extra') ||
          key.includes('Extra') ||
          key.includes('time') ||
          key.includes('Time') ||
          key.includes('zeit') ||
          key.includes('Zeit') ||
          key.includes('dauer') ||
          key.includes('Dauer') ||
          key.includes('duration') ||
          key.includes('Duration'),
      })),
    });

    return allRequiredFieldsFilled;
  };

  const handleNextClick = () => {
    if (!isFormValid()) {
      console.log('Form is not valid, cannot proceed');
      return;
    }

    console.log('Form is valid, proceeding to address page');
    const encodedSubcategory = encodeURIComponent(subcategory);
    router.push(`/auftrag/get-started/${encodedSubcategory}/adresse`);
  };

  if (!formData) {
    return <div>Lade Formular...</div>;
  }

  // Rendere das passende Formular basierend auf Unterkategorie
  const renderForm = () => {
    switch (subcategory) {
      case 'Maler & Lackierer':
        return (
          <MalerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Elektriker':
        return (
          <ElektrikerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Tischler':
        return (
          <TischlerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Klempner':
        return (
          <KlempnerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Reinigungskraft':
        return (
          <ReinigungskraftForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Webentwicklung':
        return (
          <WebentwicklungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'AppEntwicklung':
        return (
          <AppEntwicklungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'ITSupport':
        return (
          <ITSupportForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Umzug':
        return (
          <UmzugForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Umzugshelfer':
        return (
          <UmzugForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Haushaltshilfe':
        return (
          <HaushaltshilfeForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'IT-Support':
        return (
          <ITForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'HeizungSanitär':
        return (
          <HeizungSanitärForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Fliesenleger':
        return (
          <FliesenlegerForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Dachdecker':
        return (
          <DachdeckerForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Maurer':
        return (
          <MaurerForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Trockenbauer':
        return (
          <TrockenbauerForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Schreiner':
        return (
          <SchreinerForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Zimmerer':
        return (
          <ZimmererForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Bodenleger':
        return (
          <BodenlegerForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Glaser':
        return (
          <GlaserForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Schlosser':
        return (
          <SchlosserForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Metallbauer':
        return (
          <MetallbauerForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Mietkoch':
        return (
          <MietkochForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'FitnessTraining':
        return (
          <FitnessTrainingForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Bodenreinigung':
        return (
          <BodenreinigungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Massage':
        return (
          <MassageForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Heizung':
        return (
          <HeizungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Landschaftsgärtner':
        return (
          <LandschaftsgärtnerForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Videograf':
        return (
          <VideografForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Baumpflege':
        return (
          <BaumpflegeForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Softwareentwicklung':
        return (
          <SoftwareentwicklungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Hausmeisterdienst':
        return (
          <HausmeisterdienstForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Systemintegration':
        return (
          <SystemintegrationForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'SocialMediaMarketing':
        return (
          <SocialMediaMarketingForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'ContentMarketing':
        return (
          <ContentMarketingForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Kurierdienst':
        return (
          <KurierdienstForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'DJ-Service':
        return (
          <DJServiceForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Finanzberatung':
        return (
          <FinanzberatungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Lagerlogistik':
        return (
          <LagerlogistikForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'UXUI-Design':
        return (
          <UXUIDesignForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Softwareentwickler':
        return (
          <SoftwareentwicklerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Autowäsche':
        return (
          <AutowäscheForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Netzwerkadministration':
        return (
          <NetzwerkadministrationForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Transportdienstleistungen':
        return (
          <TransportdienstleistungenForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Frachtführer':
        return (
          <TransportdienstleistungenForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Buchhaltung':
        return (
          <BuchhaltungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Graphikdesigner':
        return (
          <GraphikdesignerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Texter':
        return (
          <TexterForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'FensterTürenbau':
        return (
          <FensterTürenbauForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Mietkellner':
        return (
          <MietkellnerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Fensterputzer':
        return (
          <FensterputzerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Cybersecurity':
        return (
          <CybersecurityForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Hausreinigung':
        return (
          <HausreinigungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Entrümpelung':
        return (
          <EntrümpelungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Möbelmontage':
        return (
          <MöbelmontageForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Nachhilfe':
        return (
          <NachhilfeForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Rechtsberatung':
        return (
          <RechtsberatungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'CloudComputing':
        return (
          <CloudComputingForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Eventplanung':
        return (
          <EventplanungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'IT-Beratung':
        return (
          <ITBeratungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Fotograf':
        return (
          <FotografForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Fahrer':
        return (
          <FahrerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Autoreparatur':
        return (
          <AutoreparaturForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Webdesigner':
        return (
          <WebdesignerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Datenbankentwicklung':
        return (
          <DatenbankentwicklungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Teppichreinigung':
        return (
          <TeppichreinigungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Gartengestaltung':
        return (
          <GartengestaltungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Winterdienst':
        return (
          <WinterdienstForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Steuerberatung':
        return (
          <SteuerberatungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Coaching':
        return (
          <CoachingForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Physiotherapie':
        return (
          <PhysiotherapieForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Tierbetreuung':
        return (
          <TierbetreuungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'OnlineMarketing':
        return (
          <OnlineMarketingForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Hundetrainer':
        return (
          <HundetrainerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Sprachunterricht':
        return (
          <SprachunterrichtForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Versicherungsberatung':
        return (
          <VersicherungsberatungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Catering':
        return (
          <CateringForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'App-Entwicklung':
        return (
          <AppEntwicklungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Tierpflege':
        return (
          <TierpflegeForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Seniorenbetreuung':
        return (
          <SeniorenbetreuungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Gärtner':
        return (
          <GärtnerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Nachhilfeleher':
        return (
          <NachhilfeleherForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Marketingberater':
        return (
          <MarketingberaterForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Friseur':
        return (
          <FriseurForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Musikunterricht':
        return (
          <MusikunterrichtForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Kinderbetreuung':
        return (
          <KinderbetreuungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Musiker':
        return (
          <MusikerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Gartenpflege':
        return (
          <GartenpflegeForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Montageservice':
        return (
          <MontageserviceForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Sicherheitsdienst':
        return (
          <SicherheitsdienstForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Übersetzer':
        return (
          <ÜbersetzerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Ernährungsberatung':
        return (
          <ErnährungsberatungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Kosmetik':
        return (
          <KosmetikForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Archivierung':
        return (
          <ArchivierungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Computerkurse':
        return (
          <ComputerkurseForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Datenerfassung':
        return (
          <DatenerfassungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Dekoration':
        return (
          <DekorationForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Event-Organisation':
        return (
          <EventOrganisationForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Fahrunterricht':
        return (
          <FahrunterrichtForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Garten- & Landschaftspflege':
        return (
          <GartenLandschaftspflegeForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Inventur':
        return (
          <InventurForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Logistik':
        return (
          <LogistikForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Marktforschung':
        return (
          <MarktforschungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'MöbelTransportieren':
        return (
          <MöbelTransportierenForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Möbel transportieren':
        return (
          <MöbelTransportierenForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Projektmanagement':
        return (
          <ProjektmanagementForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Prüfungsvorbereitung':
        return (
          <PrüfungsvorbereitungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Qualitätskontrolle':
        return (
          <QualitätskontrolleForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Recherche':
        return (
          <RechercheForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Schreibdienste':
        return (
          <SchreibdiensteForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Technik-Service':
        return (
          <TechnikServiceForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Telefonservice':
        return (
          <TelefonserviceForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Tierarzt-Assistenz':
        return (
          <TierarztAssistenzForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Unternehmensberatung':
        return (
          <UnternehmensberatungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Verwaltung':
        return (
          <VerwaltungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      case 'Weiterbildung':
        return (
          <WeiterbildungForm
            data={formData as any}
            onDataChange={handleDataChange as any}
            onValidationChange={() => {}}
          />
        );
      // Weitere Unterkategorien...
      default:
        return (
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {subcategory}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Spezifisches Formular für {subcategory} wird noch entwickelt.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Besondere Anforderungen
              </label>
              <textarea
                value={(formData as any).specialRequirements || ''}
                onChange={e =>
                  handleDataChange({
                    ...formData,
                    specialRequirements: e.target.value,
                  } as any)
                }
                placeholder="Beschreiben Sie Ihre spezifischen Anforderungen..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-vertical"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderForm()}

      {/* Validierungsanzeige und Button */}
      {formData && (
        <>
          {!isFormValid() && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center py-3 px-5 bg-gradient-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3 text-[#14ad9f]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-gray-700 font-medium">
                  Bitte füllen Sie alle Pflichtfelder aus, um fortzufahren.
                </span>
              </div>
            </div>
          )}

          {/* Button wird NUR angezeigt wenn das Formular vollständig ausgefüllt ist */}
          {isFormValid() && (
            <div className="mt-10 text-center">
              <button
                className="bg-[#14ad9f] hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow transition"
                onClick={handleNextClick}
              >
                Weiter zur Adresseingabe
              </button>
            </div>
          )}
        </>
      )}

      {/* Fehleranzeige */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="text-red-800 dark:text-red-200 font-semibold mb-2">
            Bitte korrigieren Sie folgende Fehler:
          </h4>
          <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SubcategoryFormManager;
