import { cn } from '@/lib/utils';

export const Logo = ({
  className,
  variant = 'white',
}: {
  className?: string;
  variant?: 'default' | 'white';
}) => {
  const isWhite = variant === 'white';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Hauptform des T-Logos */}
        <rect x="2" y="2" width="24" height="6" rx="1" fill={isWhite ? '#FFFFFF' : '#14B8A6'} />
        <rect x="11" y="8" width="6" height="18" rx="1" fill={isWhite ? '#FFFFFF' : '#14B8A6'} />
        <rect x="18" y="8" width="6" height="8" rx="1" fill={isWhite ? '#E5E7EB' : '#6B7280'} />
        <rect x="18" y="18" width="4" height="8" rx="1" fill={isWhite ? '#E5E7EB' : '#6B7280'} />
      </svg>
      <span
        className={cn(
          'text-lg font-bold tracking-wide',
          isWhite ? 'text-white' : 'text-gray-900 dark:text-white'
        )}
      >
        TASKILO
      </span>
    </div>
  );
};

export const LogoIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-6 h-6', className)}
    >
      {/* Vereinfachte Icon-Version in Weiß */}
      <rect x="1" y="1" width="22" height="5" rx="1" fill="#FFFFFF" />
      <rect x="9.5" y="6" width="5" height="16" rx="1" fill="#FFFFFF" />
      <rect x="16" y="6" width="5" height="7" rx="1" fill="#E5E7EB" />
      <rect x="16" y="15" width="3" height="7" rx="1" fill="#E5E7EB" />
    </svg>
  );
};
