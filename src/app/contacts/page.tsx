'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Star,
  Clock,
  Plus,
  Trash2,
  Upload,
  MoreVertical,
  Printer,
  Download,
  Loader2,
  Info,
  Merge,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MailHeader } from '@/components/webmail/MailHeader';
import { ViewContactPanel, ContactData } from '@/components/webmail/ViewContactPanel';
import { CreateContactPanel, ContactFormData } from '@/components/webmail/CreateContactPanel';
import { CreateMultipleContactsModal } from '@/components/webmail/CreateMultipleContactsModal';

// Webmail Cookie
const COOKIE_NAME = 'webmail_session';

function decodeCredentials(encoded: string): { email: string; password: string } | null {
  try {
    const binString = atob(encoded);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function getCookie(): { email: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME && value) {
      return decodeCredentials(value);
    }
  }
  return null;
}

// Avatar colors like Google
const AVATAR_COLORS = [
  'bg-red-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500',
  'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-green-500',
  'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-amber-500',
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Types
interface EmailContact {
  id: string;
  email: string;
  name: string;
  lastContacted: string;
  contactCount: number;
  source: 'sent' | 'received' | 'both';
  starred?: boolean;
}

interface Label {
  id: string;
  name: string;
  count: number;
}

type ViewType = 'contacts' | 'frequent' | 'other' | 'trash' | 'label';

function ContactsPageContent() {
  const router = useRouter();
  
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [labels] = useState<Label[]>([
    { id: '1', name: 'Coworkers', count: 4 },
    { id: '2', name: 'Lehrer', count: 0 },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentView, setCurrentView] = useState<ViewType>('contacts');
  const [selectedContact, setSelectedContact] = useState<EmailContact | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showMultipleContactsModal, setShowMultipleContactsModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmailContact | null>(null);

  useEffect(() => {
    const savedCredentials = getCookie();
    if (savedCredentials && savedCredentials.email && savedCredentials.password) {
      setCredentials(savedCredentials);
    }
    setAuthChecking(false);
  }, []);

  const loadContacts = useCallback(async () => {
    if (!credentials) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/webmail/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          limit: 500,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.contacts) {
        // Map new API format to EmailContact interface
        const mappedContacts: EmailContact[] = data.contacts.map((c: {
          uid: string;
          displayName?: string;
          firstName?: string;
          lastName?: string;
          emails?: { value: string; label: string }[];
          email?: string;
          name?: string;
          lastContacted?: string;
          contactCount?: number;
          source?: string;
        }) => {
          // Get primary email from emails array or fallback to email string
          const primaryEmail = c.emails?.[0]?.value || c.email || '';
          const displayName = c.displayName || c.name || 
            (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}`.trim() : '') ||
            c.firstName || c.lastName || primaryEmail.split('@')[0] || 'Unbekannt';
          
          return {
            id: c.uid || primaryEmail,
            email: primaryEmail,
            name: displayName,
            lastContacted: c.lastContacted || new Date().toISOString(),
            contactCount: c.contactCount || 0,
            source: (c.source === 'carddav' ? 'both' : c.source) as 'sent' | 'received' | 'both',
            starred: false,
          };
        });
        setContacts(mappedContacts);
      } else {
        toast.error(data.error || 'Fehler beim Laden der Kontakte');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kontakte:', error);
      toast.error('Fehler beim Laden der Kontakte');
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    if (credentials) {
      loadContacts();
    }
  }, [credentials, loadContacts]);

  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    switch (currentView) {
      case 'frequent':
        filtered = filtered.sort((a, b) => b.contactCount - a.contactCount).slice(0, 20);
        break;
      case 'other':
        filtered = filtered.filter(c => !c.name || c.name === c.email);
        break;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        (c.name || '').toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const nameA = a.name || a.email;
      const nameB = b.name || b.email;
      return nameA.localeCompare(nameB, 'de');
    });

    return filtered;
  }, [contacts, currentView, searchTerm]);

  const toggleStar = (contactId: string) => {
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, starred: !c.starred } : c
    ));
  };

  const handleLogout = () => {
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    router.push('/webmail');
  };

  const handleSearch = (query: string) => {
    setSearchTerm(query);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8fc]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!credentials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8fc]">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-normal text-gray-900 mb-2">Anmeldung erforderlich</h2>
          <p className="text-gray-600 mb-4">
            Bitte melden Sie sich zuerst im Webmail an.
          </p>
          <Button
            onClick={() => router.push('/webmail')}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Zum Webmail
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f6f8fc] flex flex-col">
        {/* Header - Taskilo Webmail Style */}
        <MailHeader
          userEmail={credentials.email}
          userInitial={credentials.email.charAt(0).toUpperCase()}
          onMenuToggle={() => setShowMobileMenu(!showMobileMenu)}
          onSearch={handleSearch}
          onLogout={handleLogout}
          searchPlaceholder="Kontakte suchen"
          showAdvancedSearchButton={false}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside className={cn(
            'w-[280px] border-r border-gray-200 flex flex-col bg-white shrink-0',
            showMobileMenu ? 'fixed inset-y-16 left-0 z-50' : 'hidden md:flex'
          )}>
            {/* Create Contact Button */}
            <div className="p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="w-full justify-start gap-3 h-14 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-md shadow-sm rounded-2xl font-medium text-[14px]"
                  >
                    <Plus className="h-6 w-6 text-teal-600" />
                    Kontakt erstellen
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[260px] ml-4">
                  <DropdownMenuItem 
                    className="py-4 px-4 cursor-pointer"
                    onClick={() => setShowCreatePanel(true)}
                  >
                    <UserPlus className="h-6 w-6 mr-4 text-gray-600" />
                    <span className="text-base">Kontakt erstellen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="py-4 px-4 cursor-pointer"
                    onClick={() => setShowMultipleContactsModal(true)}
                  >
                    <UsersRound className="h-6 w-6 mr-4 text-gray-600" />
                    <span className="text-base">Mehrere Kontakte erstellen</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1">
              <nav className="px-3">
                {/* Main Nav */}
                <div className="space-y-0.5">
                  <NavItem
                    icon={Users}
                    label="Kontakte"
                    count={contacts.length}
                    active={currentView === 'contacts'}
                    onClick={() => setCurrentView('contacts')}
                  />
                  <NavItem
                    icon={Clock}
                    label="Haeufig kontaktiert"
                    active={currentView === 'frequent'}
                    onClick={() => setCurrentView('frequent')}
                  />
                  <NavItem
                    icon={Users}
                    label="Weitere Kontakte"
                    hasInfo
                    active={currentView === 'other'}
                    onClick={() => setCurrentView('other')}
                  />
                </div>

                {/* Korrigieren und verwalten */}
                <div className="mt-6 mb-2 px-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Korrigieren und verwalten
                  </span>
                </div>
                <div className="space-y-0.5">
                  <NavItem
                    icon={Merge}
                    label="Zusammenfuehren und korrigieren"
                    count={6}
                    onClick={() => toast.info('Funktion kommt bald')}
                  />
                  <NavItem
                    icon={Upload}
                    label="Importieren"
                    onClick={() => toast.info('Import-Funktion kommt bald')}
                  />
                  <NavItem
                    icon={Trash2}
                    label="Papierkorb"
                    active={currentView === 'trash'}
                    onClick={() => setCurrentView('trash')}
                  />
                </div>

                {/* Labels */}
                <div className="mt-6 mb-2 px-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Labels
                  </span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Plus className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
                <div className="space-y-0.5">
                  {labels.map(label => (
                    <NavItem
                      key={label.id}
                      icon={() => <div className="w-3 h-3 rounded-sm bg-teal-600" />}
                      label={label.name}
                      count={label.count > 0 ? label.count : undefined}
                      onClick={() => toast.info(`Label: ${label.name}`)}
                    />
                  ))}
                </div>
              </nav>
            </ScrollArea>
          </aside>

          {/* Main Content oder Create Panel */}
          {showCreatePanel || editingContact ? (
            <CreateContactPanel
              isOpen={showCreatePanel || !!editingContact}
              onClose={() => {
                setShowCreatePanel(false);
                setEditingContact(null);
              }}
              editMode={!!editingContact}
              contactUid={editingContact?.id}
              initialData={editingContact ? {
                firstName: editingContact.name?.split(' ')[0] || '',
                lastName: editingContact.name?.split(' ').slice(1).join(' ') || '',
                emails: [{ type: 'work', value: editingContact.email }],
                phones: [],
                company: '',
                jobTitle: '',
                notes: '',
                labels: [],
                uid: editingContact.id,
              } : undefined}
              onSave={(formData: ContactFormData) => {
                if (editingContact) {
                  // Update existing contact in list
                  setContacts(prev => prev.map(c => 
                    c.id === editingContact.id 
                      ? {
                          ...c,
                          email: formData.emails[0]?.value || c.email,
                          name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
                        }
                      : c
                  ));
                  toast.success('Kontakt aktualisiert');
                  setEditingContact(null);
                  setSelectedContact(null);
                } else {
                  const newContact: EmailContact = {
                    id: `new-${Date.now()}`,
                    email: formData.emails[0]?.value || '',
                    name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
                    lastContacted: new Date().toISOString(),
                    contactCount: 0,
                    source: 'sent',
                    starred: false,
                  };
                  setContacts(prev => [newContact, ...prev]);
                  toast.success('Kontakt erstellt');
                  setShowCreatePanel(false);
                }
              }}
            />
          ) : (
            <>
              <main className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-14 flex items-center px-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <h1 className="text-[22px] font-normal text-gray-900">
                      Kontakte
                      <span className="text-gray-500 ml-2">({filteredContacts.length})</span>
                    </h1>
                  </div>

                  <div className="ml-auto flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
                          <Printer className="h-5 w-5 text-gray-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Drucken</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
                          <Download className="h-5 w-5 text-gray-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Exportieren</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
                          <MoreVertical className="h-5 w-5 text-gray-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Weitere Aktionen</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Table Header */}
                <div className="h-10 flex items-center px-6 border-b border-gray-100 text-sm text-gray-600">
                  <div className="w-[45%]">Name</div>
                  <div className="flex-1">E-Mail</div>
                </div>

                {/* Contact List */}
                <ScrollArea className="flex-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Users className="h-20 w-20 text-gray-200 mb-4" />
                      <p className="text-gray-500 text-lg">Keine Kontakte gefunden</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Kontakte werden aus Ihren E-Mails extrahiert.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Group Header */}
                      <div className="h-8 flex items-center px-6 bg-gray-50 text-xs font-medium text-gray-600 sticky top-0">
                        Kontakte
                      </div>
                      
                      {/* Contact Rows */}
                      {filteredContacts.map(contact => (
                        <ContactRow
                          key={contact.id}
                          contact={contact}
                          isSelected={selectedContact?.id === contact.id}
                          onSelect={() => setSelectedContact(contact)}
                          onStar={() => toggleStar(contact.id)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </main>

              {/* Detail Panel */}
              <ViewContactPanel
                isOpen={selectedContact !== null}
                contact={selectedContact as ContactData | null}
                onClose={() => setSelectedContact(null)}
                onEdit={(contact) => {
                  // Convert EmailContact to ContactFormData format
                  setEditingContact(contact as unknown as EmailContact);
                  setSelectedContact(null);
                  setShowCreatePanel(true);
                }}
                onDelete={(contact) => toast.info('Löschen: ' + contact.name)}
                onStar={(contact) => toggleStar(contact.id)}
              />
            </>
          )}
        </div>

        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Multiple Contacts Modal */}
        <CreateMultipleContactsModal
          isOpen={showMultipleContactsModal}
          onClose={() => setShowMultipleContactsModal(false)}
          onContactsCreated={() => {
            loadContacts();
            toast.success('Kontakte erstellt');
          }}
        />
      </div>
    </TooltipProvider>
  );
}

// Navigation Item Component
function NavItem({
  icon: Icon,
  label,
  count,
  active,
  hasInfo,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  active?: boolean;
  hasInfo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-3 py-2.5 rounded-full text-[14px] transition-colors',
        active
          ? 'bg-teal-100 text-teal-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {hasInfo && <Info className="h-4 w-4 text-gray-400" />}
      {count !== undefined && (
        <span className={cn(
          'text-sm',
          active ? 'text-teal-700' : 'text-gray-500'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// Contact Row Component
function ContactRow({
  contact,
  isSelected,
  onSelect,
  onStar,
}: {
  contact: EmailContact;
  isSelected: boolean;
  onSelect: () => void;
  onStar: () => void;
}) {
  const displayName = contact.name || contact.email.split('@')[0];

  return (
    <div
      onClick={onSelect}
      className={cn(
        'h-12 flex items-center px-6 cursor-pointer border-b border-gray-50 group',
        isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'
      )}
    >
      {/* Avatar */}
      <Avatar className={cn('h-8 w-8 mr-4', getAvatarColor(displayName))}>
        <AvatarFallback className="text-white text-sm font-normal">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="w-[calc(45%-48px)] truncate text-[14px] text-gray-900">
        {displayName}
      </div>

      {/* Email */}
      <div className="flex-1 truncate text-[14px] text-gray-600">
        {contact.email}
      </div>

      {/* Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStar();
        }}
        className={cn(
          'p-1 rounded-full transition-opacity',
          contact.starred ? 'text-yellow-500' : 'text-gray-300 opacity-0 group-hover:opacity-100'
        )}
      >
        <Star className={cn('h-5 w-5', contact.starred && 'fill-current')} />
      </button>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8fc]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    }>
      <ContactsPageContent />
    </Suspense>
  );
}
