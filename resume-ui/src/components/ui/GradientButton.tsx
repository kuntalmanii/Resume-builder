import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface GradientButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  variant?: 'gradient' | 'outline';
}

export const GradientButton = ({
  children,
  variant = 'gradient',
  className = '',
  ...props
}: GradientButtonProps) => {
  if (variant === 'outline') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`btn-outline px-7 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`btn-gradient px-8 py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-theme-lg ripple ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};
