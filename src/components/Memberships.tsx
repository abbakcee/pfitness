import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PlanKey } from '../lib/config';

const MEMBERSHIPS: { title: string; plan: PlanKey; price: string; duration: string; features: string[]; popular: boolean }[] = [
  {
    title: 'Monthly',
    plan: '1_month',
    price: '₦30,000',
    duration: 'Per Month',
    features: ['Access to gym floor', 'Locker room access', '1 Free consultation', 'Basic fitness assessment'],
    popular: false,
  },
  {
    title: '3 Months',
    plan: '3_months',
    price: '₦80,000',
    duration: 'Quarterly',
    features: ['Access to gym floor', 'Locker room access', 'Weekly group classes', 'Customized workout plan', 'Nutrition guide'],
    popular: true,
  },
  {
    title: 'Annual',
    plan: '1_year',
    price: '₦140,000',
    duration: 'Per Year',
    features: ['Unlimited gym access', 'All group classes included', 'Monthly PT sessions', 'Advanced body composition analysis', 'Guest passes'],
    popular: false,
  }
];

export default function Memberships() {
  return (
    <section id="memberships" className="py-24 bg-[var(--brand-bg)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4"
          >
            Choose Your <span className="text-[var(--brand-primary)]">Discipline</span>
          </motion.h2>
          <p className="text-gray-400 max-w-2xl mx-auto font-medium">
            Commit to your goals with our premium membership packages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {MEMBERSHIPS.map((plan, index) => (
            <motion.div
              key={plan.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className={`relative bg-[var(--brand-surface)] rounded-2xl p-8 border transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--brand-primary)]/10 hover:-translate-y-2 flex flex-col h-full ${
                plan.popular 
                  ? 'border-[var(--brand-primary)] md:scale-105 z-10 py-10' 
                  : 'border-[var(--brand-border)]'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--brand-primary)] text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold uppercase tracking-widest text-gray-300 mb-2">{plan.title}</h3>
                <div className="text-4xl font-black mb-1">{plan.price}</div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">{plan.duration}</div>
              </div>
              
              <div className="flex-grow">
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check size={20} className="text-[var(--brand-primary)] shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Link
                to={`/register?plan=${plan.plan}`}
                className={`mt-10 w-full py-4 rounded-lg font-bold uppercase tracking-widest transition-colors text-center block ${
                  plan.popular
                    ? 'bg-[var(--brand-primary)] text-white hover:bg-white hover:text-black'
                    : 'bg-transparent border border-white/20 text-white hover:border-white hover:bg-white hover:text-black'
                }`}
              >
                Select Plan
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
