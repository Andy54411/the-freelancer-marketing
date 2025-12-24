import { cn } from '@/lib/utils';
import Image from 'next/image';

export const Logo = ({
  className,
  variant = 'white',
}: {
  className?: string;
  variant?: 'default' | 'white';
}) => {
  const logoSrc = variant === 'white' 
    ? '/images/taskilo-logo-white.png' 
    : '/images/taskilo-logo-transparent.png';

  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src={logoSrc}
        alt="Taskilo Logo"
        width={140}
        height={40}
        className="h-10 w-auto"
        priority
      />
    </div>
  );
};

export const LogoIcon = ({ className }: { className?: string }) => {
  return (
    <Image
      src="/images/taskilo-logo-transparent.png"
      alt="Taskilo"
      width={32}
      height={32}
      className={cn('w-8 h-8 object-contain', className)}
    />
  );
};
