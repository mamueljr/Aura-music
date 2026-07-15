import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'aura-gradient text-white shadow-lg shadow-aura-1/25 hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border bg-transparent hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
      },
      size: {
        default: 'h-10 px-4 py-2 [&_svg]:size-4',
        sm: 'h-8 rounded-md px-3 text-xs [&_svg]:size-3.5',
        lg: 'h-12 rounded-xl px-6 [&_svg]:size-5',
        icon: 'size-10 rounded-full [&_svg]:size-5',
        'icon-sm': 'size-8 rounded-full [&_svg]:size-4',
        'icon-lg': 'size-14 rounded-full [&_svg]:size-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
