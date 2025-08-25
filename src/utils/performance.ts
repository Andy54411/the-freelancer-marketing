// Performance-Utilities für bessere Website-Performance

// Lazy Loading für Komponenten
export const lazyLoad = (importFunc: () => Promise<any>) => {
  return importFunc();
};

// Preload kritische Ressourcen
export const preloadResource = (href: string, as: string) => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
};

// Debounce für Performance-kritische Funktionen
export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout | undefined;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

// Throttle für Scroll-Events
export const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

// Intersection Observer für Lazy Loading
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => {
  if (typeof window === 'undefined') return null;

  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
};

// Web Vitals Metriken
export const getCLS = (callback: (value: number) => void) => {
  if (typeof window === 'undefined') return;

  let clsValue = 0;
  const observer = new PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    });
    callback(clsValue);
  });

  observer.observe({ type: 'layout-shift', buffered: true });
};

export const getFID = (callback: (value: number) => void) => {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if (entry.name === 'first-input') {
        const fidEntry = entry as any;
        callback(fidEntry.processingStart - fidEntry.startTime);
      }
    });
  });

  observer.observe({ type: 'first-input', buffered: true });
};

export const getLCP = (callback: (value: number) => void) => {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      callback(lastEntry.startTime);
    }
  });

  observer.observe({ type: 'largest-contentful-paint', buffered: true });
};

// Resource Hints
export const addResourceHints = () => {
  if (typeof window === 'undefined') return;

  const hints = [
    { rel: 'dns-prefetch', href: 'https://firebasestorage.googleapis.com' },
    { rel: 'dns-prefetch', href: 'https://storage.googleapis.com' },
    { rel: 'preconnect', href: 'https://firebasestorage.googleapis.com' },
    { rel: 'preconnect', href: 'https://storage.googleapis.com' },
  ];

  hints.forEach(({ rel, href }) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  });
};

// Service Worker Registration
export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {

      })
      .catch(registrationError => {

      });
  });
};

// Critical CSS Inlining
export const inlineCriticalCSS = (css: string) => {
  if (typeof window === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
};

// Image Optimization
export const optimizeImageLoading = () => {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll('img[loading="lazy"]');
  const imageObserver = createIntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.loading = 'eager';
        imageObserver?.unobserve(img);
      }
    });
  });

  images.forEach(img => {
    imageObserver?.observe(img);
  });
};
