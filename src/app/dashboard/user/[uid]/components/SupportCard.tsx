import React from 'react';
import { DashboardCard } from './DashboardCard';
import { HelpCircle } from 'lucide-react';

interface SupportCardProps {
  onSupportClick: () => void;
}

export const SupportCard: React.FC<SupportCardProps> = ({ onSupportClick }) => {
  return (
    <DashboardCard className="h-fit">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Hilfe & Support</h3>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          Benötigen Sie Hilfe? Unser Support-Team ist 24/7 für Sie da.
        </p>
        <button
          onClick={onSupportClick}
          className="w-full px-3 py-2 bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-[#129a8f] hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl text-sm"
        >
          Support kontaktieren
        </button>
      </div>
    </DashboardCard>
  );
};
