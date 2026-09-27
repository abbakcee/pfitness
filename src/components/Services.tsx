import React, { useRef, useEffect } from 'react';
import { motion, useInView } from 'motion/react';
import { Dumbbell, Users, Target, Activity, Flame, HeartPulse } from 'lucide-react';

const SERVICES = [
  { icon: Dumbbell, title: 'Strength Training', desc: 'Build power and muscle with premium free weights and resistance machines.' },
  { icon: Target, title: 'Personal Training', desc: 'One-on-one elite coaching tailored to your specific goals and body.' },
  { icon: Users, title: 'Group Classes', desc: 'High-energy environments driven by community and expert instructors.' },
  { icon: Flame, title: 'Weight Loss Programs', desc: 'Structured, proven regimens to shed fat and improve cardiovascular health.' },
  { icon: Activity, title: 'Body Transformation', desc: 'Comprehensive plans combining workouts, tracking, and consistency.' },
  { icon: HeartPulse, title: 'Nutrition Guidance', desc: 'Fuel your workouts properly with expert diet and supplement advice.' },
];

export default function Services() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-100px" });

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isInView) {
      videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
    } else {
      videoRef.current.pause();
    }
  }, [isInView]);

  return (
    <section id="services" className="py-24 bg-[var(--brand-surface)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Services Grid */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4"
            >
              Elite <span className="text-[var(--brand-primary)]">Services</span>
            </motion.h2>
            <p className="text-gray-400 max-w-2xl mx-auto font-medium">
              Everything you need to sculpt, build, and transform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[var(--brand-bg)] p-8 rounded-2xl border border-[var(--brand-border)] hover:border-[var(--brand-primary)]/50 transition-colors group"
              >
                <div className="w-14 h-14 bg-[var(--brand-surface)] rounded-xl flex items-center justify-center mb-6 text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-colors">
                  <service.icon size={28} />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wide mb-3">{service.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {service.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* P Fitness Challenges */}
        <div ref={containerRef} className="relative rounded-3xl overflow-hidden bg-black border border-[var(--brand-border)]">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-10 lg:p-16 flex flex-col justify-center z-10 bg-gradient-to-r from-[var(--brand-surface)] to-transparent relative">
              <div className="absolute inset-0 bg-[var(--brand-surface)] lg:bg-gradient-to-r lg:from-[var(--brand-surface)] lg:to-[var(--brand-surface)]/80 -z-10" />
              <motion.h3 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-6"
              >
                P Fitness <span className="text-[var(--brand-primary)]">Challenges</span>
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-gray-300 text-lg leading-relaxed mb-8 max-w-md"
              >
                Push your limits with our community-driven fitness challenges. Compete, grow, and break through plateaus alongside members who demand excellence.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <a href="#membership-form" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white hover:text-[var(--brand-primary)] transition-colors">
                  Join the Next Challenge <HeartPulse size={18} className="text-[var(--brand-primary)]" />
                </a>
              </motion.div>
            </div>
            
            <div className="relative h-[400px] lg:h-auto min-h-[400px]">
              <div className="absolute inset-0 bg-black/20 z-10" />
              {/* Optional gradient fade on the left edge of the video for smooth blending on desktop */}
              <div className="hidden lg:block absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-[var(--brand-surface)]/80 to-transparent z-10" />
              
              <video 
                ref={videoRef}
                src="/gymv.mp4" 
                muted 
                loop 
                playsInline
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
