'use client';

import { useEffect } from 'react';

interface PerformanceMetrics {
  FCP?: number;
  LCP?: number;
  FID?: number;
  CLS?: number;
  TTFB?: number;
}

export default function PerformanceMonitor() {
  useEffect(() => {
    // Nur im Browser ausführen
    if (typeof window === 'undefined') return;

    const reportMetrics = (metrics: PerformanceMetrics) => {
      if (process.env.NODE_ENV === 'production') {
        // Hier können Sie Metriken an Ihren Analytics-Service senden
        console.log('Performance Metrics:', metrics);
      }
    };

    // Core Web Vitals messen
    const measureCoreWebVitals = () => {
      const metrics: PerformanceMetrics = {};

      // First Contentful Paint (FCP)
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        metrics.FCP = fcpEntry.startTime;
      }

      // Largest Contentful Paint (LCP)
      const observer = new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          metrics.LCP = lastEntry.startTime;
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-input') {
            const fidEntry = entry as any;
            metrics.FID = fidEntry.processingStart - fidEntry.startTime;
          }
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        metrics.CLS = clsValue;
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Time to First Byte (TTFB)
      const navigationEntry = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        metrics.TTFB = navigationEntry.responseStart - navigationEntry.requestStart;
      }

      // Metriken nach 3 Sekunden senden
      setTimeout(() => {
        reportMetrics(metrics);
      }, 3000);
    };

    // Warte auf das Load-Event
    if (document.readyState === 'complete') {
      measureCoreWebVitals();
    } else {
      window.addEventListener('load', measureCoreWebVitals);
    }

    // Cleanup
    return () => {
      window.removeEventListener('load', measureCoreWebVitals);
    };
  }, []);

  return null; // Keine UI-Komponente
}
