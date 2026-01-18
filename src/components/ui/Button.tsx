// src/components/ui/Button.tsx
import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// FIX: We Omit 'children' from HTMLMotionProps and redefine it strictly
interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {

    const variants = {
      primary: "bg-slate-900 text-white shadow-lg hover:bg-slate-800 border border-transparent",
      secondary: "bg-white/50 text-slate-900 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80",
      outline: "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100/50 hover:text-slate-900",
    };

    // ... keep the rest of the component exactly the same ...
    const sizes = {
      sm: "h-9 px-3 text-xs",
      md: "h-11 px-6 text-sm",
      lg: "h-14 px-8 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";