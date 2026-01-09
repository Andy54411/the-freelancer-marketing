'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
}

interface TeamPresenceIndicatorProps {
  companyId: string;
  customerId?: string;
  teamMembers: TeamMember[];
}

/**
 * Zeigt an welche Team-Mitglieder gerade im WhatsApp-Chat aktiv sind
 *
 * Features:
 * - Online-Status Indicator (grüner Punkt)
 * - Avatar-Liste
 * - Typing Indicator (später)
 */
export function TeamPresenceIndicator({
  companyId: _companyId,
  customerId: _customerId,
  teamMembers,
}: TeamPresenceIndicatorProps) {
  const [onlineMembers, setOnlineMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    // TODO: Implement real-time presence tracking
    // Für jetzt zeigen wir einfach alle Members
    setOnlineMembers(teamMembers.filter(m => m.isOnline));
  }, [teamMembers]);

  if (onlineMembers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-200">
      <Users className="h-4 w-4 text-green-600" />
      <span className="text-sm text-green-700">
        {onlineMembers.length} Team-{onlineMembers.length === 1 ? 'Mitglied' : 'Mitglieder'} online
      </span>

      <div className="flex -space-x-2 ml-2">
        <TooltipProvider>
          {onlineMembers.slice(0, 5).map(member => (
            <Tooltip key={member.id}>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-white">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-xs bg-teal-100 text-teal-700">
                      {member.firstName[0]}
                      {member.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {member.firstName} {member.lastName}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

        {onlineMembers.length > 5 && (
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-200 border-2 border-white text-xs text-gray-600">
            +{onlineMembers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Message Badge - Zeigt an wer eine Nachricht gesendet hat
 */
interface MessageAuthorBadgeProps {
  sentBy?: string;
  sentByName?: string;
  timestamp: Date;
}

export function MessageAuthorBadge({ sentBy, sentByName, timestamp }: MessageAuthorBadgeProps) {
  if (!sentBy || !sentByName) {
    return (
      <p className="text-xs text-teal-100 mt-1">
        {timestamp.toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <Badge variant="outline" className="text-xs bg-teal-500 text-white border-teal-400">
        {sentByName}
      </Badge>
      <p className="text-xs text-teal-100">
        {timestamp.toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}
