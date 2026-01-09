'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Users,
  Check,
  ChevronDown,
  Loader2,
  UserPlus,
  Crown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db } from '@/firebase/clients';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
  isOnline?: boolean;
}

interface ChatAssignmentDropdownProps {
  companyId: string;
  chatPhone: string;
  currentAssignee?: string;
  onAssignmentChange?: (newAssigneeId: string | null, newAssigneeName: string | null) => void;
}

export default function ChatAssignmentDropdown({
  companyId,
  chatPhone,
  currentAssignee,
  onAssignmentChange,
}: ChatAssignmentDropdownProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [currentAssigneeName, setCurrentAssigneeName] = useState<string | null>(null);
  const [availableSeats, setAvailableSeats] = useState<number>(0);

  const loadTeamMembers = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);

      // Hole Company-Daten für Seat-Info
      const companyDoc = await getDocs(
        query(collection(db, 'companies'), where('__name__', '==', companyId))
      );
      
      if (!companyDoc.empty) {
        const companyData = companyDoc.docs[0].data();
        const additionalSeats = companyData.seats?.additional || 0;
        setAvailableSeats(1 + additionalSeats); // 1 Basis-Seat + zusätzliche
      }

      // Hole Team-Mitglieder (Employees)
      const employeesSnapshot = await getDocs(
        collection(db, 'companies', companyId, 'employees')
      );

      const members: TeamMember[] = employeesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
          email: data.email,
          role: data.role || 'member',
          avatar: data.avatar,
          isOnline: data.isOnline || false,
        };
      });

      // Füge den Besitzer hinzu
      const companyOwnerDoc = await getDocs(
        query(collection(db, 'companies'), where('__name__', '==', companyId))
      );
      
      if (!companyOwnerDoc.empty) {
        const ownerData = companyOwnerDoc.docs[0].data();
        members.unshift({
          id: companyId,
          name: ownerData.name || ownerData.companyName || 'Inhaber',
          email: ownerData.email || '',
          role: 'owner',
          isOnline: true,
        });
      }

      setTeamMembers(members);

      // Finde aktuellen Zuweisungsnamen
      if (currentAssignee) {
        const assignee = members.find(m => m.id === currentAssignee);
        setCurrentAssigneeName(assignee?.name || null);
      }
    } catch {
      toast.error('Team-Mitglieder konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [companyId, currentAssignee]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  const handleAssign = async (memberId: string | null, memberName: string | null) => {
    if (assigning) return;

    try {
      setAssigning(true);

      // Normalisiere Telefonnummer
      const normalizedPhone = chatPhone.replace(/\D/g, '');

      // Aktualisiere WhatsApp-Kontakt
      await updateDoc(
        doc(db, 'companies', companyId, 'whatsappContacts', normalizedPhone),
        {
          assignedTo: memberId,
          assignedAt: memberId ? new Date() : null,
          updatedAt: new Date(),
        }
      );

      // Protokolliere Aktivität
      const { addDoc } = await import('firebase/firestore');
      await addDoc(
        collection(db, 'companies', companyId, 'whatsappActivity'),
        {
          type: memberId ? 'chat_assigned' : 'chat_unassigned',
          contactPhone: chatPhone,
          assignedTo: memberId,
          assignedToName: memberName,
          timestamp: new Date(),
        }
      );

      setCurrentAssigneeName(memberName);
      onAssignmentChange?.(memberId, memberName);

      toast.success(
        memberId
          ? `Chat an ${memberName} zugewiesen`
          : 'Chat-Zuweisung entfernt'
      );
    } catch {
      toast.error('Fehler beim Zuweisen des Chats');
    } finally {
      setAssigning(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-amber-500" />;
      case 'admin':
        return <Users className="w-3 h-3 text-blue-500" />;
      default:
        return <User className="w-3 h-3 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Laden...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
          disabled={assigning}
        >
          {assigning ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#14ad9f]" />
          ) : currentAssigneeName ? (
            <>
              <div className="w-6 h-6 rounded-full bg-[#14ad9f] flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {currentAssigneeName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">{currentAssigneeName}</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <UserPlus className="w-3 h-3 text-gray-500" />
              </div>
              <span className="text-sm text-gray-500">Nicht zugewiesen</span>
            </>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500">
            Team-Mitglieder ({teamMembers.length}/{availableSeats} Seats)
          </p>
        </div>

        {teamMembers.slice(0, availableSeats).map(member => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => handleAssign(member.id, member.name)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-600">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {member.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900">{member.name}</span>
                  {getRoleIcon(member.role)}
                </div>
                <span className="text-xs text-gray-500">{member.email}</span>
              </div>
            </div>
            {currentAssignee === member.id && (
              <Check className="w-4 h-4 text-[#14ad9f]" />
            )}
          </DropdownMenuItem>
        ))}

        {currentAssignee && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAssign(null, null)}
              className="text-red-600 cursor-pointer"
            >
              <User className="w-4 h-4 mr-2" />
              Zuweisung entfernen
            </DropdownMenuItem>
          </>
        )}

        {teamMembers.length > availableSeats && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 bg-amber-50 text-amber-700 text-xs">
              {teamMembers.length - availableSeats} weitere Mitglieder benötigen zusätzliche Seats
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
