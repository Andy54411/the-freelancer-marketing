'use client';

// import { Button } from "@/components/ui/button" // Marked as unused
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ModeToggle } from '@/components/mode-toggle'; // Pfad anpassen, falls nötig

interface SiteHeaderProps {
  currentTab: string;
  showSidebarTrigger?: boolean; // Neue Prop hinzugefügt
  translateCurrentTab?: boolean; // Option um currentTab zu übersetzen
}

export function SiteHeader({
  currentTab,
  showSidebarTrigger = true,
  translateCurrentTab = false,
}: SiteHeaderProps) {

  // Übersetze currentTab falls translateCurrentTab true ist
  const displayTab = translateCurrentTab ? currentTab : currentTab;

  // Standardwert ist true, um bestehende Verwendungen nicht zu beeinflussen
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-white dark:bg-gray-800 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {showSidebarTrigger && ( // SidebarTrigger und Separator nur anzeigen, wenn showSidebarTrigger true ist
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          </>
        )}
        <h1 className="text-base font-medium text-gray-900 dark:text-white">{displayTab}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
