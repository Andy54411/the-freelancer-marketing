import { useEffect, useState, useRef } from 'react';

export interface PageData {
  pageNumber: number;
  content: React.ReactNode;
  hasFooter: boolean;
}

export const usePDFPagination = (contentHeight: number, pageHeight: number = 1123) => {
  const [pages, setPages] = useState<PageData[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const calculatePages = () => {
    if (!contentRef.current) return [];

    const totalPages = Math.ceil(contentHeight / pageHeight);
    const newPages: PageData[] = [];

    for (let i = 1; i <= totalPages; i++) {
      newPages.push({
        pageNumber: i,
        content: null, // Wird vom Template gefüllt
        hasFooter: true, // Jede Seite hat Footer
      });
    }

    setPages(newPages);
    return newPages;
  };

  useEffect(() => {
    calculatePages();
  }, [contentHeight, pageHeight]);

  return {
    pages,
    totalPages: pages.length,
    contentRef,
    calculatePages,
  };
};
