'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  MessageSquare,
  Clock,
  Euro,
  Calendar,
  Eye,
  Filter,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DirectQuoteRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  budgetRange?: string;
  timeline?: string;
  location?: string;
  status: 'pending' | 'responded' | 'accepted' | 'declined';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: { toDate?: () => Date; seconds?: number; nanoseconds?: number } | Date;
  updatedAt?: { toDate?: () => Date; seconds?: number; nanoseconds?: number } | Date;
  companyId: string;
  requirements?: string[];
  attachments?: any[];
}

export default function MarketplaceQuotesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // State
  const [quotes, setQuotes] = useState<DirectQuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Mock data - replace with actual Firebase query
  useEffect(() => {
    const loadQuotes = async () => {
      setLoading(true);
      try {
        // TODO: Implement Firebase query for direct quotes
        // const quotesRef = collection(db, 'quotes');
        // const q = query(quotesRef, where('companyId', '==', uid));
        // const snapshot = await getDocs(q);
        
        // Mock data for now
        const mockQuotes: DirectQuoteRequest[] = [
          {
            id: '1',
            customerName: 'Max Mustermann',
            customerEmail: 'max@example.com',
            customerPhone: '+49 123 456789',
            title: 'Website-Entwicklung für Startup',
            description: 'Wir benötigen eine moderne Website für unser Tech-Startup mit E-Commerce Funktionalität.',
            category: 'Webentwicklung',
            subcategory: 'E-Commerce',
            budgetRange: '5000-10000',
            timeline: '6 Wochen',
            location: 'Berlin',
            status: 'pending',
            urgency: 'medium',
            companyId: uid,
            createdAt: new Date(),
            requirements: ['React', 'TypeScript', 'Stripe Integration'],
          },
          {
            id: '2',
            customerName: 'Anna Schmidt',
            customerEmail: 'anna@firma.de',
            customerPhone: '+49 987 654321',
            title: 'Logo Design für neue Marke',
            description: 'Suche professionelles Logo Design für eine neue Lifestyle-Marke.',
            category: 'Design',
            subcategory: 'Logo Design',
            budgetRange: '500-1500',
            timeline: '2 Wochen',
            location: 'München',
            status: 'responded',
            urgency: 'high',
            companyId: uid,
            createdAt: new Date(),
          },
        ];
        
        setQuotes(mockQuotes);
      } catch (error) {
        console.error('Error loading quotes:', error);
        toast.error('Fehler beim Laden der Anfragen');
      } finally {
        setLoading(false);
      }
    };

    if (uid && user?.uid === uid) {
      loadQuotes();
    }
  }, [uid, user]);

  // Authorization check
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  // Filter quotes
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || quote.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Wartend', variant: 'secondary' as const },
      responded: { label: 'Beantwortet', variant: 'default' as const },
      accepted: { label: 'Angenommen', variant: 'default' as const },
      declined: { label: 'Abgelehnt', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (date: any) => {
    let dateObj: Date;
    if (date?.toDate) {
      dateObj = date.toDate();
    } else if (date?.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else {
      dateObj = new Date(date);
    }
    return dateObj.toLocaleDateString('de-DE');
  };

  // Stats
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    responded: quotes.filter(q => q.status === 'responded').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Anfragen werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Direkte Anfragen</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie direkte Kundenanfragen an Ihr Unternehmen
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gesamt</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Wartend</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Beantwortet</p>
                <p className="text-2xl font-bold text-blue-600">{stats.responded}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Angenommen</p>
                <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Anfragen durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Alle Status</option>
              <option value="pending">Wartend</option>
              <option value="responded">Beantwortet</option>
              <option value="accepted">Angenommen</option>
              <option value="declined">Abgelehnt</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Alle Kategorien</option>
              <option value="Webentwicklung">Webentwicklung</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Consulting">Consulting</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Anfragen gefunden</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Versuchen Sie andere Suchkriterien.'
                  : 'Es sind noch keine direkten Anfragen eingegangen.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{quote.title}</h3>
                      {getUrgencyIcon(quote.urgency)}
                      {getStatusBadge(quote.status)}
                    </div>
                    <p className="text-gray-600 mb-3 line-clamp-2">{quote.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{quote.customerName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{quote.customerEmail}</span>
                      </div>
                      {quote.budgetRange && (
                        <div className="flex items-center gap-1">
                          <Euro className="h-4 w-4" />
                          <span>{quote.budgetRange}€</span>
                        </div>
                      )}
                      {quote.timeline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{quote.timeline}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(quote.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#14ad9f] hover:text-[#129488] hover:bg-[#14ad9f]/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ansehen
                    </Button>
                    
                    {quote.status === 'pending' && (
                      <Button
                        size="sm"
                        className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Antworten
                      </Button>
                    )}
                  </div>
                </div>
                
                {quote.requirements && quote.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {quote.requirements.map((req, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      {filteredQuotes.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          {filteredQuotes.length} von {quotes.length} Anfragen angezeigt
        </div>
      )}
    </div>
  );
}