'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  Star,
  Crown,
  User,
  TrendingUp,
  CheckCircle,
  Users,
  Euro,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Info,
  Zap,
  Gift,
  Shield,
  Megaphone,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TaskiloLevelService, 
  type TaskiloLevel, 
  type TaskerLevelStatus,
  LEVEL_DETAILS,
  LEVEL_CONFIG,
  LEVEL_BENEFITS,
} from '@/services/TaskiloLevelService';
import { TaskiloLevelBadge } from '@/components/level/TaskiloLevelBadge';

export default function TaskerLevelPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.uid as string;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [levelStatus, setLevelStatus] = useState<TaskerLevelStatus | null>(null);
  
  // Level-Icons
  const levelIcons: Record<TaskiloLevel, React.ElementType> = {
    new: User,
    level1: Award,
    level2: Star,
    top_rated: Crown,
  };
  
  // Lade Level-Status
  const loadLevelStatus = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const status = await TaskiloLevelService.getTaskerLevelStatus(companyId);
      setLevelStatus(status);
    } catch {
      toast.error('Fehler beim Laden des Level-Status');
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  
  useEffect(() => {
    loadLevelStatus();
  }, [loadLevelStatus]);
  
  // Level aktualisieren
  const refreshLevel = async () => {
    if (!companyId) return;
    
    setRefreshing(true);
    try {
      const status = await TaskiloLevelService.updateTaskerLevel(companyId);
      setLevelStatus(status);
      toast.success('Level-Status aktualisiert');
    } catch {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setRefreshing(false);
    }
  };
  
  // Formatiere Währung
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Formatiere Prozent
  const formatPercent = (value: number) => {
    return `${Math.round(value)}%`;
  };
  
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  
  if (!levelStatus) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Level-Status konnte nicht geladen werden.
        </div>
      </div>
    );
  }
  
  const { currentLevel, metrics, nextLevel, progress, atRisk, gracePeriodEnd } = levelStatus;
  const details = LEVEL_DETAILS[currentLevel];
  const benefits = LEVEL_BENEFITS[currentLevel];
  const LevelIcon = levelIcons[currentLevel];
  
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasker Level</h1>
            <p className="text-gray-600 mt-1">
              Verfolge deinen Fortschritt und schalte neue Vorteile frei
            </p>
          </div>
        </div>
        <button
          onClick={refreshLevel}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>
      
      {/* Risiko-Warnung */}
      {atRisk && gracePeriodEnd && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Level-Abstieg droht</h4>
            <p className="text-sm text-amber-700 mt-1">
              Einige deiner Metriken liegen unter den Anforderungen für {details.name}. 
              Du hast bis zum {gracePeriodEnd.toLocaleDateString('de-DE')} Zeit, dich zu verbessern.
            </p>
          </div>
        </div>
      )}
      
      {/* Aktuelles Level Card */}
      <div className={`rounded-2xl p-6 ${details.bgColor} border-2 ${details.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl bg-white/50 ${details.color}`}>
              <LevelIcon className="w-10 h-10" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Dein aktuelles Level</p>
              <h2 className={`text-3xl font-bold ${details.color}`}>{details.name}</h2>
              <p className="text-sm text-gray-700 mt-1">{details.description}</p>
            </div>
          </div>
          <TaskiloLevelBadge level={currentLevel} size="lg" />
        </div>
      </div>
      
      {/* Info-Box wenn keine Daten vorhanden */}
      {metrics.completedOrders === 0 && metrics.rating === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Noch keine Daten verfügbar</h4>
            <p className="text-sm text-blue-700 mt-1">
              Deine Metriken werden berechnet, sobald du Aufträge abschließt und Bewertungen erhältst. 
              Starte jetzt, indem du dein Profil vervollständigst und auf Kundenanfragen antwortest.
            </p>
          </div>
        </div>
      )}
      
      {/* Metriken-Übersicht */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Success Score */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-xs">Success Score</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.successScore.toFixed(1)}</p>
          <p className="text-xs text-gray-500">von 10</p>
        </div>
        
        {/* Rating */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Star className="w-4 h-4" />
            <span className="text-xs">Bewertung</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.rating.toFixed(1)}</p>
          <p className="text-xs text-gray-500">{metrics.ratingCount} Bewertungen</p>
        </div>
        
        {/* Response Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs">Antwortrate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPercent(metrics.responseRate)}</p>
          <p className="text-xs text-gray-500">innerhalb 24h</p>
        </div>
        
        {/* Aufträge */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Aufträge</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.completedOrders}</p>
          <p className="text-xs text-gray-500">abgeschlossen</p>
        </div>
        
        {/* Unique Clients */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs">Kunden</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.uniqueClients}</p>
          <p className="text-xs text-gray-500">verschiedene</p>
        </div>
        
        {/* Einnahmen */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Euro className="w-4 h-4" />
            <span className="text-xs">Einnahmen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalEarnings)}</p>
          <p className="text-xs text-gray-500">gesamt</p>
        </div>
      </div>
      
      {/* Fortschritt zum nächsten Level */}
      {nextLevel && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-teal-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Fortschritt zu {LEVEL_DETAILS[nextLevel].name}
              </h3>
              <p className="text-sm text-gray-600">
                Erfülle alle Anforderungen um aufzusteigen
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(progress).map(([key, data]) => {
              const labels: Record<string, { label: string; icon: React.ElementType }> = {
                successScore: { label: 'Success Score', icon: ThumbsUp },
                rating: { label: 'Bewertung', icon: Star },
                responseRate: { label: 'Antwortrate', icon: MessageSquare },
                completedOrders: { label: 'Aufträge', icon: CheckCircle },
                uniqueClients: { label: 'Kunden', icon: Users },
                totalEarnings: { label: 'Einnahmen', icon: Euro },
              };
              
              const config = labels[key];
              if (!config) return null;
              
              const Icon = config.icon;
              const displayValue = key === 'totalEarnings' 
                ? formatCurrency(data.current)
                : key === 'responseRate'
                ? formatPercent(data.current)
                : data.current.toFixed(key === 'successScore' || key === 'rating' ? 1 : 0);
              const displayRequired = key === 'totalEarnings'
                ? formatCurrency(data.required)
                : key === 'responseRate'
                ? formatPercent(data.required)
                : data.required;
              
              return (
                <div 
                  key={key}
                  className={`p-4 rounded-lg border ${
                    data.met 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${data.met ? 'text-green-600' : 'text-gray-500'}`} />
                      <span className="text-sm font-medium text-gray-700">{config.label}</span>
                    </div>
                    {data.met && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold ${data.met ? 'text-green-700' : 'text-gray-900'}`}>
                      {displayValue}
                    </span>
                    <span className="text-sm text-gray-500">/ {displayRequired}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        data.met ? 'bg-green-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, (data.current / data.required) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {LEVEL_CONFIG[nextLevel].manualReview && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Manuelle Prüfung erforderlich</p>
                <p className="text-sm text-blue-700 mt-1">
                  Um Top Rated zu werden, musst du alle Anforderungen erfüllen und eine manuelle Prüfung durch unser Team bestehen.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Level Benefits */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Gift className="w-6 h-6 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">Deine Vorteile</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${benefits.canAdvertise ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className={`w-5 h-5 ${benefits.canAdvertise ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="font-medium text-gray-900">Taskilo Ads</span>
            </div>
            <p className="text-sm text-gray-600">
              {benefits.canAdvertise ? 'Werbeanzeigen schalten' : 'Ab Level 1 verfügbar'}
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${benefits.prioritySupport ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`w-5 h-5 ${benefits.prioritySupport ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="font-medium text-gray-900">Priority Support</span>
            </div>
            <p className="text-sm text-gray-600">
              {benefits.prioritySupport ? 'Bevorzugter Support' : 'Ab Top Rated verfügbar'}
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${benefits.fasterPayouts ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className={`w-5 h-5 ${benefits.fasterPayouts ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="font-medium text-gray-900">Schnellere Auszahlung</span>
            </div>
            <p className="text-sm text-gray-600">
              {benefits.fasterPayouts ? 'Sofortige Auszahlung' : 'Ab Top Rated verfügbar'}
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${benefits.paidConsultations ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className={`w-5 h-5 ${benefits.paidConsultations ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="font-medium text-gray-900">Bezahlte Beratungen</span>
            </div>
            <p className="text-sm text-gray-600">
              {benefits.paidConsultations ? 'Beratungsgespräche verkaufen' : 'Ab Level 2 verfügbar'}
            </p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-teal-600" />
              <span className="font-medium text-gray-900">Maximale Gigs</span>
            </div>
            <span className="text-lg font-bold text-teal-600">{benefits.maxGigs}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Du kannst bis zu {benefits.maxGigs} verschiedene Dienstleistungen anbieten.
          </p>
        </div>
        
        <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              <span className="font-medium text-teal-900">Such-Boost</span>
            </div>
            <span className="text-lg font-bold text-teal-600">+{((benefits.searchBoost - 1) * 100).toFixed(0)}%</span>
          </div>
          <p className="text-sm text-teal-700 mt-1">
            Dein Profil wird in den Suchergebnissen bevorzugt angezeigt.
          </p>
        </div>
      </div>
      
      {/* Level-Übersicht */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Alle Level im Überblick</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['new', 'level1', 'level2', 'top_rated'] as TaskiloLevel[]).map((level) => {
            const levelDetails = LEVEL_DETAILS[level];
            const levelReq = LEVEL_CONFIG[level];
            const LevelIconComp = levelIcons[level];
            const isCurrentLevel = level === currentLevel;
            
            return (
              <div 
                key={level}
                className={`p-4 rounded-xl border-2 ${
                  isCurrentLevel 
                    ? `${levelDetails.borderColor} ${levelDetails.bgColor}` 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${isCurrentLevel ? 'bg-white/50' : 'bg-white'} ${levelDetails.color}`}>
                    <LevelIconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`font-semibold ${isCurrentLevel ? levelDetails.color : 'text-gray-700'}`}>
                      {levelDetails.nameShort}
                    </p>
                    {isCurrentLevel && (
                      <span className="text-xs text-gray-600">Aktuell</span>
                    )}
                  </div>
                </div>
                
                {level !== 'new' && (
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Score</span>
                      <span className="font-medium">{levelReq.successScore}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rating</span>
                      <span className="font-medium">{levelReq.rating}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Antwortrate</span>
                      <span className="font-medium">{levelReq.responseRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aufträge</span>
                      <span className="font-medium">{levelReq.completedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kunden</span>
                      <span className="font-medium">{levelReq.uniqueClients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Einnahmen</span>
                      <span className="font-medium">{formatCurrency(levelReq.totalEarnings)}</span>
                    </div>
                  </div>
                )}
                
                {level === 'new' && (
                  <p className="text-xs text-gray-600">Startlevel für alle neuen Tasker</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Success Score Komponenten */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <ThumbsUp className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Success Score Details</h3>
            <p className="text-sm text-gray-600">Wie sich dein Score zusammensetzt</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { key: 'clientSatisfaction', label: 'Kundenzufriedenheit', weight: '25%', value: metrics.clientSatisfaction },
            { key: 'effectiveCommunication', label: 'Kommunikation', weight: '15%', value: metrics.effectiveCommunication },
            { key: 'conflictFreeOrders', label: 'Konfliktfreie Aufträge', weight: '15%', value: metrics.conflictFreeOrders },
            { key: 'orderCancellations', label: 'Wenig Stornierungen', weight: '20%', value: metrics.orderCancellations },
            { key: 'deliveryTime', label: 'Pünktliche Lieferung', weight: '15%', value: metrics.deliveryTime },
            { key: 'valueForMoney', label: 'Preis-Leistung', weight: '10%', value: metrics.valueForMoney },
          ].map((item) => (
            <div key={item.key} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <span className="text-xs text-gray-500">{item.weight}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-900">{item.value.toFixed(1)}</span>
                <span className="text-sm text-gray-500">/ 10</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    item.value >= 8 ? 'bg-green-500' : 
                    item.value >= 6 ? 'bg-teal-500' : 
                    item.value >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${item.value * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
