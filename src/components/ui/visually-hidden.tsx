import * as React from 'react';
import { cn } from '@/lib/utils';

const VisuallyHidden = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'absolute border-0 clip-[rect(0,0,0,0)] h-px w-px -m-px overflow-hidden p-0 whitespace-nowrap',
        className
      )}
      style={{
        clip: 'rect(0, 0, 0, 0)',
        clipPath: 'inset(50%)',
        height: '1px',
        overflow: 'hidden',
        position: 'absolute',
        whiteSpace: 'nowrap',
        width: '1px',
      }}
      {...props}
    />
  )
);
VisuallyHidden.displayName = 'VisuallyHidden';

export { VisuallyHidden };
