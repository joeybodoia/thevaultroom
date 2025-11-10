import React from 'react';
import { Mail, MessageCircle, Shield } from 'lucide-react';

const Footer: React.FC = () => {
  /** Smooth scroll helper for internal sections (mirrors Header.tsx behavior) */
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);

    // If section isn't on this page (or not yet rendered), fall back to hash navigation
    if (!el) {
      window.location.hash = id;
      return;
    }

    const headerOffset = 72; // approx header height to avoid overlap
    const rect = el.getBoundingClientRect();
    const offsetTop = rect.top + window.scrollY - headerOffset;

    window.scrollTo({
      top: offsetTop,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="bg-black border-t border-gray-200 py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Logo + Disclaimer */}
          <div>
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <img
                src="https://i.imgur.com/5ke3mJw.png"
                alt="Dread's Vault Logo"
                className="h-8 sm:h-10 w-auto"
              />
              <span className="text-lg sm:text-xl font-bold text-white font-pokemon">
                Dread&apos;s Vault
              </span>
            </div>

            <p className="text-white/60 text-xs sm:text-sm mb-3 sm:mb-4 font-pokemon whitespace-pre-line">
              <span className="text-red-500 sm:text-red-400 font-semibold">Disclaimer:</span>{' '}
              Dread’s Vault streams are entertainment events only.
              {' '}Participation requires a fixed entry fee and provides equal access to all random features.
              {' '}Credits have no cash value, cannot be purchased or exchanged, and do not affect odds of winning.
              {' '}This platform does not offer gambling, betting, or sweepstakes of any kind.
            </p>

            <div className="flex space-x-4">
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-3 sm:mb-4 font-pokemon text-sm sm:text-base">
              Quick Links
            </h3>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('bidding')}
                  className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  Bidding
                </button>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-3 sm:mb-4 font-pokemon text-sm sm:text-base">
              Support
            </h3>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a
                  href="#"
                  className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  Shipping Info
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  Returns
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  Help Center
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-3 sm:mb-4 font-pokemon text-sm sm:text-base">
              Legal
            </h3>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a
                  href="#"
                  className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon"
                >
                  Product Experience
                </a>
              </li>
              <li>
                <div className="flex items-center space-x-1 text-red-600 text-xs sm:text-sm font-pokemon">
                  <Shield className="h-4 w-4" />
                  <span>Guaranteed Items</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
          <p className="text-white/60 text-xs sm:text-sm font-pokemon">
            © 2025 Dread&apos;s Vault. All rights reserved. • Licensed product experience platform with
            guaranteed tangible rewards.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
