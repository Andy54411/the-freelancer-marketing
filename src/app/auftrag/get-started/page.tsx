'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Combobox } from '@/components/combobox';
import { Label } from '@/components/ui/label';
import ProgressBar from '@/components/ProgressBar';
import { Info, X, Check, User, Building2, Users, Star, FileEdit, ChevronRight } from 'lucide-react';
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { app } from '@/firebase/clients';
import { categories } from '@/lib/categoriesData';
import { useRegistration } from '@/contexts/Registration-Context';
import SubcategoryFormManager from '@/components/subcategory-forms/SubcategoryFormManager';
import { SubcategoryData } from '@/types/subcategory-forms';

const auth = getAuth(app);

export default function GetStartedPage() {
  const {
    customerType,
    setCustomerType,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    subcategoryData,
    setSubcategoryData,
  } = useRegistration();

  const steps = ['Kundentyp', 'Kategorie', 'Unterkategorie', 'Projektdetails'];
  const TOTAL_STEPS = steps.length;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, _setError] = useState<string | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [isSubcategoryFormValid, setIsSubcategoryFormValid] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (_user: FirebaseUser | null) => {
      // Auth logic if needed
    });
    return () => unsubscribe();
  }, []);

  const logicalCurrentStep = useMemo(() => {
    if (!isClientMounted) return 0;

    const stepsCompleted = [
      !!customerType,
      !!selectedCategory,
      !!selectedSubcategory,
      !!(isSubcategoryFormValid && subcategoryData && Object.keys(subcategoryData).length > 0),
    ];

    return stepsCompleted.filter(Boolean).length;
  }, [
    customerType,
    selectedCategory,
    selectedSubcategory,
    isSubcategoryFormValid,
    subcategoryData,
    isClientMounted,
  ]);

  const stepForDisplay = isClientMounted ? logicalCurrentStep : 0;

  const handleCustomerTypeChange = (type: 'private' | 'business') => {
    setCustomerType(type);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategoryData(null);
    setIsSubcategoryFormValid(false);
  };

  const handleCategoryChange = (categoryValue: string) => {
    setSelectedCategory(categoryValue);
    setSelectedSubcategory(null);
    setSubcategoryData(null);
    setIsSubcategoryFormValid(false);
  };

  const handleSubcategoryChange = (subcategoryValue: string) => {
    setSelectedSubcategory(subcategoryValue);
    setSubcategoryData(null);
    setIsSubcategoryFormValid(false);
  };

  const handleSubcategoryDataChange = useCallback((data: SubcategoryData) => {
    setSubcategoryData(data);
  }, [setSubcategoryData]);

  const handleSubcategoryFormValidation = useCallback((isValid: boolean) => {
    setIsSubcategoryFormValid(isValid);
  }, []);

  const availableSubcategories =
    categories.find(cat => cat.title === selectedCategory)?.subcategories || [];

  const showSubcategoryForm = customerType && selectedCategory && selectedSubcategory;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 text-white">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/images/features/accounting-hero.png')" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Navigation */}
          <div className="flex justify-between items-center mb-6">
            <Link 
              href="/"
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 mr-1 rotate-180" />
              <span>Startseite</span>
            </Link>
            <Link 
              href="/"
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <span className="mr-2">Abbrechen</span>
              <X className="w-5 h-5" />
            </Link>
          </div>

          {/* Progress */}
          <div className="max-w-2xl mx-auto mb-6">
            <ProgressBar currentStep={stepForDisplay} totalSteps={TOTAL_STEPS} />
          </div>

          {/* Title */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <p className="text-lg text-white/80">Schritt {stepForDisplay} von {TOTAL_STEPS}</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="ml-3 text-white/60 hover:text-white transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Um welchen Auftrag handelt es sich?
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Finden Sie die Dienstleistung, die Sie benötigen, um geprüfte Handwerker in Ihrer Nähe zu kontaktieren.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-linear-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Customer Type Selection */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Für wen ist der Auftrag?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCustomerTypeChange('private')}
                  className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                    isClientMounted && customerType === 'private'
                      ? 'bg-[#14ad9f]/5 border-[#14ad9f] shadow-lg'
                      : 'bg-white border-gray-200 hover:border-[#14ad9f]/50 hover:shadow-md'
                  }`}
                >
                  {isClientMounted && customerType === 'private' && (
                    <div className="absolute top-3 right-3 p-1 bg-[#14ad9f] rounded-full">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`p-3 rounded-xl w-fit mb-3 ${
                    isClientMounted && customerType === 'private' ? 'bg-[#14ad9f] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className={`text-xl font-bold mb-1 ${
                    isClientMounted && customerType === 'private' ? 'text-[#14ad9f]' : 'text-gray-800'
                  }`}>
                    Privatperson
                  </h3>
                  <p className="text-sm text-gray-500">Ich buche für meinen privaten Bedarf</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCustomerTypeChange('business')}
                  className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                    isClientMounted && customerType === 'business'
                      ? 'bg-[#14ad9f]/5 border-[#14ad9f] shadow-lg'
                      : 'bg-white border-gray-200 hover:border-[#14ad9f]/50 hover:shadow-md'
                  }`}
                >
                  {isClientMounted && customerType === 'business' && (
                    <div className="absolute top-3 right-3 p-1 bg-[#14ad9f] rounded-full">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`p-3 rounded-xl w-fit mb-3 ${
                    isClientMounted && customerType === 'business' ? 'bg-[#14ad9f] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className={`text-xl font-bold mb-1 ${
                    isClientMounted && customerType === 'business' ? 'text-[#14ad9f]' : 'text-gray-800'
                  }`}>
                    Geschäftskunde
                  </h3>
                  <p className="text-sm text-gray-500">Ich buche für mein Unternehmen</p>
                </motion.button>
              </div>
            </div>

            {/* Category Selection */}
            {isClientMounted && customerType && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
              >
                <Label className="text-base font-semibold text-gray-800 mb-3 block">
                  Waehle eine Hauptkategorie
                </Label>
                <Combobox
                  options={categories.map(cat => cat.title)}
                  placeholder="z. B. Handwerk, IT & Technik ..."
                  selected={selectedCategory}
                  onChange={handleCategoryChange}
                />
              </motion.div>
            )}

            {/* Subcategory Selection */}
            {isClientMounted && selectedCategory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
              >
                <Label className="text-base font-semibold text-gray-800 mb-3 block">
                  Waehle eine Unterkategorie
                </Label>
                <Combobox
                  options={availableSubcategories}
                  placeholder="z. B. Elektriker, Umzugshelfer ..."
                  selected={selectedSubcategory}
                  onChange={handleSubcategoryChange}
                />
              </motion.div>
            )}

            {/* Subcategory Form */}
            {isClientMounted && showSubcategoryForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
              >
                <SubcategoryFormManager
                  subcategory={selectedSubcategory!}
                  onDataChange={handleSubcategoryDataChange}
                  onValidationChange={handleSubcategoryFormValidation}
                />
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start">
                <X className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md transition-shadow"
              >
                <div className="p-3 bg-[#14ad9f]/10 rounded-xl w-fit mx-auto mb-3">
                  <FileEdit className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <p className="font-bold text-gray-800">Auftrag erstellen</p>
                <p className="text-sm text-gray-500">kostenlos und ohne Verpflichtungen</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md transition-shadow"
              >
                <div className="p-3 bg-[#14ad9f]/10 rounded-xl w-fit mx-auto mb-3">
                  <Users className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <p className="font-bold text-gray-800">56.582+ Handwerker</p>
                <p className="text-sm text-gray-500">registrierte Dienstleister</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md transition-shadow"
              >
                <div className="p-3 bg-[#14ad9f]/10 rounded-xl w-fit mx-auto mb-3">
                  <Star className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <p className="font-bold text-gray-800">994.012+ Bewertungen</p>
                <p className="text-sm text-gray-500">unabhaengige Kundenbewertungen</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Steps Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Auftrag erstellen</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div 
                  key={step} 
                  className={`flex items-center p-3 rounded-xl ${
                    index < stepForDisplay ? 'bg-[#14ad9f]/10' : 'bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg mr-3 ${
                    index < stepForDisplay ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index < stepForDisplay ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <p className={`font-medium ${
                    index < stepForDisplay ? 'text-[#14ad9f]' : 'text-gray-700'
                  }`}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all"
              >
                Verstanden
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
