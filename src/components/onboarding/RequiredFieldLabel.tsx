'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';

interface RequiredFieldLabelProps {
  children: React.ReactNode;
  required?: boolean;
  tooltip?: string;
  className?: string;
}

export function RequiredFieldLabel({ 
  children, 
  required = false, 
  tooltip, 
  className = "" 
}: RequiredFieldLabelProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Label className="text-lg font-semibold text-gray-900">
        {children}
        {required && (
          <span className="text-[#14ad9f] ml-1" title="Pflichtfeld">
            *
          </span>
        )}
      </Label>
      {tooltip && (
        <div className="relative group">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#14ad9f] text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#14ad9f]"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RequiredFieldIndicator() {
  return (
    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 text-[#14ad9f]">
        <Info className="h-5 w-5" />
        <span className="font-medium">Hinweis:</span>
      </div>
      <p className="text-gray-700 mt-1">
        Felder mit <span className="text-[#14ad9f] font-bold">*</span> sind Pflichtfelder und müssen ausgefüllt werden, um fortzufahren.
      </p>
    </div>
  );
}