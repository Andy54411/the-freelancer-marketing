'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface RepeatConfig {
  interval: number;
  unit: 'day' | 'week' | 'month' | 'year';
  time?: string;
  startDate: string;
  endType: 'never' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
}

interface TaskRepeatPickerProps {
  isOpen: boolean;
  onClose: () => void;
  repeatConfig?: RepeatConfig;
  onRepeatSelect: (config: RepeatConfig | null) => void;
  startDate?: string;
}

export function TaskRepeatPicker({
  isOpen,
  onClose,
  repeatConfig,
  onRepeatSelect,
  startDate,
}: TaskRepeatPickerProps) {
  const [interval, setInterval] = useState(repeatConfig?.interval || 1);
  const [unit, setUnit] = useState<'day' | 'week' | 'month' | 'year'>(repeatConfig?.unit || 'day');
  const [time, setTime] = useState(repeatConfig?.time || '');
  const [repeatStartDate, setRepeatStartDate] = useState(
    repeatConfig?.startDate || startDate || new Date().toISOString().split('T')[0]
  );
  const [endType, setEndType] = useState<'never' | 'date' | 'count'>(repeatConfig?.endType || 'never');
  const [endDate, setEndDate] = useState(repeatConfig?.endDate || '');
  const [endCount, setEndCount] = useState(repeatConfig?.endCount || 30);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  
  const pickerRef = useRef<HTMLDivElement>(null);
  const unitDropdownRef = useRef<HTMLDivElement>(null);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      if (repeatConfig) {
        setInterval(repeatConfig.interval);
        setUnit(repeatConfig.unit);
        setTime(repeatConfig.time || '');
        setRepeatStartDate(repeatConfig.startDate);
        setEndType(repeatConfig.endType);
        setEndDate(repeatConfig.endDate || '');
        setEndCount(repeatConfig.endCount || 30);
      } else {
        setInterval(1);
        setUnit('day');
        setTime('');
        setRepeatStartDate(startDate || new Date().toISOString().split('T')[0]);
        setEndType('never');
        setEndDate('');
        setEndCount(30);
      }
    }
  }, [isOpen, repeatConfig, startDate]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close unit dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
        setShowUnitDropdown(false);
      }
    };

    if (showUnitDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUnitDropdown]);

  if (!isOpen) return null;

  const unitLabels = {
    day: 'Tag',
    week: 'Woche',
    month: 'Monat',
    year: 'Jahr',
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleConfirm = () => {
    const config: RepeatConfig = {
      interval,
      unit,
      time: time || undefined,
      startDate: repeatStartDate,
      endType,
      endDate: endType === 'date' ? endDate : undefined,
      endCount: endType === 'count' ? endCount : undefined,
    };
    onRepeatSelect(config);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Generate default end date (1 month from start)
  const getDefaultEndDate = () => {
    const date = new Date(repeatStartDate);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={pickerRef}
        className="bg-[#303134] rounded-3xl shadow-xl w-[340px] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5">
          <h2 className="text-white text-lg">Wiederholung alle:</h2>
        </div>

        {/* Interval and Unit */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-3">
            {/* Interval Input */}
            <input
              type="number"
              min="1"
              max="99"
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-[#3c4043] text-white px-4 py-3 rounded-lg text-sm border border-[#5f6368] outline-none focus:border-teal-500"
            />

            {/* Unit Dropdown */}
            <div className="relative flex-1" ref={unitDropdownRef}>
              <button
                onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                className="w-full flex items-center justify-between bg-[#3c4043] text-white px-4 py-3 rounded-lg text-sm border border-[#5f6368] hover:border-gray-500 transition-colors"
              >
                <span>{unitLabels[unit]}</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showUnitDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showUnitDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#3c4043] border border-[#5f6368] rounded-lg shadow-lg z-10 overflow-hidden">
                  {(['day', 'week', 'month', 'year'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        setUnit(u);
                        setShowUnitDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                        unit === u ? 'text-teal-400 bg-teal-500/10' : 'text-white'
                      }`}
                    >
                      {unitLabels[u]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Time Input */}
        <div className="px-6 pb-4">
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="Uhrzeit festlegen"
            className="w-full bg-[#3c4043] text-white placeholder-gray-500 px-4 py-3 rounded-lg text-sm border border-[#5f6368] outline-none focus:border-teal-500"
          />
        </div>

        {/* Start Date */}
        <div className="px-6 pb-4">
          <label className="block text-white text-sm mb-2">Beginn</label>
          <div className="relative">
            <input
              type="date"
              value={repeatStartDate}
              onChange={(e) => setRepeatStartDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="bg-[#3c4043] text-white px-4 py-3 rounded-lg text-sm border border-[#5f6368] cursor-pointer hover:border-gray-500 transition-colors">
              {formatDate(repeatStartDate)}
            </div>
          </div>
        </div>

        {/* End Options */}
        <div className="px-6 pb-6">
          <label className="block text-white text-sm mb-3">Ende</label>
          
          {/* Never */}
          <label className="flex items-center gap-3 py-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              endType === 'never' ? 'border-teal-500' : 'border-gray-500 group-hover:border-gray-400'
            }`}>
              {endType === 'never' && (
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              )}
            </div>
            <span className="text-white text-sm">Nie</span>
          </label>
          <input
            type="radio"
            name="endType"
            checked={endType === 'never'}
            onChange={() => setEndType('never')}
            className="hidden"
          />

          {/* On Date */}
          <label className="flex items-center gap-3 py-2 cursor-pointer group">
            <div 
              onClick={() => setEndType('date')}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                endType === 'date' ? 'border-teal-500' : 'border-gray-500 group-hover:border-gray-400'
              }`}
            >
              {endType === 'date' && (
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              )}
            </div>
            <span className="text-white text-sm">Am</span>
            <div className="relative flex-1">
              <input
                type="date"
                value={endDate || getDefaultEndDate()}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setEndType('date');
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className={`bg-[#3c4043] px-4 py-2 rounded-lg text-sm border border-[#5f6368] ${
                endType === 'date' ? 'text-white' : 'text-gray-500'
              }`}>
                {formatDateShort(endDate || getDefaultEndDate())}
              </div>
            </div>
          </label>

          {/* After Count */}
          <label className="flex items-center gap-3 py-2 cursor-pointer group">
            <div 
              onClick={() => setEndType('count')}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                endType === 'count' ? 'border-teal-500' : 'border-gray-500 group-hover:border-gray-400'
              }`}
            >
              {endType === 'count' && (
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              )}
            </div>
            <span className="text-white text-sm">Nach</span>
            <input
              type="number"
              min="1"
              max="999"
              value={endCount}
              onChange={(e) => {
                setEndCount(Math.max(1, parseInt(e.target.value) || 1));
                setEndType('count');
              }}
              className={`w-16 bg-[#3c4043] px-3 py-2 rounded-lg text-sm border border-[#5f6368] outline-none focus:border-teal-500 ${
                endType === 'count' ? 'text-white' : 'text-gray-500'
              }`}
            />
            <span className={`text-sm ${endType === 'count' ? 'text-white' : 'text-gray-500'}`}>Mal</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-[#5f6368] px-6 py-4 flex items-center justify-center gap-4">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-teal-400 font-medium text-sm hover:bg-white/5 rounded-full transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-teal-400 font-medium text-sm border border-teal-500 rounded-full hover:bg-teal-500/10 transition-colors"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
