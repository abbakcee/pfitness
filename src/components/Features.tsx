import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

const HIGHLIGHTS = [
  'Professional Coaching',
  'Unwavering Consistency',
  'Optimized Recovery',
  'Driven Community',
  'Iron Discipline',
  'Proven Results'
];

export default function Features() {
  return (
    <section className="py-24 bg-[var(--brand-surface)] relative border-t border-b border-[var(--brand-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-[var(--brand-border)] group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
            <img 
              src="/gymp.jpg" 
              alt="P Fitness Motivation" 
              className="w-full h-auto object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
          </motion.div>

          <div className="flex flex-col justify-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-6"
            >
              Why Choose <br />
              <span className="text-[var(--brand-primary)]">P Fitness?</span>
            </motion.h2>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="w-20 h-1 bg-[var(--brand-primary)] mb-8"
            />

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg mb-10 leading-relaxed font-medium"
            >
              We don't just sell memberships; we forge lifestyles. Our environment is engineered for those who demand more from themselves. No distractions, just hard work and undeniable progress.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
              {HIGHLIGHTS.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + (index * 0.1) }}
                  className="flex items-center gap-3 text-white font-bold uppercase tracking-wider text-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-bg)] border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-primary)]">
                    <ChevronRight size={16} />
                  </div>
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
