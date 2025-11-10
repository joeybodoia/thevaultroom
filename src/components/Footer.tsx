import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle, Shield, X } from 'lucide-react';

const Footer: React.FC = () => {
  const [isTosOpen, setIsTosOpen] = useState(false);

  /** Smooth scroll helper (matches Header.tsx) */
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) {
      window.location.hash = id;
      return;
    }
    const headerOffset = 72;
    const rect = el.getBoundingClientRect();
    const offsetTop = rect.top + window.scrollY - headerOffset;
    window.scrollTo({ top: offsetTop, behavior: 'smooth' });
  };

  /** Lock background scroll + ensure modal stays visually centered */
  useEffect(() => {
    if (isTosOpen) {
      window.scrollTo({ top: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isTosOpen]);

  return (
    <>
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
                Dread’s Vault streams are entertainment events only. Participation requires a fixed
                entry fee and provides equal access to all random features. Credits have no cash
                value, cannot be purchased or exchanged, and do not affect odds of winning. This
                platform does not offer gambling, betting, or sweepstakes of any kind.
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
                <li><a href="#" className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon">Contact Us</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon">Shipping Info</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon">Returns</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon">Help Center</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-semibold mb-3 sm:mb-4 font-pokemon text-sm sm:text-base">
                Legal
              </h3>
              <ul className="space-y-1 sm:space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setIsTosOpen(true)}
                    className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon underline-offset-2 hover:underline"
                  >
                    Terms of Service
                  </button>
                </li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon">Privacy Policy</a></li>
                <li><a href="#" className="text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon">Product Experience</a></li>
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
              © 2025 Dread&apos;s Vault. All rights reserved. • Licensed product experience platform with guaranteed tangible rewards.
            </p>
          </div>
        </div>
      </footer>

      {/* Terms of Service Modal */}
      {isTosOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsTosOpen(false)}
        >
          <div
            className="bg-black border border-red-600 max-w-3xl w-full mx-4 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-white font-pokemon text-xs sm:text-sm md:text-base">
                Credits, Participation, and Legal Compliance Policy
              </h2>
              <button
                onClick={() => setIsTosOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-1"
                aria-label="Close Terms of Service"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 max-h-[70vh] overflow-y-auto text-white/70 text-[10px] sm:text-xs md:text-sm font-pokemon space-y-3 leading-relaxed">
              {/* ... (same ToS text as before) ... */}
              <div>
                <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">
                  1. Fixed Entry Fee and Participation Rights
                </h3>
                <p>
                  Each live stream event (“Stream”) requires a fixed entry fee payable before participation.
                  This entry fee grants access to all entertainment features within that specific Stream,
                  including lotteries, live singles, chase slots, and any other interactive components.
                  Payment of the entry fee does not constitute a wager or bet, but rather a one-time admission
                  fee for participation in a structured entertainment experience.
                </p>
              </div>
              {/* [Remaining ToS paragraphs unchanged for brevity] */}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;



