'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UpdateNotification } from '@/types/updates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Wrench,
  Bug,
  Shield,
  Calendar,
  PlayCircle,
  FileText,
  CheckCircle,
  X,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  updates: UpdateNotification[];
  onMarkAsSeen: (updateId: string, version: string) => void;
  onMarkAllAsSeen: () => void;
  onDismissUpdate?: (updateId: string, version: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'feature':
      return <Sparkles className="h-4 w-4" />;
    case 'improvement':
      return <Wrench className="h-4 w-4" />;
    case 'bugfix':
      return <Bug className="h-4 w-4" />;
    case 'security':
      return <Shield className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'feature':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'improvement':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'bugfix':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
    case 'security':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'feature':
      return 'Neue Funktion';
    case 'improvement':
      return 'Verbesserung';
    case 'bugfix':
      return 'Bugfix';
    case 'security':
      return 'Sicherheit';
    default:
      return category;
  }
};

export default function UpdateNotificationModal({
  isOpen,
  onClose,
  updates,
  onMarkAsSeen,
  onMarkAllAsSeen,
  onDismissUpdate,
}: UpdateNotificationModalProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleViewAllUpdates = () => {
    // Schließe das Modal
    onClose();

    // Bestimme die richtige Updates-Seite basierend auf dem aktuellen Dashboard
    let updatesPath = '/dashboard/admin/updates'; // Default fallback

    if (pathname?.includes('/dashboard/user/')) {
      // User Dashboard - navigiere zu allgemeiner Updates-Seite oder bleibe im User-Kontext
      const uid = pathname.split('/dashboard/user/')[1]?.split('/')[0];
      updatesPath = uid ? `/dashboard/user/${uid}/updates` : '/updates';
    } else if (pathname?.includes('/dashboard/company/')) {
      // Company Dashboard - navigiere zu allgemeiner Updates-Seite oder bleibe im Company-Kontext
      const uid = pathname.split('/dashboard/company/')[1]?.split('/')[0];
      updatesPath = uid ? `/dashboard/company/${uid}/updates` : '/updates';
    } else if (pathname?.includes('/dashboard/admin')) {
      // Admin Dashboard - navigiere zur Admin Updates-Seite
      updatesPath = '/dashboard/admin/updates';
    } else {
      // Fallback für andere Pfade
      updatesPath = '/updates';
    }

    router.push(updatesPath);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#14ad9f]" />
                Neue Updates verfügbar
              </DialogTitle>
              <DialogDescription>
                Entdecken Sie die neuesten Funktionen und Verbesserungen in Taskilo
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-[#14ad9f]/10 text-[#14ad9f]">
                {updates.length} Updates
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewAllUpdates}
                className="flex items-center gap-2 text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                <Settings className="h-4 w-4" />
                Updates verwalten
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAllAsSeen}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Alle als gelesen markieren
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {updates.map(update => (
              <Card key={update.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(update.category)}`}>
                        {getCategoryIcon(update.category)}
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {update.title}
                          {update.isBreaking && (
                            <Badge variant="destructive" className="text-xs">
                              Breaking Change
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="secondary" className={getCategoryColor(update.category)}>
                            {getCategoryLabel(update.category)}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />v{update.version} •{' '}
                            {formatDistanceToNow(new Date(update.releaseDate), {
                              addSuffix: true,
                              locale: de,
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsSeen(update.id, update.version)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div
                    className="prose prose-sm prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-em:text-gray-600 prose-code:bg-gray-100 prose-code:text-gray-800 prose-blockquote:text-gray-600 prose-blockquote:border-[#14ad9f]"
                    dangerouslySetInnerHTML={{ __html: update.description }}
                  />

                  {/* Tags */}
                  {update.tags && update.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {update.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-gray-50">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    {update.videoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(update.videoUrl, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Video ansehen
                      </Button>
                    )}

                    {update.documentationUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(update.documentationUrl, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Dokumentation
                      </Button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      {onDismissUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDismissUpdate(update.id, update.version)}
                          className="flex items-center gap-2 text-gray-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                          Verwerfen
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkAsSeen(update.id, update.version)}
                        className="flex items-center gap-2 text-[#14ad9f] hover:text-taskilo-hover"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Als gelesen markieren
                      </Button>
                    </div>
                  </div>

                  {/* Screenshots */}
                  {update.screenshots && update.screenshots.length > 0 && (
                    <div className="mt-4">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {update.screenshots.map((screenshot, index) => (
                          <img
                            key={index}
                            src={screenshot}
                            alt={`Screenshot ${index + 1}`}
                            className="h-20 w-auto rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(screenshot, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
