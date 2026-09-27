/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This is the original home page, moved from App.tsx unchanged so the
// existing design/sections/behavior are fully preserved. App.tsx now
// just routes to this.

import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Memberships from '../components/Memberships';
import Services from '../components/Services';
import Fuel from '../components/Fuel';
import Features from '../components/Features';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-white font-sans selection:bg-[var(--brand-primary)] selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <Memberships />
        <Services />
        <Fuel />
        <Features />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
