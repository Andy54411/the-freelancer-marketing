'use client';

import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { listAll, getDownloadURL, ref } from 'firebase/storage';
import { db, storage } from '../firebase/clients';
import {
  Camera as IconCamera,
  BarChart as IconChartBar,
  LayoutDashboard as IconDashboard,
  Database as IconDatabase,
  FileJson2 as IconFileAi,
  FileText as IconFileDescription,
  FileText as IconFileWord,
  Folder as IconFolder,
  HelpCircle as IconHelp,
  PanelTop as IconInnerShadowTop,
  History as IconListDetails,
  FileBarChart as IconReport,
  Search as IconSearch,
  Settings as IconSettings,
  Users as IconUsers,
} from 'lucide-react';
import { NavDocuments } from '@/components/nav-documents';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu, // SidebarMenu ist eine Komponente, die den Kontext konsumiert
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider, // Dies ist der tatsächliche Kontext-Provider
} from '@/components/ui/sidebar';
import { RawFirestoreUserData } from './SettingsPage'; // Import the type

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  setView?: (view: 'dashboard' | 'settings') => void;
  activeView?: 'dashboard' | 'settings';
  // children: React.ReactNode; // Diese Prop wird hier nicht mehr benötigt
};

export function AppSidebar({
  setView,
  activeView = 'dashboard',
  ...sidebarProps
}: AppSidebarProps) {
  const [userData, setUserData] = useState<RawFirestoreUserData | null>(null);
  const [profilePictureURL, setProfilePictureURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = async () => {
    const auth = getAuth();
    const userUid = auth.currentUser?.uid;

    if (!userUid) {
      setError('Benutzer ist nicht authentifiziert.');
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', userUid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserData(userDoc.data() as RawFirestoreUserData); // Cast to specific type
      } else {
        setError('Kein Benutzer gefunden.');
      }

      const folderRef = ref(storage, `profilePictures/${userUid}`);
      const list = await listAll(folderRef);
      if (list.items.length > 0) {
        const url = await getDownloadURL(list.items[0]);
        setProfilePictureURL(url);
      } else {
        setProfilePictureURL(null);
      }
    } catch (err) {
      console.error('Fehler beim Abrufen der Daten:', err);
      setError('Fehler beim Abrufen der Daten.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();

    const handleProfilePictureUpdate = () => {
      loadUserData();
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    };
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const firstName = userData?.step1?.firstName || 'Unbekannt';
  const lastName = userData?.step1?.lastName || 'Unbekannt';

  let displayEmail: string;
  const step1Email = userData?.step1?.email; // Type: unknown
  const rootEmail = userData?.email; // Type: string | undefined (due to userData being nullable)

  if (typeof step1Email === 'string' && step1Email.trim() !== '') {
    displayEmail = step1Email;
  } else if (typeof rootEmail === 'string' && rootEmail.trim() !== '') {
    displayEmail = rootEmail;
  } else {
    displayEmail = 'Keine E-Mail verfügbar';
  }

  // Daten fürs Menü mit aktiver Markierung
  const data = {
    user: {
      name: `${firstName} ${lastName}`,
      email: displayEmail,
      avatar: profilePictureURL || undefined,
    },
    navMain: [
      {
        title: 'Dashboard',
        url: '#',
        icon: IconDashboard,
        isActive: activeView === 'dashboard',
        onClick: () => setView?.('dashboard'),
      },
      {
        title: 'Lifecycle',
        url: '#',
        icon: IconListDetails,
        isActive: false,
      },
      {
        title: 'Analytics',
        url: '#',
        icon: IconChartBar,
        isActive: false,
      },
      {
        title: 'Projects',
        url: '#',
        icon: IconFolder,
        isActive: false,
      },
      {
        title: 'Team',
        url: '#',
        icon: IconUsers,
        isActive: false,
      },
    ],
    navClouds: [
      {
        title: 'Capture',
        icon: IconCamera,
        isActive: true,
        url: '#',
        items: [
          { title: 'Active Proposals', url: '#' },
          { title: 'Archived', url: '#' },
        ],
      },
      {
        title: 'Proposal',
        icon: IconFileDescription,
        url: '#',
        items: [
          { title: 'Active Proposals', url: '#' },
          { title: 'Archived', url: '#' },
        ],
      },
      {
        title: 'Prompts',
        icon: IconFileAi,
        url: '#',
        items: [
          { title: 'Active Proposals', url: '#' },
          { title: 'Archived', url: '#' },
        ],
      },
    ],
    navSecondary: [
      {
        title: 'Einstellung',
        url: '#',
        icon: IconSettings,
        onClick: () => setView?.('settings'),
      },
      { title: 'Get Help', url: '#', icon: IconHelp },
      { title: 'Search', url: '#', icon: IconSearch },
    ],
    documents: [
      { name: 'Data Library', url: '#', icon: IconDatabase },
      { name: 'Reports', url: '#', icon: IconReport },
      { name: 'Word Assistant', url: '#', icon: IconFileWord },
    ],
  };

  return (
    <Sidebar collapsible="offcanvas" {...sidebarProps}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Taskilo.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} onAccountClick={() => setView?.('settings')} />
      </SidebarFooter>
    </Sidebar>
  );
}
