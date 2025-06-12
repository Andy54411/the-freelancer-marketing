// src/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/DateTimeSelector.tsx
'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { generalTimeOptionsForSidebar } from '@/lib/constants'; // Stelle sicher, dass generalTimeOptionsForSidebar importiert wird


interface DateTimeSelectorProps {
    finalSelectedTime: string;
    setFinalSelectedTime: (time: string) => void;
}

export default function DateTimeSelector({
    finalSelectedTime,
    setFinalSelectedTime,
}: DateTimeSelectorProps) {

    // Handler für die Tageszeit-Radio-Buttons
    const handleTimeRangeChange = (timeRangeKey: 'morning' | 'afternoon' | 'evening' | null) => {
        let newSelectedTime: string = '';

        switch (timeRangeKey) {
            case 'morning':
                newSelectedTime = '08:00'; // Erster Wert der Morgen-Spanne
                break;
            case 'afternoon':
                newSelectedTime = '12:00'; // Erster Wert der Nachmittags-Spanne
                break;
            case 'evening':
                newSelectedTime = '17:00'; // Erster Wert der Abend-Spanne
                break;
            case null: // Wenn "Ich bin flexibel" oder nichts ausgewählt ist
            default:
                newSelectedTime = '';
        }
        setFinalSelectedTime(newSelectedTime); // Aktualisiere den State für die bevorzugte Uhrzeit
    };

    // Bestimme, welcher Radio-Button (Morgens, Nachmittags, Abends) ausgewählt ist
    const currentSelectedTimeRangeKey = React.useMemo(() => {
        if (!finalSelectedTime) return null; // 'Ich bin flexibel' ist nicht Teil dieser Gruppe

        const time = parseInt(finalSelectedTime.split(':')[0]);
        if (time >= 8 && time < 12) return 'morning';
        if (time >= 12 && time < 17) return 'afternoon';
        if (time >= 17 && time < 22) return 'evening';
        return null; // Wenn die Zeit außerhalb dieser Spannen liegt
    }, [finalSelectedTime]);


    return (
        <>
            <div className="pt-4 border-t border-gray-200">
                <Label className="text-sm font-medium text-gray-700">Tageszeit</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                    {/* Radio-Button für flexible Zeit */}
                    <label htmlFor="timeFlexible" className={`flex items-center p-2 border rounded-md cursor-pointer transition-all duration-200 ${currentSelectedTimeRangeKey === null ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white hover:bg-gray-50'}`}>
                        <input
                            type="radio"
                            id="timeFlexible"
                            name="timeOfDay"
                            value="flexible"
                            checked={currentSelectedTimeRangeKey === null} // Null bedeutet flexibel
                            onChange={() => handleTimeRangeChange(null)}
                            className="mr-2 accent-[#14ad9f] focus:ring-[#14ad9f]"
                        />
                        Ich bin flexibel
                    </label>

                    {/* Radio-Button für Morgens */}
                    <label htmlFor="timeMorning" className={`flex items-center p-2 border rounded-md cursor-pointer transition-all duration-200 ${currentSelectedTimeRangeKey === 'morning' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white hover:bg-gray-50'}`}>
                        <input
                            type="radio"
                            id="timeMorning"
                            name="timeOfDay"
                            value="morning"
                            checked={currentSelectedTimeRangeKey === 'morning'}
                            onChange={() => handleTimeRangeChange('morning')}
                            className="mr-2 accent-[#14ad9f] focus:ring-[#14ad9f]"
                        />
                        Morgens (08:00 – 12:00 Uhr)
                    </label>

                    {/* Radio-Button für Nachmittags */}
                    <label htmlFor="timeAfternoon" className={`flex items-center p-2 border rounded-md cursor-pointer transition-all duration-200 ${currentSelectedTimeRangeKey === 'afternoon' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white hover:bg-gray-50'}`}>
                        <input
                            type="radio"
                            id="timeAfternoon"
                            name="timeOfDay"
                            value="afternoon"
                            checked={currentSelectedTimeRangeKey === 'afternoon'}
                            onChange={() => handleTimeRangeChange('afternoon')}
                            className="mr-2 accent-[#14ad9f] focus:ring-[#14ad9f]"
                        />
                        Nachmittags (12:00 – 17:00 Uhr)
                    </label>

                    {/* Radio-Button für Abends */}
                    <label htmlFor="timeEvening" className={`flex items-center p-2 border rounded-md cursor-pointer transition-all duration-200 ${currentSelectedTimeRangeKey === 'evening' ? 'bg-[#ecfdfa] border-[#14ad9f]' : 'bg-white hover:bg-gray-50'}`}>
                        <input
                            type="radio"
                            id="timeEvening"
                            name="timeOfDay"
                            value="evening"
                            checked={currentSelectedTimeRangeKey === 'evening'}
                            onChange={() => handleTimeRangeChange('evening')}
                            className="mr-2 accent-[#14ad9f] focus:ring-[#14ad9f]"
                        />
                        Abends (17:00 – 21:30 Uhr)
                    </label>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
                <Label className="text-sm font-medium text-gray-700">Bevorzugte Uhrzeit</Label>
                <select
                    value={finalSelectedTime}
                    onChange={(e) => setFinalSelectedTime(e.target.value)}
                    className="w-full border rounded-md p-2 mt-1 text-sm text-gray-700 bg-white"
                >
                    <option value="">Ich bin flexibel</option>
                    {generalTimeOptionsForSidebar.map((time: string) => <option key={time} value={time}>{time}</option>)}
                </select>
            </div>
        </>
    );
}