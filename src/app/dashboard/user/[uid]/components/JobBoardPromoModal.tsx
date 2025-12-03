'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { useRouter } from 'next/navigation';
import { Briefcase, UserCheck, ArrowRight } from 'lucide-react';
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

  return (
    <Modal title="Neu: Die Taskilo Jobbörse!" onClose={handleClose}>
      <div className="space-y-6">
        <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg border border-teal-100 dark:border-teal-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-800 rounded-full text-teal-600 dark:text-teal-300">
              <Briefcase size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-teal-900 dark:text-teal-100 mb-1">
                Finden Sie Ihren Traumjob
              </h4>
              <p className="text-sm text-teal-700 dark:text-teal-300">
                Entdecken Sie spannende Karrieremöglichkeiten direkt in Ihrem Dashboard. Unsere neue
                Jobbörse verbindet Sie mit Top-Arbeitgebern.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-gray-400">
              <UserCheck size={20} />
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-gray-100">
                Profil vervollständigen
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Je vollständiger Ihr Profil ist, desto besser können wir passende Jobs für Sie
                finden. Fügen Sie Fähigkeiten und Erfahrungen hinzu.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="dontShowAgain"
            checked={dontShowAgain}
            onCheckedChange={checked => setDontShowAgain(checked as boolean)}
            className="border-gray-300 data-[state=checked]:bg-[#14ad9f] data-[state=checked]:border-[#14ad9f] data-[state=checked]:text-white"
          />
          <label
            htmlFor="dontShowAgain"
            className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none"
          >
            Nicht mehr anzeigen
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleCompleteProfile}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <UserCheck size={18} />
            Profil vervollständigen
          </button>
          <button
            onClick={handleGoToJobs}
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            Zur Jobbörse
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default JobBoardPromoModal;
