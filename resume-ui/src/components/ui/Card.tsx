import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: 'default' | 'premium';
}

export const Card = ({ children, variant = 'default', className = '', ...props }: CardProps) => {
  const { theme } = useTheme();
  const isGlass = theme === 'glass';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`rounded-4xl p-10 border th-transition ${
        isGlass ? 'glass-card' : ''
      } ${
        variant === 'premium' ? 'shadow-premium border-th-primary/20' : 'shadow-theme border-th-border'
      } ${className}`}
      style={{
        background: 'var(--card)',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
