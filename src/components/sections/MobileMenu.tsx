import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);

    const hashIndex = href.indexOf('#');
    const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
    const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    const targetPath = path || window.location.pathname;
    const isCurrentPage = targetPath === window.location.pathname;

    if (isCurrentPage && hash) {
      setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 250);
    } else {
      setTimeout(() => {
        window.location.href = href;
      }, 250);
    }
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center w-11 h-11 rounded-md text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="fixed inset-0 z-[100] isolate flex min-h-dvh flex-col bg-surface-inverse"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: durations.base, ease: easings.smooth }}
                role="dialog"
                aria-modal="true"
                aria-label="Site menu"
              >
                <div className="flex h-[72px] shrink-0 items-center justify-end px-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
                    aria-label="Close menu"
                  >
                    <X size={24} />
                  </button>
                </div>

                <nav
                  className="flex flex-1 flex-col items-center justify-center gap-8 pb-[72px]"
                  aria-label="Mobile navigation"
                >
                  {navItems.map((item, i) => (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className="text-display-sm font-semibold text-white transition-colors hover:text-primary-400"
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
                    href="/#book"
                    onClick={(e) => handleNavClick(e, '/#book')}
                    className="mt-4 inline-flex h-12 items-center justify-center rounded-md bg-white px-7 py-3 text-body-lg font-semibold text-navy-900 transition-colors hover:bg-neutral-50"
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
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
