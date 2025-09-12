import React from 'react';
import { cn } from '@/lib/utils';

interface ModalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'elevated';
}

interface ModalCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

interface ModalCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
}

interface ModalCardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const ModalCard = React.forwardRef<HTMLDivElement, ModalCardProps>(
  ({ className, children, variant = 'default', ...props }, ref) => {
    const baseClasses = 'bg-white rounded-3xl border overflow-hidden';
    const variantClasses = {
      default: 'border-gray-200 shadow-lg',
      gradient: 'border-gray-100 shadow-xl bg-gradient-to-br from-white to-gray-50',
      elevated: 'border-gray-200 shadow-2xl ring-1 ring-gray-100',
    };

    return (
      <div ref={ref} className={cn(baseClasses, variantClasses[variant], className)} {...props}>
        {children}
      </div>
    );
  }
);
ModalCard.displayName = 'ModalCard';

const ModalCardHeader = React.forwardRef<HTMLDivElement, ModalCardHeaderProps>(
  ({ className, children, icon, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pb-4', className)} {...props}>
      <div className="flex items-center gap-3">
        {icon && <div className="p-2 bg-amber-100 rounded-full flex-shrink-0">{icon}</div>}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
);
ModalCardHeader.displayName = 'ModalCardHeader';

const ModalCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h2 ref={ref} className={cn('text-xl font-semibold text-gray-900', className)} {...props}>
    {children}
  </h2>
));
ModalCardTitle.displayName = 'ModalCardTitle';

const ModalCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-gray-600 mt-1', className)} {...props}>
    {children}
  </p>
));
ModalCardDescription.displayName = 'ModalCardDescription';

const ModalCardContent = React.forwardRef<HTMLDivElement, ModalCardContentProps>(
  ({ className, children, spacing = 'md', ...props }, ref) => {
    const spacingClasses = {
      sm: 'space-y-4',
      md: 'space-y-6',
      lg: 'space-y-8',
    };

    return (
      <div ref={ref} className={cn('px-6 pb-6', spacingClasses[spacing], className)} {...props}>
        {children}
      </div>
    );
  }
);
ModalCardContent.displayName = 'ModalCardContent';

const ModalCardSection = React.forwardRef<HTMLDivElement, ModalCardSectionProps>(
  ({ className, children, title, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-gray-50 border-gray-100',
      success: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
      warning: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
      info: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
    };

    const titleColors = {
      default: 'text-gray-900',
      success: 'text-green-800',
      warning: 'text-amber-800',
      info: 'text-blue-800',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl p-5 border', variantClasses[variant], className)}
        {...props}
      >
        {title && <h3 className={cn('text-lg font-medium mb-4', titleColors[variant])}>{title}</h3>}
        {children}
      </div>
    );
  }
);
ModalCardSection.displayName = 'ModalCardSection';

const ModalCardActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-3 pt-6 border-t border-gray-100', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ModalCardActions.displayName = 'ModalCardActions';

export {
  ModalCard,
  ModalCardHeader,
  ModalCardTitle,
  ModalCardDescription,
  ModalCardContent,
  ModalCardSection,
  ModalCardActions,
};
