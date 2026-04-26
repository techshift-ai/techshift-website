import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { durations, easings } from '../../lib/motion';

interface NavItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  navItems: NavItem[];
}

export default function MobileMenu({ navItems }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[100] bg-navy-900 flex flex-col items-center justify-center"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: durations.base, ease: easings.smooth }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 cursor-pointer"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>

            <nav className="flex flex-col items-center gap-6" aria-label="Mobile navigation">
              {navItems.map((item, i) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-display-sm font-semibold text-white hover:text-primary-400 transition-colors"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: shouldReduceMotion ? 0 : 0.06 * i,
                    duration: durations.slow,
                    ease: easings.smooth,
                  }}
                >
                  {item.label}
                </motion.a>
              ))}
              <motion.a
                href="#book"
                onClick={() => setIsOpen(false)}
                className="mt-4 inline-flex items-center justify-center h-13 px-7 py-3.5 text-body-lg font-semibold rounded-md bg-white text-navy-900 hover:bg-neutral-50 transition-colors"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.06 * navItems.length,
                  duration: durations.slow,
                  ease: easings.smooth,
                }}
              >
                Book a call
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
