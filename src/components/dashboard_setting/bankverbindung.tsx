'use client';

import React from 'react';
import { UserDataForSettings } from '@/components/SettingsPage';

// ANPASSUNG: 'export' wurde hinzugefügt
export interface BankFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: string) => void;
}

const BankForm: React.FC<BankFormProps> = ({ formData, handleChange }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-1 font-medium text-gray-900 dark:text-gray-200">
            Kontoinhaber
          </label>
          <input
            type="text"
            value={formData?.step4?.accountHolder || ''}
            onChange={e => handleChange('step4.accountHolder', e.target.value)}
            className="w-full p-3 border rounded-md text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            placeholder="z. B. Max Mustermann"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-900 dark:text-gray-200">IBAN</label>
          <input
            type="text"
            value={formData?.step4?.iban || ''}
            onChange={e => handleChange('step4.iban', e.target.value)}
            className="w-full p-3 border rounded-md text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            placeholder="z. B. DE89 3704 0044 0532 0130 00"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-900 dark:text-gray-200">BIC</label>
          <input
            type="text"
            value={formData?.step4?.bic || ''}
            onChange={e => handleChange('step4.bic', e.target.value)}
            className="w-full p-3 border rounded-md text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            placeholder="z. B. COBADEFFXXX"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-900 dark:text-gray-200">
            Bankname
          </label>
          <input
            type="text"
            value={formData?.step4?.bankName || ''}
            onChange={e => handleChange('step4.bankName', e.target.value)}
            className="w-full p-3 border rounded-md text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            placeholder="z. B. Commerzbank"
          />
        </div>
      </div>
    </div>
  );
};
export default BankForm;
