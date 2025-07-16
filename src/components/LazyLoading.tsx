'use client';

import { Suspense, lazy, ComponentType, useState, useEffect } from 'react';
import { FiLoader } from 'react-icons/fi';

interface LazyComponentProps {
  fallback?: React.ReactNode;
  delay?: number;
}

// Standard Loading-Komponente
const DefaultLoader = () => (
  <div className="flex items-center justify-center p-8">
    <FiLoader className="animate-spin w-6 h-6 text-[#14ad9f]" />
    <span className="ml-2 text-gray-600">Lädt...</span>
  </div>
);

// Higher-Order Component für Lazy Loading
export function withLazyLoading<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  { fallback = <DefaultLoader />, delay = 0 }: LazyComponentProps = {}
) {
  const LazyComponent = lazy(() => {
    return delay > 0
      ? Promise.all([importFunc(), new Promise(resolve => setTimeout(resolve, delay))]).then(
          ([moduleExports]) => moduleExports
        )
      : importFunc();
  });

  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Beispiel für Lazy-Loading von Dashboard-Komponenten - Pfade müssen angepasst werden
// export const LazyUserInfoCard = withLazyLoading(
//   () => import('@/components/UserInfoCard'),
//   { fallback: <DefaultLoader /> }
// );

// Generic Lazy Loading für jede Komponente
export const createLazyComponent = (importPath: string) => {
  return withLazyLoading(() => import(importPath), { fallback: <DefaultLoader /> });
};

// Intersection Observer Hook für Lazy Loading
export function useLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, threshold]);

  return [setRef, isVisible] as const;
}

// Lazy Loading Container
interface LazyContainerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  className?: string;
}

export function LazyContainer({
  children,
  fallback = <DefaultLoader />,
  threshold = 0.1,
  className,
}: LazyContainerProps) {
  const [ref, isVisible] = useLazyLoad(threshold);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}
