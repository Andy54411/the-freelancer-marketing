'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, X, Video, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

interface InterviewInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    slots: { date: Date; time: string; meetingType?: string; allowCandidateChoice?: boolean }[],
    message: string,
    isVideoCall: boolean,
    videoLink?: string
  ) => void;
}

export function InterviewInvitationModal({
  isOpen,
  onClose,
  onConfirm,
}: InterviewInvitationModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [slots, setSlots] = useState<{ date: Date; time: string }[]>([]);
  const [message, setMessage] = useState(`
    <p>Hallo,</p>
    
    <p>gerne möchten wir Sie zu einem persönlichen Gespräch einladen.</p>
    
    <p><strong>Vorgeschlagene Termine:</strong><br/>
    Bitte wählen Sie einen passenden Termin aus den unten angegebenen Möglichkeiten.</p>
    
    <p><strong>Meeting-Art:</strong><br/>
    Sie können zwischen Video-Call, Telefonanruf oder einem persönlichen Termin wählen.</p>
    
    <p>Wir freuen uns auf das Gespräch mit Ihnen!</p>
    
    <p>Mit freundlichen Grüßen</p>
  `.trim());
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  
  // 🆕 Meeting-Typ Auswahl
  const [meetingType, setMeetingType] = useState<'video' | 'phone' | 'inperson'>('video');
  const [allowCandidateChoice, setAllowCandidateChoice] = useState(true);

  const handleAddSlot = () => {
    if (!selectedDate) {
      toast.error('Bitte wählen Sie ein Datum aus.');
      return;
    }
    if (!selectedTime) {
      toast.error('Bitte wählen Sie eine Uhrzeit aus.');
      return;
    }

    if (slots.length >= 3) {
      toast.error('Sie können maximal 3 Terminvorschläge hinzufügen.');
      return;
    }

    // Check for duplicates
    const isDuplicate = slots.some(
      slot =>
        slot.date.toDateString() === selectedDate.toDateString() && slot.time === selectedTime
    );

    if (isDuplicate) {
      toast.error('Diesen Termin haben Sie bereits hinzugefügt.');
      return;
    }

    setSlots([...slots, { date: selectedDate, time: selectedTime }]);
    setSelectedDate(undefined); // Reset selection
    setSelectedTime('10:00');
  };

  const handleRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (slots.length === 0) {
      toast.error('Bitte fügen Sie mindestens einen Terminvorschlag hinzu.');
      return;
    }
    
    // 🎯 Erweiterte Meeting-Daten
    const extendedSlots = slots.map(slot => ({
      ...slot,
      meetingType: allowCandidateChoice ? 'flexible' : meetingType,
      allowCandidateChoice
    }));
    
    onConfirm(extendedSlots, message, meetingType === 'video', videoLink);
    
    // Reset form
    setSlots([]);
    setMessage('');
    setIsVideoCall(false);
    setVideoLink('');
    setMeetingType('video');
    setAllowCandidateChoice(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview-Einladung senden</DialogTitle>
          <DialogDescription>
            Schlagen Sie dem Bewerber bis zu 3 Termine vor und wählen Sie die Meeting-Art. Der Bewerber kann dann seinen bevorzugten Termin und Typ auswählen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* 🎯 Meeting-Typ Auswahl */}
          <div className="flex flex-col gap-4 p-4 border rounded-lg bg-gradient-to-br from-teal-50 to-blue-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#14ad9f]" />
                Meeting-Art
              </h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="candidate-choice" className="text-sm font-medium cursor-pointer">
                  Bewerber entscheidet
                </Label>
                <Switch
                  id="candidate-choice"
                  checked={allowCandidateChoice}
                  onCheckedChange={setAllowCandidateChoice}
                />
              </div>
            </div>

            {!allowCandidateChoice && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                {/* Video Call Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    meetingType === 'video' 
                      ? 'border-[#14ad9f] bg-[#14ad9f]/10' 
                      : 'border-gray-200 bg-white hover:border-[#14ad9f]/50'
                  }`}
                  onClick={() => setMeetingType('video')}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Video className={`h-6 w-6 ${meetingType === 'video' ? 'text-[#14ad9f]' : 'text-gray-500'}`} />
                    <span className={`font-medium ${meetingType === 'video' ? 'text-[#14ad9f]' : 'text-gray-700'}`}>
                      Video-Call
                    </span>
                    <p className="text-xs text-gray-500">Online Meeting</p>
                  </div>
                </div>

                {/* Phone Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    meetingType === 'phone' 
                      ? 'border-[#14ad9f] bg-[#14ad9f]/10' 
                      : 'border-gray-200 bg-white hover:border-[#14ad9f]/50'
                  }`}
                  onClick={() => setMeetingType('phone')}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Phone className={`h-6 w-6 ${meetingType === 'phone' ? 'text-[#14ad9f]' : 'text-gray-500'}`} />
                    <span className={`font-medium ${meetingType === 'phone' ? 'text-[#14ad9f]' : 'text-gray-700'}`}>
                      Telefon
                    </span>
                    <p className="text-xs text-gray-500">Telefonanruf</p>
                  </div>
                </div>

                {/* In-Person Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    meetingType === 'inperson' 
                      ? 'border-[#14ad9f] bg-[#14ad9f]/10' 
                      : 'border-gray-200 bg-white hover:border-[#14ad9f]/50'
                  }`}
                  onClick={() => setMeetingType('inperson')}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <MapPin className={`h-6 w-6 ${meetingType === 'inperson' ? 'text-[#14ad9f]' : 'text-gray-500'}`} />
                    <span className={`font-medium ${meetingType === 'inperson' ? 'text-[#14ad9f]' : 'text-gray-700'}`}>
                      Persönlich
                    </span>
                    <p className="text-xs text-gray-500">Vor Ort</p>
                  </div>
                </div>
              </div>
            )}

            {allowCandidateChoice && (
              <div className="p-4 rounded-lg bg-white border border-teal-200">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="h-2 w-2 bg-teal-500 rounded-full"></span>
                  Der Bewerber kann bei der Terminbestätigung zwischen Video-Call, Telefon und persönlichem Termin wählen.
                </p>
              </div>
            )}

            {/* Video Link falls Video gewählt */}
            {(!allowCandidateChoice && meetingType === 'video') && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="video-link" className="mb-2 block text-sm font-medium">
                  Video-Call Link (Optional)
                </Label>
                <Input
                  id="video-link"
                  placeholder="z.B. Google Meet, Zoom oder Teams Link"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Falls leer, wird automatisch ein Taskilo Video-Call Link generiert.
                </p>
              </div>
            )}
          </div>

          {/* Date & Time Selection */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Label className="mb-2 block">Datum wählen</Label>
              <div className="border rounded-md p-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={date => date < new Date()}
                  initialFocus
                  className="rounded-md border shadow-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:w-[180px]">
              <div>
                <Label htmlFor="time" className="mb-2 block">
                  Uhrzeit
                </Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={selectedTime}
                    onChange={e => setSelectedTime(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddSlot}
                disabled={!selectedDate || slots.length >= 3}
                className="mt-auto w-full"
                variant="secondary"
              >
                Termin hinzufügen
              </Button>
            </div>
          </div>

          {/* Selected Slots */}
          {slots.length > 0 && (
            <div>
              <Label className="mb-2 block">Ausgewählte Termine ({slots.length}/3)</Label>
              <div className="space-y-2">
                {slots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border p-2 bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-[#14ad9f]" />
                      <span className="text-sm font-medium">
                        {format(slot.date, 'dd.MM.yyyy', { locale: de })} um {slot.time} Uhr
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveSlot(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal Message */}
          <div className="space-y-2">
            <Label>Persönliche Nachricht</Label>
            <div className="border rounded-md">
              <RichTextEditor
                value={message}
                onChange={setMessage}
                placeholder="Schreiben Sie hier Ihre Einladung..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={slots.length === 0}
            className="bg-[#14ad9f] hover:bg-[#14ad9f]/90 text-white"
          >
            Einladung senden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
