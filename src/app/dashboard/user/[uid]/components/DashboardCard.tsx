import React from 'react';

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
};

export default DashboardCard;
