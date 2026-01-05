'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { useRouter } from 'next/navigation';
import { Briefcase, UserCheck, ShoppingBag, Wrench } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface JobBoardPromoModalProps {
  onClose: (dontShowAgain: boolean) => void;
  uid: string;
}

const JobBoardPromoModal: React.FC<JobBoardPromoModalProps> = ({ onClose, uid }) => {
  const router = useRouter();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    onClose(dontShowAgain);
  };

  const handleCompleteProfile = () => {
    router.push(`/dashboard/user/${uid}/settings`);
    onClose(dontShowAgain);
  };

  const handleGoToJobs = () => {
    router.push(`/dashboard/user/${uid}/career`);
    onClose(dontShowAgain);
  };

  const handleGoToMarketplace = () => {
    router.push('/marketplace');
    onClose(dontShowAgain);
  };

  const handleGoToServices = () => {
    router.push('/services');
    onClose(dontShowAgain);
  };

  return (
    <Modal title="Entdecken Sie Taskilo!" onClose={handleClose}>
      <div className="space-y-5">
        {/* Drei Cards nebeneinander */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Jobbörse */}
          <button
            onClick={handleGoToJobs}
            className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400 mb-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
              <Briefcase size={24} />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Jobbörse</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Karrieremöglichkeiten entdecken
            </p>
          </button>

          {/* Marktplatz */}
          <button
            onClick={handleGoToMarketplace}
            className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400 mb-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
              <ShoppingBag size={24} />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Marktplatz</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Projekte finden oder anbieten
            </p>
          </button>

          {/* Services */}
          <button
            onClick={handleGoToServices}
            className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400 mb-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
              <Wrench size={24} />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Services</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Dienstleistungen durchsuchen
            </p>
          </button>
        </div>

        {/* Profil vervollständigen */}
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-teal-600 dark:text-teal-400">
            <UserCheck size={20} />
          </div>
          <div>
            <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              Profil vervollständigen
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Je vollständiger Ihr Profil, desto besser die Empfehlungen.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={checked => setDontShowAgain(checked as boolean)}
              className="border-gray-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 data-[state=checked]:text-white"
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none"
            >
              Nicht mehr anzeigen
            </label>
          </div>
          <button
            onClick={handleCompleteProfile}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserCheck size={16} />
            Profil bearbeiten
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default JobBoardPromoModal;
