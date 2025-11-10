import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, MessageCircle, Shield, X } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);

  // Mark as mounted so we know `document` exists (avoids SSR mismatch issues)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock/unlock body scroll while modal is open
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // If not ready or not open, render nothing (hooks above still ran safely)
  if (!isOpen || !mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-black border border-red-600 max-w-3xl w-full mx-4 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-pokemon text-xs sm:text-sm md:text-base">
            Credits, Participation, and Legal Compliance Policy
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Close Terms of Service"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[70vh] overflow-y-auto text-white/70 text-[10px] sm:text-xs md:text-sm font-pokemon space-y-3 leading-relaxed">
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

          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">2. Credit Allocation</h3>
            <p>
              Upon paying the entry fee, each participant (“User”) receives a fixed number of virtual credits
              (“Credits”) associated with their account for that Stream. All Users receive an amount of Credits
              sufficient to participate in every available random or lottery-based drawing within the Stream.
              Credits are non-transferable, hold no cash or monetary value, and cannot be purchased, sold,
              redeemed, exchanged, or withdrawn under any circumstances.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">
              3. Equal Chance and Non-Gambling Framework
            </h3>
            <p>
              All Users are guaranteed an equal opportunity to participate in and win random pack or
              lottery-based outcomes. No User can purchase or otherwise obtain additional entries, spins, or
              chances in any random event. Credits cannot be used to increase odds of winning beyond the number
              of lottery entries provided equally to all participants. Any surplus or bonus Credits can only be
              used for non-random or skill-based features, such as bidding on known items, cosmetic profile
              enhancements, or other non-luck-based activities.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">
              4. Rollover and Bonus Credits
            </h3>
            <p>
              Users may retain unused Credits between Streams (“Rollover Credits”). Rollover Credits may be
              used in future Streams only for non-randomized features (e.g., Live Singles bidding, cosmetic
              items, or other optional interactivity). Rollover Credits do not increase a User’s odds in any
              random drawing and may not be exchanged for money or value. Promotional or marketing Credits
              (“Bonus Credits”) may be issued at the Company’s discretion for limited-time campaigns, referrals,
              or loyalty rewards. Bonus Credits are non-purchasable, non-redeemable, and do not alter or enhance
              odds of winning in any random event.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">5. Nature of Credits</h3>
            <p>
              Credits are a utility feature that facilitates in-platform interaction and entertainment.
              They are not a currency, token, investment, or financial instrument. Users understand and agree
              that Credits have no monetary or stored value and that all gameplay, lotteries, and bidding
              features are for entertainment purposes only.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">
              6. Fairness and Randomization
            </h3>
            <p>
              All random elements (e.g., pack openings, lotteries) are conducted under a fair, transparent
              process and audited to ensure randomness and integrity. The number of random draws and the
              maximum Credit cost per draw are fixed for each Stream, ensuring all participants have equal
              opportunity regardless of Credit balance or previous participation.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">
              7. Skill-Based and Non-Random Features
            </h3>
            <p>
              Features such as Chase Slot bidding and Live Singles are skill-based and determined solely by
              user actions, timing, and bidding strategy. They are not chance-based or probabilistic events.
              Participation in such features does not affect or depend on the outcome of any random element
              of the Stream.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">
              8. No Gambling Relationship
            </h3>
            <p>
              The Company does not operate a game of chance, sweepstakes, lottery, or wagering service.
              All activities within each Stream are designed as skill-based or fixed-participation
              entertainment experiences, with a guaranteed equal-chance framework for all random events.
              The entry fee grants access to the experience, not to any probabilistic stake or financial
              return. Prizes (including cards or other physical items) are awarded as fixed collectibles,
              not as monetary winnings.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm mb-1">
              9. Legal Acknowledgment
            </h3>
            <p>
              By participating, each User acknowledges and agrees that:
              (a) Credits are not and will never be redeemable for money or digital currency;
              (b) All Users are granted equal participation in random events;
              (c) The system prevents unequal odds based on Credit quantity; and
              (d) The platform is structured to comply with all applicable contest, sweepstakes, and
              promotional laws.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

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
                Dread’s Vault streams are entertainment events only.
                Participation requires a fixed entry fee and provides equal access to all random features.
                Credits have no cash value, cannot be purchased or exchanged, and do not affect odds of winning.
                This platform does not offer gambling, betting, or sweepstakes of any kind.
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
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
            <p className="text-white/60 text-xs sm:text-sm font-pokemon">
              © 2025 Dread&apos;s Vault. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <TermsOfServiceModal isOpen={isTosOpen} onClose={() => setIsTosOpen(false)} />
    </>
  );
};

export default Footer;



