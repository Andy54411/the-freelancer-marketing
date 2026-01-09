'use client';

// 🎯 KEYWORD MANAGER - Component
// Keyword-Recherche und -Optimierung

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';

interface KeywordManagerProps {
  companyId: string;
}

export default function KeywordManager({ companyId: _companyId }: KeywordManagerProps) {
  const [keywords, setKeywords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      // Mock keywords
      setKeywords([
        {
          id: '1',
          keyword: 'Taskilo Software',
          volume: 1200,
          competition: 'mittel',
          cpc: '€2.50',
          trend: 'up'
        },
        {
          id: '2',
          keyword: 'Business Management',
          volume: 8900,
          competition: 'hoch',
          cpc: '€4.20',
          trend: 'stable'
        }
      ] as any);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Keyword Research</h2>
        <Button className="bg-[#14ad9f] hover:bg-[#0f8a7e] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Keyword hinzufügen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Keyword-Suche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Input 
              placeholder="Nach Keywords suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Search className="w-4 h-4 mr-2" />
              Suchen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ihre Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {keywords.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Noch keine Keywords hinzugefügt</p>
              </div>
            ) : (
              keywords.map((keyword: any) => (
                <div key={keyword.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-medium">{keyword.keyword}</h3>
                      <p className="text-sm text-gray-500">Suchvolumen: {keyword.volume}</p>
                    </div>
                    {keyword.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
                    {keyword.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{keyword.cpc}</p>
                      <p className="text-xs text-gray-500">CPC</p>
                    </div>
                    <Badge variant={keyword.competition === 'hoch' ? 'destructive' : 'default'}>
                      {keyword.competition}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}