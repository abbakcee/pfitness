import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-[var(--brand-bg)] border-t border-[var(--brand-border)] py-12 text-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <img 
          src="/pfitnesslogo.png" 
          alt="P Fitness" 
          className="h-10 mb-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500" 
        />
        
        <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-4">
          One More Rep.
        </p>
        
        <p className="text-gray-600 text-xs mt-8">
          &copy; {currentYear} P Fitness. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
