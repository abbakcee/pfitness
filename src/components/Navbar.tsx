import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { name: 'Home', href: '#home' },
  { name: 'Services', href: '#services' },
  { name: 'Fuel Your Performance', href: '#fuel' },
  { name: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAlternateTheme, setIsAlternateTheme] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { threshold: 0.3, rootMargin: "-100px 0px -100px 0px" });

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const toggleTheme = () => {
    const newThemeState = !isAlternateTheme;
    setIsAlternateTheme(newThemeState);
    if (newThemeState) {
      document.documentElement.classList.add('theme-gold');
    } else {
      document.documentElement.classList.remove('theme-gold');
    }
  };

  const handleLogoDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleTheme();
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[var(--brand-bg)]/95 backdrop-blur-md shadow-lg shadow-black/20 py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div 
          className="cursor-pointer select-none relative group"
          onDoubleClick={handleLogoDoubleClick}
        >
          <img 
            src="/pfitnesslogo.png" 
            alt="P Fitness Logo" 
            className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            draggable="false"
          />
          {/* Invisible overlay for easier double clicking */}
          <div className="absolute inset-0 z-10" />
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-8">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href.substring(1);
            return (
              <a
                key={link.name}
                href={link.href}
                className={`text-sm uppercase tracking-widest font-medium transition-colors ${
                  isActive ? 'text-[var(--brand-primary)]' : 'text-white/80 hover:text-[var(--brand-primary)]'
                }`}
              >
                {link.name}
              </a>
            );
          })}
          <Link
            to="/login"
            className="text-sm uppercase tracking-widest font-medium text-white/80 hover:text-[var(--brand-primary)] transition-colors"
          >
            Member Login
          </Link>
          <Link
            to="/register"
            className="bg-[var(--brand-primary)] text-white px-6 py-2 rounded-full text-sm uppercase tracking-wider font-bold hover:bg-white hover:text-black transition-colors"
          >
            Join Now
          </Link>
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 right-0 bg-[var(--brand-bg)] shadow-xl shadow-black/50 border-t border-[var(--brand-border)]"
          >
            <div className="flex flex-col p-4 space-y-4">
              {NAV_LINKS.map((link) => {
                const isActive = activeSection === link.href.substring(1);
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-lg font-medium p-2 transition-colors ${
                      isActive ? 'text-[var(--brand-primary)]' : 'text-white/90 hover:text-[var(--brand-primary)]'
                    }`}
                  >
                    {link.name}
                  </a>
                );
              })}
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium p-2 text-white/90 hover:text-[var(--brand-primary)] transition-colors"
              >
                Member Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="bg-[var(--brand-primary)] text-white px-6 py-3 rounded-lg text-center font-bold uppercase tracking-wider mt-4"
              >
                Join Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
