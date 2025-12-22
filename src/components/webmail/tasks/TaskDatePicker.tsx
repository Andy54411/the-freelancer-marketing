'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Repeat } from 'lucide-react';

interface TaskDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export function TaskDatePicker({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
}: TaskDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      return new Date(selectedDate);
    }
    return new Date();
  });
  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate);
  const [timeValue, setTimeValue] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        setCurrentMonth(new Date(selectedDate));
        setTempSelectedDate(selectedDate);
      } else {
        setCurrentMonth(new Date());
        setTempSelectedDate('');
      }
      setTimeValue('');
    }
  }, [isOpen, selectedDate]);

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

  if (!isOpen) return null;

  const weekDays = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, ...)
    // Convert to Monday-based (0 = Monday, 6 = Sunday)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setTempSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const handleConfirm = () => {
    onDateSelect(tempSelectedDate);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!tempSelectedDate) return false;
    const selected = new Date(tempSelectedDate);
    return (
      day === selected.getDate() &&
      currentMonth.getMonth() === selected.getMonth() &&
      currentMonth.getFullYear() === selected.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={pickerRef}
        className="bg-[#303134] rounded-3xl shadow-xl w-[340px] overflow-hidden"
      >
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-300" />
          </button>
          <span className="text-white font-medium">
            {formatMonthYear(currentMonth)}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 px-4">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="h-10 flex items-center justify-center text-sm text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 px-4 pb-4">
          {days.map((day, index) => (
            <div key={index} className="h-10 flex items-center justify-center">
              {day !== null && (
                <button
                  onClick={() => handleDayClick(day)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors ${
                    isSelected(day)
                      ? 'bg-teal-500/30 text-teal-400 ring-2 ring-teal-500'
                      : isToday(day)
                      ? 'bg-teal-500 text-white'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Time Section */}
        <div className="border-t border-[#5f6368] px-6 py-4">
          <div className="flex items-center gap-4">
            <Clock className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              placeholder="Uhrzeit festlegen"
              className="flex-1 bg-[#3c4043] text-gray-300 placeholder-gray-500 px-4 py-2 rounded-lg text-sm border-none outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Repeat Section */}
        <div className="border-t border-[#5f6368] px-6 py-4">
          <button className="flex items-center gap-4 w-full text-left hover:bg-white/5 -mx-2 px-2 py-2 rounded-lg transition-colors">
            <Repeat className="h-5 w-5 text-gray-400" />
            <span className="text-gray-300 text-sm">Wiederholen</span>
          </button>
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
