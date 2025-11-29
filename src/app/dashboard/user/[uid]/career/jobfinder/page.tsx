'use client';

import React from 'react';
import { JobfinderForm } from '@/components/jobs/JobfinderForm';
import { JobfinderSidebar } from '@/components/jobs/JobfinderSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase } from 'lucide-react';

export default function JobfinderPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>Bewerbercenter</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">Meine Jobfinder</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg">
            <Briefcase className="w-8 h-8 text-[#14ad9f]" />
          </div>
          Meine Jobfinder
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-3xl">
          Mit dem Jobfinder erhältst du immer die neusten, auf dich zugeschnittenen Jobs bequem per Mail. 
          Wähle einfach deine Suchkriterien aus und erstelle deinen Jobfinder.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content - Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Neuen Jobfinder erstellen</h2>
            <JobfinderForm userEmail={user?.email || ''} userId={user?.uid} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <JobfinderSidebar />
        </div>

      </div>
    </div>
  );
}
