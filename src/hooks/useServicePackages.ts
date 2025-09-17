import { useState } from 'react';
import { collection, addDoc, query, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';
import { ServicePackage, AddonItem, PackageDataState } from '@/types/service';

export const useServicePackages = (userId: string) => {
  const [isLoading, setIsLoading] = useState(false);

  // Check if package type already exists for this user
  const checkPackageTypeExists = async (packageType: 'basic' | 'standard' | 'premium'): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    try {
      const servicePackagesRef = collection(db, 'companies', userId, 'servicePackages');
      const q = query(servicePackagesRef, where('packageType', '==', packageType));
      const querySnapshot = await getDocs(q);
      
      console.log(`🔍 Checking if ${packageType} package exists:`, !querySnapshot.empty);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking package type existence:', error);
      return false;
    }
  };

  // Load service packages for editing
  const loadServicePackages = async (serviceId: string): Promise<{
    packages: ServicePackage[];
    addons: AddonItem[];
  }> => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    try {
      setIsLoading(true);
      console.log('🔄 Loading service packages for serviceId:', serviceId);
      
      // Load service packages from Firebase
      const servicePackagesRef = collection(db, 'companies', userId, 'servicePackages');
      const q = query(servicePackagesRef, where('serviceId', '==', serviceId));
      console.log('🔍 Querying servicePackages with serviceId:', serviceId);
      console.log('🔍 User UID:', userId);
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Query snapshot empty?', querySnapshot.empty);
      console.log('📊 Query snapshot size:', querySnapshot.size);
      
      if (!querySnapshot.empty) {
        const packages: ServicePackage[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📦 Raw document data:', doc.id, data);
          packages.push({ 
            id: doc.id, 
            ...data,
            // Ensure required fields have defaults
            name: data.name || '',
            title: data.title || '',
            description: data.description || '',
            price: data.price || 0,
            features: data.features || [],
            revisions: data.revisions || 0,
            active: data.active !== undefined ? data.active : true,
            tier: data.packageType, // Map packageType to tier for compatibility
            packageType: data.packageType,
            serviceId: data.serviceId,
            deliveryTime: data.deliveryTime,
            duration: data.duration || data.deliveryTime, // fallback to deliveryTime if no duration
            additionalServices: data.additionalServices || [],
            subcategory: data.subcategory
          } as ServicePackage);
        });
        
        console.log('📦 Processed packages:', packages);
        
        // Extract addons from the first package (they should be the same across packages)
        const addons = packages.length > 0 && packages[0].additionalServices 
          ? packages[0].additionalServices 
          : [];
        
        console.log('✅ Loaded packages and addons:', { packages, addons });
        
        return { packages, addons };
      } else {
        console.log('No service packages found for serviceId:', serviceId);
        return { packages: [], addons: [] };
      }
    } catch (error) {
      console.error('Error loading service packages:', error);
      toast.error('Fehler beim Laden der Service-Pakete');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Save service packages
  const saveServicePackages = async (
    serviceId: string,
    serviceTitle: string,
    serviceCategory: string,
    activePackageData: PackageDataState, // Nur aktive Pakete
    addons: AddonItem[]
  ) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      setIsLoading(true);
      
      // Check if any of the package types already exist
      const packageTypes = Object.keys(activePackageData) as ('basic' | 'standard' | 'premium')[];
      for (const packageType of packageTypes) {
        const exists = await checkPackageTypeExists(packageType);
        if (exists) {
          toast.error(`Ein ${packageType.toUpperCase()} Service existiert bereits! Pro Typ ist nur ein Service erlaubt.`);
          return;
        }
      }
      
      const servicePackagesRef = collection(db, 'companies', userId, 'servicePackages');
      
      console.log('🔄 Speichere nur aktive Pakete:', Object.keys(activePackageData));
      
      // Save each ACTIVE package tier only
      const packagePromises = Object.entries(activePackageData).map(([tier, data]) => {
        // Definiere Kategorien, die Revisionen benötigen basierend auf echten categoriesData
        const categoriesWithRevisions = [
          // IT & Digital - benötigen definitiv Revisionen
          'Webentwicklung', 'App-Entwicklung', 'Softwareentwicklung',
          
          // Kreativ & Kunst - benötigen Revisionen für Design-Arbeit
          'Fotograf', 'Videograf', 'Grafiker', 'Texter', 'Dekoration',
          
          // Marketing & Vertrieb - Content braucht oft Revisionen
          'OnlineMarketing', 'Social Media Marketing', 'ContentMarketing', 'Marketingberater',
          
          // Event & Veranstaltung - Planung braucht oft Anpassungen
          'Eventplanung', 'DJService',
          
          // Büro & Administration - Content-basierte Arbeit
          'Recherche'
        ];
        
        const needsRevisions = categoriesWithRevisions.some(cat => 
          serviceCategory.toLowerCase().includes(cat.toLowerCase())
        );
        
        // Berechne Gesamtpreis: Package + alle Add-ons
        const addonsTotal = addons.reduce((sum, addon) => sum + (addon.price || 0), 0);
        const totalPrice = (data.price || 0) + addonsTotal;
        
        const packageToSave = {
          serviceId: serviceId,
          packageType: tier,
          name: tier.charAt(0).toUpperCase() + tier.slice(1),
          title: serviceTitle,
          description: data.description,
          price: data.price,
          addonsTotal: addonsTotal, // Gesamtsumme aller Add-ons
          totalPrice: totalPrice,   // Gesamtpreis (Package + Add-ons)
          deliveryTime: data.deliveryTime,
          deliveryUnit: data.deliveryUnit,
          duration: data.duration,
          hasDuration: data.hasDuration,
          features: data.features,
          // Nur bei Design/Entwicklung/Content Kategorien Revisionen hinzufügen
          ...(needsRevisions && { revisions: data.revisions || 1 }),
          active: true, // Paket ist grundsätzlich aktiv wenn es erstellt wird
          additionalServices: addons,
          subcategory: serviceCategory,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        console.log('💾 Speichere Paket:', tier, packageToSave);
        console.log('🎯 Kategorie benötigt Revisionen:', needsRevisions, 'für', serviceCategory);
        return addDoc(servicePackagesRef, packageToSave);
      });
      
      await Promise.all(packagePromises);
      console.log(`✅ ${Object.keys(activePackageData).length} Service packages saved successfully`);
      toast.success('Service-Pakete erfolgreich gespeichert!');
      
    } catch (error) {
      console.error('Error saving service packages:', error);
      toast.error('Fehler beim Speichern der Service-Pakete');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    loadServicePackages,
    saveServicePackages,
    checkPackageTypeExists
  };
};