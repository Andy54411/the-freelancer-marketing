'use client';

import React, { useState, useEffect } from 'react';
import { UpdateNotification } from '@/types/updates';
import { UpdateService } from '@/services/updateService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Wrench,
  Bug,
  Shield,
  Calendar,
  CheckCircle,
  PlayCircle,
  FileText,
  ArrowLeft,
  Building2,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';

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

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'feature':
      return 'Neue Funktion';
    case 'improvement':
      return 'Verbesserung';
    case 'bugfix':
      return 'Fehlerbehebung';
    case 'security':
      return 'Sicherheit';
    default:
      return 'Update';
  }
};

export default function CompanyUpdatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [allUpdates, setAllUpdates] = useState<UpdateNotification[]>([]);
  const [unseenUpdates, setUnseenUpdates] = useState<UpdateNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uid) {
      loadUpdates();
    }
  }, [uid]);

  const loadUpdates = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const [all, unseen, userStatus] = await Promise.all([
        UpdateService.getAllUpdates(),
        UpdateService.getUnseenUpdates(uid), // Verwende uid direkt für Company
        UpdateService.getUserUpdateStatus(uid),
      ]);

      // Filtere verworfene Updates auch aus der "Alle Updates" Liste
      const filteredAll = all.filter(
        update => !(userStatus.dismissedUpdates || []).includes(update.id)
      );

      setAllUpdates(filteredAll);
      setUnseenUpdates(unseen);
    } catch (error) {
      console.error('Fehler beim Laden der Updates:', error);
      toast.error('Fehler beim Laden der Updates');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSeen = async (updateId: string, version: string) => {
    if (!uid) return;

    try {
      await UpdateService.markUpdateAsSeen(uid, updateId, version);
      await loadUpdates(); // Neu laden
      toast.success('Update als gelesen markiert');
    } catch (error) {
      console.error('Fehler beim Markieren:', error);
      toast.error('Fehler beim Markieren des Updates');
    }
  };

  const handleMarkAllAsSeen = async () => {
    if (!uid) return;

    try {
      await UpdateService.markAllUpdatesAsSeen(uid);
      await loadUpdates();
      toast.success('Alle Updates als gelesen markiert');
    } catch (error) {
      console.error('Fehler beim Markieren aller Updates:', error);
      toast.error('Fehler beim Markieren der Updates');
    }
  };

  const handleDismissUpdate = async (updateId: string, version: string) => {
    if (!uid) return;

    try {
      await UpdateService.dismissUpdate(uid, updateId, version);
      await loadUpdates(); // Neu laden
      toast.success('Update-Benachrichtigung wurde gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen der Update-Benachrichtigung:', error);
      toast.error('Fehler beim Löschen der Update-Benachrichtigung');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
                <div className="h-4 w-4/6 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-[#14ad9f]" />
              Plattform-Updates
            </h1>
            <p className="text-gray-600">Neue Features und Verbesserungen für Ihr Unternehmen</p>
          </div>
        </div>

        {unseenUpdates.length > 0 && (
          <Button
            onClick={handleMarkAllAsSeen}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Alle als gelesen markieren ({unseenUpdates.length})
          </Button>
        )}
      </div>

      {/* Info Banner für Company Dashboard */}
      <Card className="bg-gradient-to-r from-[#14ad9f]/10 to-[#14ad9f]/5 border-[#14ad9f]/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Building2 className="h-6 w-6 text-[#14ad9f] mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Updates für Geschäftskunden</h3>
              <p className="text-sm text-gray-600">
                Diese Updates enthalten neue Features, Verbesserungen und wichtige Informationen
                speziell für Unternehmen auf der Taskilo-Plattform. Bleiben Sie informiert über neue
                Funktionen für Ihr Business Dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Neue Updates ({unseenUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Alle Updates ({allUpdates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          {unseenUpdates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine neuen Updates</h3>
                <p className="text-gray-600 text-center">
                  Sie sind auf dem neuesten Stand! Alle Updates wurden bereits angesehen.
                </p>
              </CardContent>
            </Card>
          ) : (
            unseenUpdates.map(update => (
              <UpdateCard
                key={update.id}
                update={update}
                onMarkAsSeen={handleMarkAsSeen}
                onDismiss={handleDismissUpdate}
                isNew={true}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {allUpdates.map(update => (
            <UpdateCard
              key={update.id}
              update={update}
              onMarkAsSeen={handleMarkAsSeen}
              onDismiss={handleDismissUpdate}
              isNew={unseenUpdates.some(u => u.id === update.id)}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Update Card Component
interface UpdateCardProps {
  update: UpdateNotification;
  onMarkAsSeen: (updateId: string, version: string) => void;
  onDismiss: (updateId: string, version: string) => void;
  isNew: boolean;
}

function UpdateCard({ update, onMarkAsSeen, onDismiss, isNew }: UpdateCardProps) {
  return (
    <Card className={isNew ? 'border-[#14ad9f] border-2' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getCategoryIcon(update.category)}
              <Badge
                variant="secondary"
                className={
                  update.category === 'feature'
                    ? 'bg-green-100 text-green-800'
                    : update.category === 'improvement'
                      ? 'bg-blue-100 text-blue-800'
                      : update.category === 'bugfix'
                        ? 'bg-yellow-100 text-yellow-800'
                        : update.category === 'security'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                }
              >
                {getCategoryLabel(update.category)}
              </Badge>
              {update.isBreaking && (
                <Badge variant="destructive" className="text-xs">
                  Breaking Change
                </Badge>
              )}
              {isNew && <Badge className="bg-[#14ad9f] text-white text-xs">Neu</Badge>}
            </div>
            <CardTitle className="text-xl mb-2">{update.title}</CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(update.releaseDate), {
                  addSuffix: true,
                  locale: de,
                })}
              </span>
              {update.version && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">v{update.version}</span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className="prose prose-sm prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-em:text-gray-600 prose-code:bg-gray-100 prose-code:text-gray-800 prose-blockquote:text-gray-600 prose-blockquote:border-[#14ad9f] mb-4"
          dangerouslySetInnerHTML={{ __html: update.description }}
        />

        {/* Tags */}
        {update.tags && update.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {update.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {update.videoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(update.videoUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Video
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
          </div>

          <div className="flex items-center gap-2">
            {isNew && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkAsSeen(update.id, update.version || '1.0.0')}
                className="flex items-center gap-2 text-[#14ad9f] hover:text-[#129488]"
              >
                <CheckCircle className="h-4 w-4" />
                Als gelesen markieren
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(update.id, update.version || '1.0.0')}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Update-Benachrichtigung löschen"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
