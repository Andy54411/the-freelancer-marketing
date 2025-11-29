import React from 'react';
import { ExternalLink } from 'lucide-react';

export const JobfinderSidebar = () => {
  return (
    <div className="space-y-6">
      <div className="bg-linear-to-br from-teal-50 to-white border border-teal-100 rounded-xl p-6 shadow-xs">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Interesse an weiteren kostenfreien Webinaren?
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Sie möchten mehr zur richtigen Formulierung von Stellenanzeigen wissen oder haben Interesse an den aktuellen Arbeitsmarkt-Insights? Dieses und vieles mehr bieten Ihnen unsere kostenfreien Webinare.
        </p>
        <p className="text-gray-600 text-sm mb-6">
          Schauen Sie einfach auf unserer Webinarübersicht und melden Sie sich direkt zu Ihren Wunsch-Webinaren oder zu unserem Wissens-Newsletter an.
        </p>
        <a 
          href="#" 
          className="inline-flex items-center justify-center w-full px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium group"
        >
          Zu den Webinaren
          <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};
