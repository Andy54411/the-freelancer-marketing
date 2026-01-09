'use client';

import React, { useState, useEffect } from 'react';
import { UpdateService } from '@/services/updateService';
import { UpdateNotification } from '@/types/updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sparkles, 
  Wrench, 
  Bug, 
  Shield, 
  Calendar, 
  Search,
  PlayCircle,
  FileText,
  User,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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

interface ChangelogPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function ChangelogPage({ params }: ChangelogPageProps) {
  React.use(params);
  const [updates, setUpdates] = useState<UpdateNotification[]>([]);
  const [filteredUpdates, setFilteredUpdates] = useState<UpdateNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Updates laden
  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const allUpdates = await UpdateService.getAllUpdates();
      setUpdates(allUpdates);
      setFilteredUpdates(allUpdates);
    } catch (error) {
      console.error('Fehler beim Laden der Updates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter und Suche
  useEffect(() => {
    let filtered = updates;

    // Kategorie-Filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(update => update.category === categoryFilter);
    }

    // Such-Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(update =>
        update.title.toLowerCase().includes(term) ||
        update.description.toLowerCase().includes(term) ||
        update.version.toLowerCase().includes(term) ||
        update.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredUpdates(filtered);
  }, [updates, categoryFilter, searchTerm]);

  // Statistiken berechnen
  const stats = {
    total: updates.length,
    features: updates.filter(u => u.category === 'feature').length,
    improvements: updates.filter(u => u.category === 'improvement').length,
    bugfixes: updates.filter(u => u.category === 'bugfix').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-[#14ad9f]" />
            Taskilo Changelog
          </h1>
          <p className="text-gray-600 text-lg">
            Entdecken Sie alle neuen Funktionen, Verbesserungen und Bugfixes
          </p>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gesamt</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Features</p>
                  <p className="text-2xl font-bold">{stats.features}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Verbes.</p>
                  <p className="text-2xl font-bold">{stats.improvements}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Bug className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bugfixes</p>
                  <p className="text-2xl font-bold">{stats.bugfixes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter und Suche */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Nach Updates suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  <SelectItem value="feature">Neue Funktionen</SelectItem>
                  <SelectItem value="improvement">Verbesserungen</SelectItem>
                  <SelectItem value="bugfix">Bugfixes</SelectItem>
                  <SelectItem value="security">Sicherheit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Updates Liste */}
        <div className="space-y-6">
          {filteredUpdates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Updates gefunden
                </h3>
                <p className="text-gray-600">
                  Versuchen Sie einen anderen Suchbegriff oder Filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUpdates.map((update) => (
              <Card key={update.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${getCategoryColor(update.category)}`}>
                        {getCategoryIcon(update.category)}
                      </div>
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2 mb-2">
                          {update.title}
                          {update.isBreaking && (
                            <Badge variant="destructive" className="text-xs">
                              Breaking Change
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-4">
                          <Badge 
                            variant="secondary" 
                            className={getCategoryColor(update.category)}
                          >
                            {getCategoryLabel(update.category)}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            Version {update.version}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-3 w-3" />
                            {format(new Date(update.releaseDate), 'dd.MM.yyyy', { locale: de })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-gray-700 leading-relaxed text-base mb-4">
                    {update.description}
                  </CardDescription>

                  {/* Tags */}
                  {update.tags && update.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {update.tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="text-xs bg-gray-50"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Screenshots */}
                  {update.screenshots && update.screenshots.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {update.screenshots.map((screenshot, index) => (
                          <img
                            key={index}
                            src={screenshot}
                            alt={`Screenshot ${index + 1}`}
                            className="rounded border cursor-pointer hover:opacity-80 transition-opacity aspect-video object-cover"
                            onClick={() => window.open(screenshot, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
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
                          Doku
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="h-3 w-3" />
                      {update.createdBy}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}