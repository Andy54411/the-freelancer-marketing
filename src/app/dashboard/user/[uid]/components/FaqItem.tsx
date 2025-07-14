// /Users/andystaudinger/Taskilo/src/app/dashboard/user/userId/components/FaqItem.tsx
'use client';

import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface FaqItemProps {
  question: string;
  answer: React.ReactNode; // Erlaube HTML im Answer-String
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <article className="border-b border-gray-200 dark:border-gray-700">
      <div
        role="button"
        aria-expanded={isOpen}
        className="flex justify-between items-center py-5 px-1 cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <h6 className="font-semibold text-base text-gray-800 dark:text-gray-200">{question}</h6>
        <span className="text-gray-500 dark:text-gray-400">
          {isOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </span>
      </div>
      <div
        aria-hidden={!isOpen}
        style={{
          overflow: 'hidden',
          height: isOpen ? 'auto' : '0px',
          transition: 'height 0.3s ease-in-out, padding 0.3s ease-in-out',
          paddingTop: isOpen ? '0' : '0',
          paddingBottom: isOpen ? '20px' : '0',
        }}
        className="px-1 text-sm text-gray-700 dark:text-gray-400"
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">{answer}</div>
      </div>
    </article>
  );
};

export default FaqItem;
