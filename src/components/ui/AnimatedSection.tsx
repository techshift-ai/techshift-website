import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeInUp, staggerContainer, staggerItem } from '../../lib/motion';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  variant?: 'fadeInUp' | 'stagger';
}

export default function AnimatedSection({
  children,
  className = '',
  variant = 'fadeInUp',
}: AnimatedSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const variants = variant === 'stagger' ? staggerContainer : fadeInUp;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedItemProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedItem({ children, className = '' }: AnimatedItemProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
