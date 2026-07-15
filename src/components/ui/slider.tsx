import * as SliderPrimitive from '@radix-ui/react-slider';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Slider = forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      'group relative flex touch-none select-none items-center',
      orientation === 'horizontal' ? 'w-full' : 'h-full w-5 flex-col justify-center',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        'relative grow overflow-hidden rounded-full bg-muted-foreground/25',
        orientation === 'horizontal' ? 'h-1.5 w-full' : 'h-full w-1.5',
      )}
    >
      <SliderPrimitive.Range
        className={cn(
          'absolute aura-gradient',
          orientation === 'horizontal' ? 'h-full' : 'w-full bottom-0',
        )}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-3.5 rounded-full bg-foreground shadow-md ring-aura-1/40 transition-transform focus-visible:outline-none focus-visible:ring-4 group-hover:scale-110" />
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';

export { Slider };
