import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { durations, easings } from '../../lib/motion';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="divide-y divide-neutral-100">
      {items.map((item, index) => (
        <div key={index}>
          <button
            onClick={() => toggle(index)}
            className="w-full flex items-center justify-between py-5 text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-expanded={openIndex === index}
          >
            <span className="text-heading-sm font-semibold text-text-primary pr-4 group-hover:text-primary-600 transition-colors">
              {item.question}
            </span>
            <motion.span
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: durations.base, ease: easings.smooth }
              }
              className="shrink-0 text-neutral-500"
            >
              <ChevronDown size={20} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {openIndex === index && (
              <motion.div
                initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: durations.base, ease: easings.smooth }
                }
                className="overflow-hidden"
              >
                <p className="pb-5 text-body-md text-text-secondary max-w-[65ch] leading-relaxed">
                  {item.answer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
