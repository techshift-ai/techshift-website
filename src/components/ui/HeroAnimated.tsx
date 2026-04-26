import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { heroOverline, heroHeadline, heroSubhead, heroCta } from '../../lib/motion';

interface HeroAnimatedProps {
  children: ReactNode;
  className?: string;
}

export function HeroContainer({ children, className = '' }: HeroAnimatedProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function HeroOverline({ children, className = '' }: HeroAnimatedProps) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <div className={className}>{children}</div>;
  return <motion.div className={className} variants={heroOverline}>{children}</motion.div>;
}

export function HeroHeadline({ children, className = '' }: HeroAnimatedProps) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <div className={className}>{children}</div>;
  return <motion.div className={className} variants={heroHeadline}>{children}</motion.div>;
}

export function HeroSubhead({ children, className = '' }: HeroAnimatedProps) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <div className={className}>{children}</div>;
  return <motion.div className={className} variants={heroSubhead}>{children}</motion.div>;
}

export function HeroCta({ children, className = '' }: HeroAnimatedProps) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <div className={className}>{children}</div>;
  return <motion.div className={className} variants={heroCta}>{children}</motion.div>;
}
