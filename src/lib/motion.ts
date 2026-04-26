import type { Transition, Variants } from "framer-motion";

// Duration primitives from tokens.json
export const durations = {
  instant: 0,
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
  extraSlow: 0.6,
} as const;

// Easing curves from tokens.json
export const easings = {
  snap: [0.2, 0, 0, 1] as [number, number, number, number],
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
};

// Named transitions
export const transitions = {
  snap: { duration: durations.fast, ease: easings.snap } satisfies Transition,
  base: { duration: durations.base, ease: easings.smooth } satisfies Transition,
  slow: { duration: durations.slow, ease: easings.smooth } satisfies Transition,
  exit: { duration: durations.fast, ease: easings.exit } satisfies Transition,
};

// Fade in from below
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: transitions.slow },
};

// Simple fade
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.slow },
};

// Scale in
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitions.slow },
};

// Stagger children container
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// Stagger child item
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.smooth },
  },
};

// Hero entrance sequence
export const heroOverline: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delay: 0.1, duration: durations.slow, ease: easings.smooth } },
};

export const heroHeadline: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay: 0.2, duration: durations.slow, ease: easings.smooth } },
};

export const heroSubhead: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { delay: 0.35, duration: durations.slow, ease: easings.smooth } },
};

export const heroCta: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { delay: 0.5, duration: durations.slow, ease: easings.smooth } },
};
