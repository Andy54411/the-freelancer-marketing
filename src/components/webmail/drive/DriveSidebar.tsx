'use client';

import { cn } from '@/lib/utils';
import {
  HardDrive,
  Monitor,
  Users,
  Clock,
  Star,
  Trash2,
  Cloud,
  Plus,
  ChevronDown,
  Upload,
  FolderPlus,
  FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

export type DriveSection = 'my-drive' | 'computers' | 'shared' | 'recent' | 'starred' | 'trash';

interface DriveSidebarProps {
  currentSection: DriveSection;
  onSectionChange: (section: DriveSection) => void;
  onNewFolder: () => void;
  onUploadFile: () => void;
  collapsed?: boolean;
  storageUsed?: number;
  storageTotal?: number;
}

const DRIVE_SECTIONS = [
  { id: 'my-drive' as DriveSection, name: 'Meine Ablage', icon: HardDrive },
  { id: 'computers' as DriveSection, name: 'Computer', icon: Monitor },
  { id: 'shared' as DriveSection, name: 'Für mich freigegeben', icon: Users },
  { id: 'recent' as DriveSection, name: 'Zuletzt verwendet', icon: Clock },
  { id: 'starred' as DriveSection, name: 'Markiert', icon: Star },
  { id: 'trash' as DriveSection, name: 'Papierkorb', icon: Trash2 },
] as const;

export function DriveSidebar({
  currentSection,
  onSectionChange,
  onNewFolder,
  onUploadFile,
  collapsed = false,
  storageUsed = 0,
  storageTotal = 15 * 1024 * 1024 * 1024, // 15 GB default
}: DriveSidebarProps) {
  const { isDark } = useWebmailTheme();
  
  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const storagePercentage = (storageUsed / storageTotal) * 100;

  if (collapsed) {
    return (
      <aside className={cn("w-20 flex flex-col border-r shrink-0", isDark ? "bg-[#202124] border-[#5f6368]" : "bg-white border-gray-200")}>
        {/* Collapsed New Button */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn("w-14 h-14 rounded-2xl shadow-md border p-0", isDark ? "bg-[#2d2e30] hover:bg-[#3c4043] border-[#5f6368]" : "bg-white hover:bg-gray-50 border-gray-200")}
              >
                <Plus className={cn("h-6 w-6", isDark ? "text-white" : "text-gray-700")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className={cn("w-56", isDark && "bg-[#2d2e30] border-[#5f6368]")}>
              <DropdownMenuItem onClick={onNewFolder} className={cn("gap-3 py-2", isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
                <FolderPlus className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
                <span>Neuer Ordner</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={cn(isDark && "bg-[#5f6368]")} />
              <DropdownMenuItem onClick={onUploadFile} className={cn("gap-3 py-2", isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
                <FileUp className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
                <span>Datei hochladen</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNewFolder} className={cn("gap-3 py-2", isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
                <Upload className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
                <span>Ordner hochladen</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapsed Navigation */}
        <nav className="flex-1 py-2">
          {DRIVE_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'w-full flex items-center justify-center py-3 transition-colors',
                  isActive
                    ? isDark ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-50 text-teal-700'
                    : isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                )}
                title={section.name}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </nav>

        {/* Collapsed Storage */}
        <div className={cn("p-3 border-t", isDark ? "border-[#5f6368]" : "border-gray-200")}>
          <button
            className={cn(
              "w-full flex items-center justify-center py-2 rounded-lg",
              isDark ? "text-white hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
            )}
            title={`${formatStorage(storageUsed)} von ${formatStorage(storageTotal)} verwendet`}
          >
            <Cloud className="h-5 w-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn("w-64 flex flex-col shrink-0", isDark ? "bg-[#202124]" : "bg-white")}>
      {/* New Button */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn(
                "w-32 h-14 rounded-2xl shadow-md gap-2 px-4",
                isDark 
                  ? "bg-[#2d2e30] hover:bg-[#3c4043] border-[#5f6368]" 
                  : "bg-white hover:bg-gray-50 border-gray-200",
                "border"
              )}
            >
              <Plus className={cn("h-6 w-6", isDark ? "text-white" : "text-gray-700")} />
              <span className={cn("text-base font-medium", isDark ? "text-white" : "text-gray-700")}>Neu</span>
              <ChevronDown className={cn("h-4 w-4 ml-auto", isDark ? "text-white" : "text-gray-500")} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={cn("w-64", isDark && "bg-[#2d2e30] border-[#5f6368]")}>
            <DropdownMenuItem onClick={onNewFolder} className={cn("gap-3 py-3", isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
              <FolderPlus className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
              <span className="text-sm">Neuer Ordner</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className={cn(isDark && "bg-[#5f6368]")} />
            <DropdownMenuItem onClick={onUploadFile} className={cn("gap-3 py-3", isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
              <FileUp className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
              <span className="text-sm">Datei hochladen</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewFolder} className={cn("gap-3 py-3", isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
              <Upload className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
              <span className="text-sm">Ordner hochladen</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {DRIVE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = currentSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                'w-full flex items-center gap-3 px-6 py-2.5 text-sm transition-colors rounded-r-full mr-4',
                isActive
                  ? isDark ? 'bg-teal-900/30 text-teal-400 font-medium' : 'bg-teal-100 text-teal-800 font-medium'
                  : isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? (isDark ? 'text-teal-400' : 'text-teal-700') : (isDark ? 'text-white' : 'text-gray-600'))} />
              <span>{section.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Storage Info */}
      <div className={cn("p-4 border-t", isDark ? "border-[#5f6368]" : "border-gray-200")}>
        <button className={cn(
          "w-full flex items-center gap-3 px-2 py-2 text-sm rounded-lg",
          isDark ? "text-white hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
        )}>
          <Cloud className="h-5 w-5" />
          <span>Speicherplatz kaufen</span>
        </button>
        <div className="mt-3 px-2">
          <div className={cn("w-full h-1 rounded-full overflow-hidden", isDark ? "bg-[#3c4043]" : "bg-gray-200")}>
            <div 
              className="h-full bg-teal-500 transition-all"
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
          <p className={cn("text-xs mt-1.5", isDark ? "text-gray-500" : "text-gray-500")}>
            {formatStorage(storageUsed)} von {formatStorage(storageTotal)} verwendet
          </p>
        </div>
      </div>
    </aside>
  );
}
