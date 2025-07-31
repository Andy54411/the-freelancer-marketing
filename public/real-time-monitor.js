// public/real-time-monitor.js
class RealTimeMonitor {
  constructor() {
    this.isActive = false;
    this.intervals = new Map();
    this.callbacks = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  // Startet Real-Time Monitoring für spezifische Endpunkte
  startMonitoring(endpoint, callback, intervalMs = 30000) {
    if (this.intervals.has(endpoint)) {
      this.stopMonitoring(endpoint);
    }

    console.log(`[RealTimeMonitor] Starting monitoring for ${endpoint} every ${intervalMs}ms`);

    this.callbacks.set(endpoint, callback);
    this.retryAttempts.set(endpoint, 0);

    // Sofortiger erster Call
    this.fetchData(endpoint);

    // Interval für regelmäßige Updates
    const intervalId = setInterval(() => {
      this.fetchData(endpoint);
    }, intervalMs);

    this.intervals.set(endpoint, intervalId);
    this.isActive = true;
  }

  // Stoppt Monitoring für einen spezifischen Endpunkt
  stopMonitoring(endpoint) {
    const intervalId = this.intervals.get(endpoint);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(endpoint);
      this.callbacks.delete(endpoint);
      this.retryAttempts.delete(endpoint);
      console.log(`[RealTimeMonitor] Stopped monitoring for ${endpoint}`);
    }
  }

  // Stoppt alle Monitoring-Aktivitäten
  stopAll() {
    this.intervals.forEach((intervalId, endpoint) => {
      clearInterval(intervalId);
      console.log(`[RealTimeMonitor] Stopped monitoring for ${endpoint}`);
    });

    this.intervals.clear();
    this.callbacks.clear();
    this.retryAttempts.clear();
    this.isActive = false;
  }

  // Fetcht Daten von einem Endpunkt
  async fetchData(endpoint) {
    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Reset retry counter bei erfolgreichem Request
      this.retryAttempts.set(endpoint, 0);

      // Callback mit neuen Daten aufrufen
      const callback = this.callbacks.get(endpoint);
      if (callback) {
        callback(data, null);
      }

      // Success Event für andere Teile der Anwendung
      this.dispatchCustomEvent('realtime-update', {
        endpoint,
        data,
        timestamp: new Date().toISOString(),
        status: 'success',
      });

    } catch (error) {
      console.error(`[RealTimeMonitor] Error fetching ${endpoint}:`, error);

      const retries = this.retryAttempts.get(endpoint) || 0;
      this.retryAttempts.set(endpoint, retries + 1);

      // Callback mit Fehler aufrufen
      const callback = this.callbacks.get(endpoint);
      if (callback) {
        callback(null, error);
      }

      // Error Event
      this.dispatchCustomEvent('realtime-error', {
        endpoint,
        error: error.message,
        retryAttempt: retries + 1,
        maxRetries: this.maxRetries,
        timestamp: new Date().toISOString(),
      });

      // Stoppe Monitoring nach zu vielen Fehlern
      if (retries >= this.maxRetries) {
        console.warn(`[RealTimeMonitor] Max retries reached for ${endpoint}, stopping monitoring`);
        this.stopMonitoring(endpoint);

        this.dispatchCustomEvent('realtime-stopped', {
          endpoint,
          reason: 'max_retries_reached',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Helper für Custom Events
  dispatchCustomEvent(eventType, detail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventType, { detail }));
    }
  }

  // Status des Monitors
  getStatus() {
    return {
      isActive: this.isActive,
      activeEndpoints: Array.from(this.intervals.keys()),
      endpointCount: this.intervals.size,
      retryStatus: Object.fromEntries(this.retryAttempts),
    };
  }

  // Health Check für alle überwachten Endpunkte
  async healthCheck() {
    const results = {};

    for (const endpoint of this.intervals.keys()) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint + '?health=true');
        const responseTime = Date.now() - startTime;

        results[endpoint] = {
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
          httpStatus: response.status,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        results[endpoint] = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }

    this.dispatchCustomEvent('realtime-health-check', { results });
    return results;
  }
}

// Global instance
const realTimeMonitor = new RealTimeMonitor();

// Exportiere für Browser-Verwendung
if (typeof window !== 'undefined') {
  window.RealTimeMonitor = realTimeMonitor;
}

// Cleanup bei Page Unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realTimeMonitor.stopAll();
  });

  // Visibility API für Pausierung bei inaktiven Tabs
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('[RealTimeMonitor] Page hidden, monitoring continues in background');
    } else {
      console.log('[RealTimeMonitor] Page visible, monitoring active');
      // Optional: Immediate refresh after tab becomes visible
      const status = realTimeMonitor.getStatus();
      status.activeEndpoints.forEach(endpoint => {
        realTimeMonitor.fetchData(endpoint);
      });
    }
  });
}

// Export für Node.js/Module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RealTimeMonitor };
}
