import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart } from 'lucide-react';

const PRODUCTS = [
  {
    name: 'Whey Protein',
    size: '2kg',
    desc: 'Premium muscle recovery and growth support.',
    price: '₦45,000',
    image: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Whey Protein',
    size: '5kg',
    desc: 'Extended supply for serious daily training.',
    price: '₦95,000',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Creatine Monohydrate',
    size: '300g',
    desc: 'Boost strength, power, and high-intensity performance.',
    price: '₦18,000',
    image: 'https://images.unsplash.com/photo-1552656967-7981477435f3?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Creatine Monohydrate',
    size: '500g',
    desc: 'Maximum endurance and peak ATP production.',
    price: '₦28,000',
    image: 'https://images.unsplash.com/photo-1574852924375-4309e3a79357?q=80&w=800&auto=format&fit=crop',
  }
];

export default function Fuel() {
  const WHATSAPP_URL = "https://wa.me/2347069931000";

  return (
    <section id="fuel" className="py-24 bg-[var(--brand-bg)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4"
          >
            Fuel Your <span className="text-[var(--brand-primary)]">Performance</span>
          </motion.h2>
          <p className="text-gray-400 max-w-2xl mx-auto font-medium">
            Premium supplements curated to support your recovery and amplify your results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((product, index) => (
            <motion.div
              key={`${product.name}-${product.size}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-[var(--brand-surface)] rounded-2xl overflow-hidden border border-[var(--brand-border)] hover:border-[var(--brand-primary)]/30 transition-all duration-500"
            >
              <div className="h-56 overflow-hidden relative bg-black">
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-surface)] via-transparent to-transparent z-10" />
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-80"
                />
                <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest py-1 px-3 rounded-full border border-white/10">
                  {product.size}
                </div>
              </div>
              
              <div className="p-6 relative z-20 -mt-6">
                <h3 className="text-xl font-bold uppercase tracking-wide mb-2">{product.name}</h3>
                <p className="text-gray-400 text-sm mb-4 min-h-[40px]">
                  {product.desc}
                </p>
                <div className="text-2xl font-black text-[var(--brand-primary)] mb-6">
                  {product.price}
                </div>
                
                <a 
                  href={`${WHATSAPP_URL}?text=Hello, I would like to order: ${product.name} (${product.size}) - ${product.price}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-white/5 hover:bg-[var(--brand-primary)] text-white border border-white/10 hover:border-transparent py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all duration-300"
                >
                  <ShoppingCart size={16} />
                  Order on WhatsApp
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
