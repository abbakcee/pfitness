import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Instagram, MapPin, Send } from 'lucide-react';

const CONTACT_LINKS = [
  {
    name: 'WhatsApp',
    icon: MessageCircle,
    url: 'https://wa.me/2347069931000',
    desc: '+234 706 993 1000'
  },
  {
    name: 'Instagram',
    icon: Instagram,
    url: 'https://instagram.com/peppergrillfitness_',
    desc: '@peppergrillfitness_'
  },
  {
    name: 'Location',
    icon: MapPin,
    url: 'https://maps.google.com/?q=926+Abubakar+Koko+Ave,+Jabi,+Abuja+900108',
    desc: '926 Abubakar Koko Ave, Jabi, Abuja'
  }
];

export default function Contact() {
  const [formData, setFormData] = useState({ fullName: '', phoneNumber: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phoneNumber) return;
    
    // Store in localStorage as requested
    const existing = JSON.parse(localStorage.getItem('pfitness_leads') || '[]');
    localStorage.setItem('pfitness_leads', JSON.stringify([...existing, { ...formData, date: new Date().toISOString() }]));
    
    setSubmitted(true);
    setFormData({ fullName: '', phoneNumber: '' });
    
    setTimeout(() => {
      setSubmitted(false);
    }, 5000);
  };

  return (
    <section id="contact" className="py-24 bg-[var(--brand-bg)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8">
          
          {/* Contact Info */}
          <div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4"
            >
              Get In <span className="text-[var(--brand-primary)]">Touch</span>
            </motion.h2>
            <p className="text-gray-400 font-medium mb-12 max-w-md">
              Ready to start? Reach out to us directly or visit our facility to experience the atmosphere.
            </p>

            <div className="flex flex-col gap-6">
              {CONTACT_LINKS.map((link, index) => (
                <motion.a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-6 p-6 rounded-2xl bg-[var(--brand-surface)] border border-[var(--brand-border)] hover:border-[var(--brand-primary)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/10 transition-all duration-300 group"
                >
                  <div className="w-14 h-14 bg-[var(--brand-bg)] rounded-full flex items-center justify-center text-gray-400 group-hover:text-[var(--brand-primary)] group-hover:scale-110 transition-all duration-300">
                    <link.icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-1">{link.name}</h3>
                    <p className="text-gray-400 text-sm font-medium">{link.desc}</p>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Registration Form */}
          <motion.div
            id="membership-form"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[var(--brand-surface)] p-8 md:p-12 rounded-3xl border border-[var(--brand-border)] relative overflow-hidden flex flex-col justify-center"
          >
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)] opacity-5 blur-[100px] rounded-full pointer-events-none" />

            <div className="mb-8 relative z-10">
              <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Stay Updated</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Register to receive exclusive updates about membership promotions, new supplements, fitness challenges, and gym events.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-[var(--brand-bg)] border border-[var(--brand-border)] rounded-lg px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Phone Number</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-[var(--brand-bg)] border border-[var(--brand-border)] rounded-lg px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-all"
                  placeholder="Enter your phone number"
                />
              </div>

              <button
                type="submit"
                disabled={submitted}
                className={`w-full py-4 rounded-lg font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                  submitted 
                    ? 'bg-green-600 text-white' 
                    : 'bg-[var(--brand-primary)] text-white hover:bg-white hover:text-black'
                }`}
              >
                {submitted ? 'Registered Successfully' : 'Notify Me'}
                {!submitted && <Send size={18} />}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
