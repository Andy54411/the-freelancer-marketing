/**
 * Cache Statistics Utilities
 * Helper functions für Performance Monitoring
 */

export interface CacheStatistics {
  totalCachedEmails: number;
  totalCacheSize: string;
  folders: Record<string, number>;
  oldestCachedEmail: string | null;
  newestCachedEmail: string | null;
  avgEmailSize: number;
  cacheEfficiency: number;
  lastUpdated: string;
}

/**
 * Formatiert Bytes in human readable Format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Berechnet Cache Efficiency basierend auf Hit/Miss Ratio
 */
export function calculateCacheEfficiency(hits: number, misses: number): number {
  const total = hits + misses;
  if (total === 0) return 0;
  
  return Math.round((hits / total) * 100);
}

/**
 * Formatiert Zeitdifferenz in human readable Format
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  if (hours > 0) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
  if (minutes > 0) return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
  return `vor ${seconds} Sekunde${seconds > 1 ? 'n' : ''}`;
}

/**
 * Berechnet Performance Score basierend auf verschiedenen Metriken
 */
export function calculatePerformanceScore(metrics: {
  avgLoadTime: number;
  cacheHitRatio: number;
  totalEmails: number;
  errorRate?: number;
}): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  description: string;
} {
  let score = 100;
  
  // Ladezeit Bewertung (50% Gewichtung)
  if (metrics.avgLoadTime > 2000) score -= 30;
  else if (metrics.avgLoadTime > 1000) score -= 20;
  else if (metrics.avgLoadTime > 500) score -= 10;
  else if (metrics.avgLoadTime > 200) score -= 5;
  
  // Cache Hit Ratio (30% Gewichtung)
  if (metrics.cacheHitRatio < 0.5) score -= 25;
  else if (metrics.cacheHitRatio < 0.7) score -= 15;
  else if (metrics.cacheHitRatio < 0.8) score -= 10;
  else if (metrics.cacheHitRatio < 0.9) score -= 5;
  
  // Error Rate (20% Gewichtung)
  const errorRate = metrics.errorRate || 0;
  if (errorRate > 0.1) score -= 15;
  else if (errorRate > 0.05) score -= 10;
  else if (errorRate > 0.02) score -= 5;
  
  // Grade berechnen
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let description: string;
  
  if (score >= 90) {
    grade = 'A';
    description = 'Excellent Performance';
  } else if (score >= 80) {
    grade = 'B';
    description = 'Good Performance';
  } else if (score >= 70) {
    grade = 'C';
    description = 'Average Performance';
  } else if (score >= 60) {
    grade = 'D';
    description = 'Poor Performance';
  } else {
    grade = 'F';
    description = 'Critical Performance Issues';
  }
  
  return { score: Math.max(0, score), grade, description };
}

/**
 * Generiert Performance Empfehlungen
 */
export function generatePerformanceRecommendations(metrics: {
  avgLoadTime: number;
  cacheHitRatio: number;
  totalEmails: number;
  errorRate?: number;
}): Array<{
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
}> {
  const recommendations: Array<{
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    action?: string;
  }> = [];
  
  // Ladezeit Empfehlungen
  if (metrics.avgLoadTime > 1000) {
    recommendations.push({
      type: 'critical' as const,
      title: 'Hohe Ladezeiten',
      description: 'E-Mails laden zu langsam. Dies beeinträchtigt die Benutzererfahrung.',
      action: 'Cache-Konfiguration überprüfen und API-Calls optimieren'
    });
  } else if (metrics.avgLoadTime > 500) {
    recommendations.push({
      type: 'warning' as const,
      title: 'Moderate Ladezeiten',
      description: 'Ladezeiten könnten verbessert werden.',
      action: 'Delta-Sync aktivieren und Cache-Größe erhöhen'
    });
  }
  
  // Cache Hit Ratio Empfehlungen
  if (metrics.cacheHitRatio < 0.7) {
    recommendations.push({
      type: 'critical' as const,
      title: 'Niedrige Cache-Effizienz',
      description: 'Zu viele API-Calls, Cache wird nicht optimal genutzt.',
      action: 'Cache-Strategie überarbeiten und Auto-Refresh-Intervall anpassen'
    });
  } else if (metrics.cacheHitRatio < 0.9) {
    recommendations.push({
      type: 'warning' as const,
      title: 'Cache-Optimierung möglich',
      description: 'Cache-Hit-Rate kann noch verbessert werden.',
      action: 'Cache-TTL verlängern und Prefetching aktivieren'
    });
  }
  
  // Error Rate Empfehlungen
  const errorRate = metrics.errorRate || 0;
  if (errorRate > 0.05) {
    recommendations.push({
      type: 'critical' as const,
      title: 'Hohe Fehlerrate',
      description: 'Viele Requests schlagen fehl.',
      action: 'OAuth-Token prüfen und Retry-Mechanismus implementieren'
    });
  }
  
  // Positive Empfehlungen
  if (metrics.cacheHitRatio > 0.9 && metrics.avgLoadTime < 300) {
    recommendations.push({
      type: 'info' as const,
      title: 'Optimale Performance',
      description: 'Das System läuft mit optimaler Performance.',
      action: 'Aktuelle Konfiguration beibehalten'
    });
  }
  
  return recommendations;
}

/**
 * Exportiert Performance Daten als CSV
 */
export function exportPerformanceData(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

/**
 * Erstellt Performance Trending Data
 */
export function createTrendingData(
  history: Array<{ timestamp: Date; [key: string]: any }>,
  metric: string,
  intervalMinutes: number = 60
): Array<{ time: string; value: number; change?: number }> {
  if (history.length === 0) return [];
  
  // Group by time intervals
  const intervals = new Map<string, number[]>();
  
  history.forEach(entry => {
    const timestamp = new Date(entry.timestamp);
    const intervalKey = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      Math.floor(timestamp.getHours() / (intervalMinutes / 60)) * (intervalMinutes / 60)
    ).toISOString();
    
    if (!intervals.has(intervalKey)) {
      intervals.set(intervalKey, []);
    }
    
    const value = entry[metric];
    if (typeof value === 'number') {
      intervals.get(intervalKey)!.push(value);
    }
  });
  
  // Calculate averages and trends
  const trendingData = Array.from(intervals.entries())
    .map(([time, values]) => ({
      time: new Date(time).toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      value: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
  
  // Add change indicators
  for (let i = 1; i < trendingData.length; i++) {
    const current = trendingData[i].value;
    const previous = trendingData[i - 1].value;
    (trendingData[i] as any).change = current - previous;
  }
  
  return trendingData;
}