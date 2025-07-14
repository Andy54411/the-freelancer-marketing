// src/components/SimpleSelect.tsx
'use client';

import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value'> {
  options: string[];
  placeholder?: string;
  value: string | null;
}

export function SimpleSelect({
  className,
  options,
  placeholder,
  value,
  ...props
}: SimpleSelectProps) {
  return (
    // Der Container, der die Positionierung steuert.
    <div className={cn('relative w-full', className)}>
      {/* Das sichtbare Element. Die Klassen sind so gewählt, dass sie exakt
        dem Stil der <Input /> Komponente aus Ihrer Registrierungsseite entsprechen.
      */}
      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
        <span className={!value ? 'text-muted-foreground' : ''}>{value || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </div>

      {/* Das unsichtbare, aber funktionale <select>-Element. */}
      <select
        {...props}
        value={value || ''}
        className={cn(
          'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
