'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Package, Edit, Save, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';
import { ServiceCreate } from '@/components/service/ServiceCreate';
import { ServiceEdit } from '@/components/service/ServiceEdit';
import { categories } from '@/lib/categoriesData';

// Simple test service interface
interface AdditionalService {
  name: string;
  description: string;
  price: number;
}

interface TestService {
  id: string;
  title: string;
  price: number;
  description: string;
  additionalServices?: AdditionalService[];
  features?: string[];
  deliveryTime?: number;
  deliveryUnit?: string;
  hasDuration?: boolean;
  duration?: number;
  packageType?: string;
  name?: string;
  subcategory?: string;
  serviceId?: string;
  active?: boolean;
}

// Main Component
const ServicesWorkingForm = ({ formData, setFormData }: any) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('manage');
  const [services, setServices] = useState<TestService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<TestService | null>(null);
  const [editForm, setEditForm] = useState({ title: '', price: 0, description: '' });
  const [allowedSubcategories, setAllowedSubcategories] = useState<string[]>([]);

  // Load company data and allowed subcategories
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user?.uid) return;

      try {
        const companyRef = doc(db, 'companies', user.uid);
        const companySnap = await getDoc(companyRef);
        
        if (companySnap.exists()) {
          const companyData = companySnap.data();
          console.log('Complete company data:', companyData);
          
          // Lade die spezifische Unterkategorie der Firma
          const selectedSubcategory = companyData.selectedSubcategory;
          console.log('Company selectedSubcategory:', selectedSubcategory);
          
          if (selectedSubcategory) {
            // Zeige nur die spezifische Unterkategorie der Firma
            setAllowedSubcategories([selectedSubcategory]);
            console.log('Setting allowed subcategories to:', [selectedSubcategory]);
          } else {
            console.log('No selectedSubcategory found in company data');
            
            // Fallback: Schaue nach 'category' Feld
            const companyCategory = companyData.category;
            console.log('Fallback - Company category:', companyCategory);
            
            if (companyCategory) {
              // Zeige nur diese eine Kategorie
              setAllowedSubcategories([companyCategory]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading company data:', error);
      }
    };

    loadCompanyData();
  }, [user?.uid]);

  // Load services from database
  useEffect(() => {
    const loadServices = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);
        const servicePackagesRef = collection(db, 'companies', user.uid, 'servicePackages');
        const querySnapshot = await getDocs(servicePackagesRef);
        
        const servicesList: TestService[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          servicesList.push({
            id: doc.id,
            title: data.title || 'Unbenannt',
            price: data.price || 0,
            description: data.description || '',
            additionalServices: data.additionalServices || [],
            features: data.features || [],
            deliveryTime: data.deliveryTime || 1,
            deliveryUnit: data.deliveryUnit || 'Tage',
            hasDuration: data.hasDuration || false,
            duration: data.duration || 0,
            packageType: data.packageType || 'basic',
            name: data.name || '',
            subcategory: data.subcategory || '',
            serviceId: data.serviceId || '',
            active: data.active !== false // Default to true if not specified
          });
        });
        
        setServices(servicesList);
        console.log('Loaded services:', servicesList);
      } catch (error) {
        console.error('Error loading services:', error);
        toast.error('Fehler beim Laden der Services');
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();
  }, [user?.uid]);

  const handleEditService = (service: TestService) => {
    setEditingService(service);
    setEditForm({
      title: service.title,
      price: service.price,
      description: service.description
    });
    setActiveTab('edit');
  };

  const handleSaveEdit = async () => {
    if (!editingService || !user?.uid) return;

    try {
      const serviceRef = doc(db, 'companies', user.uid, 'servicePackages', editingService.id);
      await updateDoc(serviceRef, {
        title: editForm.title,
        price: editForm.price,
        description: editForm.description,
        updatedAt: new Date()
      });

      // Update local state
      setServices(prev => prev.map(s => 
        s.id === editingService.id 
          ? { ...s, title: editForm.title, price: editForm.price, description: editForm.description }
          : s
      ));

      toast.success('Service erfolgreich aktualisiert!');
      setEditingService(null);
      setActiveTab('manage');
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Fehler beim Aktualisieren des Services');
    }
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setActiveTab('manage');
  };

  const handleServiceCreated = () => {
    setActiveTab('manage');
    // Reload services by triggering useEffect again
    window.location.reload();
  };

  // Convert TestService to ServiceItem format for ServiceEdit component
  const convertToServiceItem = (testService: TestService): any => {
    return {
      id: testService.id,
      title: testService.title || '',
      description: testService.description || '',
      subcategory: testService.subcategory || '',
      packages: {
        basic: {
          tier: 'basic',
          price: testService.price || 0,
          deliveryTime: testService.deliveryTime || 7,
          duration: testService.duration || 0,
          description: testService.description || '',
          features: testService.features || [],
          additionalServices: testService.additionalServices || []
        },
        standard: {
          tier: 'standard',
          price: 0,
          deliveryTime: 5,
          duration: 0,
          description: '',
          features: [],
          additionalServices: []
        },
        premium: {
          tier: 'premium',
          price: 0,
          deliveryTime: 3,
          duration: 0,
          description: '',
          features: [],
          additionalServices: []
        }
      },
      addons: testService.additionalServices || [],
      active: testService.active || true
    };
  };

  // Berechnet den Gesamtpreis eines Services (Grundpreis + Add-ons)
  const calculateTotalPrice = (service: TestService): number => {
    const basePrice = service.price || 0;
    const addOnsPrice = service.additionalServices?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0;
    return basePrice + addOnsPrice;
  };

  const handleDeleteService = async (service: TestService) => {
    if (!user?.uid) return;
    
    // Bestätigung vom Benutzer
    if (!window.confirm(`Möchten Sie den Service "${service.title}" wirklich löschen?`)) {
      return;
    }

    try {
      const serviceRef = doc(db, 'companies', user.uid, 'servicePackages', service.id);
      await deleteDoc(serviceRef);

      // Update local state
      setServices(prev => prev.filter(s => s.id !== service.id));

      toast.success('Service erfolgreich gelöscht!');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Fehler beim Löschen des Services');
    }
  };

  if (!user?.uid) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">Benutzer nicht gefunden</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage">Services verwalten ({services.length})</TabsTrigger>
          <TabsTrigger value="create">Service erstellen</TabsTrigger>
          <TabsTrigger value="edit" disabled={!editingService}>
            {editingService ? `Bearbeiten: ${editingService.title}` : 'Bearbeiten'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-6">
          {services.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Services gefunden
              </h3>
              <p className="text-gray-500 mb-4">
                Erstellen Sie zunächst Services über das normale Interface.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Gefundene Services</h3>
              </div>

              <div className="grid gap-4">
                {services.map((service) => (
                  <div key={service.id} className="border rounded-lg p-6 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {service.title}
                        </h4>
                        {service.description && service.description.trim() && 
                         !service.description.match(/^[a-z]{20,}$/) && (
                          <p className="text-gray-600 mb-3">{service.description}</p>
                        )}
                        
                        {/* Preisaufschlüsselung */}
                        <div className="mb-4">
                          <div className="text-xl font-bold text-[#14ad9f]">
                            €{calculateTotalPrice(service).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditService(service)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteService(service)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Löschen
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 border-t pt-2">
                      Service ID: {service.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <ServiceCreate 
            allowedSubcategories={allowedSubcategories}
            onServiceCreated={handleServiceCreated}
          />
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          {editingService && (
            <ServiceEdit 
              service={convertToServiceItem(editingService)}
              editingPackageType="basic" // Default zu basic - später dynamisch machen
              onCancel={handleCancelEdit}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServicesWorkingForm;