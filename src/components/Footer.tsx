import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, MessageCircle, Shield, X } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShippingPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReturnsPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProductExperienceModalProps {
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

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-black border border-yellow-400 max-w-4xl w-full mx-4 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <p className="text-[10px] sm:text-xs text-white/60 font-pokemon uppercase tracking-[0.1em]">
              Privacy Policy
            </p>
            <h2 className="text-white font-pokemon text-base sm:text-lg font-semibold">
              Dread’s Vault — Privacy Policy
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Close Privacy Policy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto text-white/80 text-[11px] sm:text-sm font-pokemon space-y-5 leading-relaxed">
          <div className="space-y-2 text-white">
            <span className="block text-xs sm:text-sm text-white/70">Business Name: Dread’s Vault</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-yellow-300">
              Last Updated: December 2, 2025
            </span>
          </div>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">1. Introduction</h3>
            <p>
              Dread’s Vault ("Company," "we," "our," or "us") provides a livestream event platform and related
              services accessible to registered users. This Privacy Policy explains how we collect, use, disclose,
              and safeguard personal information when users access or use our website, platform, or create an account.
            </p>
            <p>By using Dread’s Vault, you acknowledge and agree to the practices described in this Privacy Policy.</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-white font-semibold text-sm sm:text-base">2. Information We Collect</h3>

            <div className="space-y-2">
              <h4 className="text-white font-semibold text-xs sm:text-sm">A. Information You Provide to Us</h4>
              <p>We collect personal data when you create an account, make payments, or participate in livestream events, including:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Email address</li>
                <li>Shipping address</li>
                <li>Username and login credentials</li>
                <li>Payment information (processed securely by third-party providers)</li>
              </ul>
              <p className="text-white/70 text-xs sm:text-sm">We do not store full credit card numbers or sensitive payment credentials.</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-semibold text-xs sm:text-sm">B. Information Collected Automatically</h4>
              <p>We may automatically collect non-identifying technical data for operational and security purposes, including:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>IP address</li>
                <li>Browser type</li>
                <li>Device information</li>
              </ul>
              <p className="text-white/70 text-xs sm:text-sm">This information is not used for analytics or marketing purposes.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">3. How We Use Personal Information</h3>
            <p>We may use personal information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>To create, maintain, and secure user accounts</li>
              <li>To process entry fees and validate participation in livestream events</li>
              <li>To ship items, prizes, or products to participants</li>
              <li>To support operational needs, including fraud prevention and service security</li>
              <li>To respond to customer inquiries or support requests</li>
            </ul>
            <p>We do not use personal information for advertising, remarketing, or promotional outreach.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">4. Payment Processing</h3>
            <p>
              Payments made through Dread’s Vault are processed by trusted third-party payment services such as PayPal,
              Stripe, or similar providers. These companies may collect and store personal and financial information
              needed to complete transactions. We do not store or access full payment card details.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-white font-semibold text-sm sm:text-base">5. Sharing and Disclosure of Information</h3>
            <p>We do not sell or rent personal information. We may share information only with trusted entities necessary to operate the service, including:</p>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-2 bg-white/5 text-white text-xs sm:text-sm font-semibold font-pokemon">
                <div className="px-3 py-2 border-r border-white/10">Third-Party Type</div>
                <div className="px-3 py-2">Purpose</div>
              </div>
              <div className="divide-y divide-white/10 text-white/80 text-xs sm:text-sm">
                <div className="grid grid-cols-2">
                  <div className="px-3 py-2 border-r border-white/10">Payment processors</div>
                  <div className="px-3 py-2">Payment verification and transactions</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="px-3 py-2 border-r border-white/10">Shipping providers</div>
                  <div className="px-3 py-2">Order fulfillment and delivery</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="px-3 py-2 border-r border-white/10">Cloud hosting and database providers</div>
                  <div className="px-3 py-2">Secure data storage</div>
                </div>
              </div>
            </div>
            <p>We may also disclose information if required by law, legal process, or to protect the rights and safety of users or the platform.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">6. Cookies and Tracking Technologies</h3>
            <p>We use essential cookies only, for purposes such as:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Keeping users logged into their accounts</li>
              <li>Securing user sessions</li>
            </ul>
            <p className="mt-1">We do not use:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Advertising cookies</li>
              <li>Analytics tracking</li>
              <li>Behavioral tracking tools</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">7. Data Retention</h3>
            <p>We retain personal information only as long as necessary to:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Maintain an active user account</li>
              <li>Fulfill operational, shipping, or transaction requirements</li>
              <li>Meet legal, tax, or administrative obligations</li>
            </ul>
            <p>Users may request deletion of their account and associated information, subject to legal retention requirements.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">8. Data Security</h3>
            <p>
              We implement reasonable and industry-standard administrative, physical, and technical measures to protect stored personal
              information. However, no transmission of data online can be guaranteed to be 100% secure, and users acknowledge this risk.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">9. User Rights</h3>
            <p>Users have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Request access to their personal information</li>
              <li>Request correction or updates to stored information</li>
              <li>Request deletion of their account and personal data (unless retention is legally required)</li>
            </ul>
            <p className="text-white/80">Requests may be submitted to: 📧 dpr@dreadsvault.com</p>
            <p className="text-white/70 text-xs sm:text-sm">We may verify identity before fulfilling requests.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">10. Children’s Privacy</h3>
            <p>
              Dread’s Vault is not intended for children under 13 years of age. We do not knowingly collect personal information from
              children under 13. If such information is discovered, it will be deleted.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">11. Changes to This Privacy Policy</h3>
            <p>
              We may update this Privacy Policy from time to time. When changes occur, the “Last Updated” date at the top of this document
              will be updated. Continued use of the platform indicates acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">12. Contact Information</h3>
            <p>If you have any questions, concerns, or privacy requests, you may contact us at:</p>
            <p className="font-semibold text-white">Email: dpr@dreadsvault.com</p>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-black border border-yellow-400 max-w-md w-full mx-4 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <p className="text-[10px] sm:text-xs text-white/60 font-pokemon uppercase tracking-[0.1em]">
              Contact Us
            </p>
            <h2 className="text-white font-pokemon text-base sm:text-lg font-semibold">
              We&apos;re here to help
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Close Contact modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto text-white/80 text-[11px] sm:text-sm font-pokemon space-y-3 leading-relaxed">
          <p>
            Questions, requests, or feedback? Email us anytime and we&apos;ll get back as soon as we can.
          </p>
          <div className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/40 text-yellow-200 font-semibold">
            <Mail className="h-4 w-4" />
            <span>dpr@dreadsvault.com</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ShippingPolicyModal: React.FC<ShippingPolicyModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-black border border-yellow-400 max-w-3xl w-full mx-4 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <p className="text-[10px] sm:text-xs text-white/60 font-pokemon uppercase tracking-[0.1em]">
              Shipping Policy
            </p>
            <h2 className="text-white font-pokemon text-base sm:text-lg font-semibold">Shipping Policy</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Close Shipping Policy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto text-white/80 text-[11px] sm:text-sm font-pokemon space-y-4 leading-relaxed">
          <p>
            All items won or purchased through Dread’s Vault live events are processed and shipped within 5 business
            days unless otherwise stated. Processing time refers to the period required to prepare items for shipment
            and does not include carrier transit time.
          </p>

          <section className="space-y-1">
            <h3 className="text-white font-semibold text-sm sm:text-base">Packaging</h3>
            <p>
              We understand the importance of protecting collectible and trading card products. All shipments are packed
              with care using protective materials to help ensure items arrive in the same condition they were received
              during the live event.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-white font-semibold text-sm sm:text-base">Shipping Methods</h3>
            <p>
              Orders are shipped using USPS, UPS, or other commonly used carriers depending on package requirements and
              destination. Carrier transit time is separate from our internal processing period and may vary.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-white font-semibold text-sm sm:text-base">Tracking</h3>
            <p>
              Tracking information will be provided whenever applicable and available. Some small items may be shipped
              without tracking depending on shipping method and packaging requirements.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-white font-semibold text-sm sm:text-base">Address Accuracy</h3>
            <p>
              Customers are responsible for providing a complete and accurate shipping address at checkout or during
              account setup. Dread’s Vault is not responsible for packages shipped to an incorrect or incomplete address
              provided by the customer.
            </p>
            <p>
              If a shipment is returned to us due to an invalid address or delivery failure, the customer may be charged
              additional shipping fees to resend the package.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-white font-semibold text-sm sm:text-base">Lost, Stolen, or Delayed Packages</h3>
            <p>
              Once a shipment has been transferred to the carrier, responsibility for delivery rests with the carrier.
              Dread’s Vault is not liable for packages lost, stolen, delayed, or damaged while in transit.
            </p>
            <p>
              If a package appears lost or delayed, we encourage customers to open a claim with the carrier. We will
              assist where reasonable but cannot guarantee refunds, replacements, or compensation.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-white font-semibold text-sm sm:text-base">International Shipping</h3>
            <p>
              At this time, we do not support international shipping. Orders are only shipped to locations within the
              United States and Puerto Rico. Any order placed with an address outside these supported regions may be
              canceled or require a valid U.S. forwarding address before fulfillment.
            </p>
            <p>By participating in events or making a purchase through Dread’s Vault, you acknowledge and agree to this Shipping Policy.</p>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ReturnsPolicyModal: React.FC<ReturnsPolicyModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-black border border-yellow-400 max-w-3xl w-full mx-4 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <p className="text-[10px] sm:text-xs text-white/60 font-pokemon uppercase tracking-[0.1em]">
              Returns Policy
            </p>
            <h2 className="text-white font-pokemon text-base sm:text-lg font-semibold">
              Return &amp; Issue Resolution Policy
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Close Returns Policy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto text-white/80 text-[11px] sm:text-sm font-pokemon space-y-4 leading-relaxed">
          <p>
            Given that participation in our live events involves a paid entry fee and the potential to win items such as
            trading cards, collectibles, or other rewards based on event outcomes, all sales and winnings are considered
            final and non-refundable.
          </p>
          <p>
            Once an entry is confirmed or an event concludes, we are unable to offer returns, refunds, or exchanges for
            participation fees or any item(s) awarded during the event.
          </p>
          <p>
            However, we take customer experience seriously. If you believe there is an issue with an item you received—such as
            shipping damage, fulfillment errors, or quality concerns—you may contact us at:
          </p>

          <div className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/40 text-yellow-200 font-semibold">
            <Mail className="h-4 w-4" />
            <span>dpr@dreadsvault.com</span>
          </div>

          <div className="space-y-1">
            <p>Please include the following when reaching out:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Full name</li>
              <li>Order or event reference (if applicable)</li>
              <li>Brief description of the issue</li>
              <li>Photos or supporting evidence (if applicable)</li>
            </ul>
          </div>

          <p>
            We will review concerns on a case-by-case basis at our sole discretion. Submission of a request does not
            guarantee replacement, refund, or compensation.
          </p>
          <p>
            Our goal is to maintain a fair, enjoyable, and transparent experience for all participants while also protecting
            the integrity of our event-based structure.
          </p>
          <p>
            By participating in any event or transaction with Dread’s Vault, you acknowledge and agree to the terms of this
            Return Policy.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ProductExperienceModal: React.FC<ProductExperienceModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-black border border-yellow-400 max-w-4xl w-full mx-4 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <p className="text-[10px] sm:text-xs text-white/60 font-pokemon uppercase tracking-[0.1em]">
              Product Experience
            </p>
            <h2 className="text-white font-pokemon text-base sm:text-lg font-semibold">
              Product Experience Overview
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Close Product Experience"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto text-white/80 text-[11px] sm:text-sm font-pokemon space-y-5 leading-relaxed">
          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">Scheduling &amp; Communication</h3>
            <p>
              All scheduling updates, announcements, and community communication take place in the Dread’s Vault Discord
              Community. This community hub serves as the central location for:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Official upcoming stream dates &amp; times</li>
              <li>Event announcements and reminders</li>
              <li>User questions, feedback, and suggestions</li>
              <li>General support and communication from the Dread’s Vault team</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">Community Driven Approach</h3>
            <p>
              Dread’s Vault is designed to be a truly community-driven project. We actively welcome and encourage user
              feedback, ideas, and suggestions to help shape and continuously improve the platform. Our goal is to deliver
              the best possible experience for our users, and we are committed to adapting and making changes based on the
              consensus and input of the community. Your voice directly influences how the platform evolves.
            </p>
            <p>Joining the Discord community ensures users remain fully informed and up-to-date with all product and event timelines.</p>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-white font-semibold text-sm sm:text-base">Streaming Event Format &amp; Rules</h3>
            </div>

            <div className="space-y-1">
              <h4 className="text-white font-semibold text-xs sm:text-sm">Scheduling</h4>
              <p>
                As noted above, all upcoming stream dates and times are announced within the Discord community. On the day of an
                event, users may join the live stream up to 15 minutes before the official start time. This window allows users to
                prepare, ask questions and get familiar with the event interface before bidding periods begin.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-white font-semibold text-xs sm:text-sm">Entry Fee</h4>
              <p>Access to the interactive features of the stream requires a $5 entry fee.</p>
              <p>
                Upon entry, each user receives 100 site credits. These credits may be strategically allocated across any of the
                three event mechanics:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Chase Slot Bidding</li>
                <li>Lottery Entries</li>
                <li>Live Singles Bidding</li>
              </ol>
              <p>Users may choose how to allocate their credits throughout the event based on their preferred strategies.</p>
            </div>

            <div className="space-y-1">
              <h4 className="text-white font-semibold text-xs sm:text-sm">Event Structure</h4>
              <p>Each streaming event consists of three rounds, and each round follows the same structure:</p>
              <ol className="list-decimal list-inside space-y-2 pl-1">
                <li>
                  <strong>Bidding Period</strong>
                  <p className="mt-1">
                    Before the round begins, users may spend their site credits to place bids for any of the three event mechanics.
                    Once bidding closes, no additional entries for that round will be accepted.
                  </p>
                </li>
                <li>
                  <strong>Pack Opening</strong>
                  <p className="mt-1">
                    Each round features the opening of 10 sealed Pokémon booster packs from a predetermined set (e.g., Prismatic
                    Evolutions).
                  </p>
                </li>
                <li>
                  <strong>Winner Announcements</strong>
                  <p className="mt-1">
                    After all packs are opened, winners for the round—across all three mechanics—are determined and announced based
                    on outcomes of the pulls.
                  </p>
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-semibold text-xs sm:text-sm">Event Features / Mechanics</h4>

              <div className="space-y-2">
                <p className="font-semibold text-white">1. Chase Slots</p>
                <p>Chase slots represent high-value or highly desirable cards from the round’s selected set.</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Users bid credits against each other for the rights to a specific chase slot.</li>
                  <li>The highest bidder wins the slot and obtains exclusive rights to that card if it appears in any pack opened during the round.</li>
                </ul>
                <p className="text-white/80">Example:</p>
                <p>
                  A user wins the chase slot for Umbreon ex in a Prismatic Evolutions round. If Umbreon ex appears in any of the 10
                  packs opened during the round, that user receives the card—no matter what other mechanics occur.
                </p>
                <p className="font-semibold text-white">Priority Rule:</p>
                <p>
                  Chase slot winners always have priority over lottery winners. If a lottery winner wins a pack that contains a chase
                  slot card, the chase slot card is removed from the pack and awarded to the chase slot winner. The remaining contents
                  of that pack are awarded to the lottery winner.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-white">2. Lottery</p>
                <p>
                  Each individual pack within a round offers a separate lottery opportunity. Users may allocate credits to enter a
                  pack-specific lottery by selecting a rarity type (e.g., SIR, IR, Ultra Rare, etc.).
                </p>
                <p>When the pack is opened:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>If a card matching the user’s selected rarity type is pulled, all users who selected that rarity enter the prize pool for that pack.</li>
                  <li>A winner is then selected at random from this prize pool.</li>
                  <li>The winner receives all cards from that pack, excluding any chase slot cards, which always go to their respective chase slot winners.</li>
                </ul>
                <p className="font-semibold text-white">Tie-Breakers (Multiple Rarity Hits in a Single Pack)</p>
                <p>
                  If a pack contains more than one qualifying rarity type, a rarity precedence rule determines which rarity sets the
                  prize pool. The rarity with the lowest odds (i.e., the rarest hit) always takes precedence. This ensures consistency
                  and prevents multiple overlapping prize pools.
                </p>
                <p className="font-semibold text-white">Rarity Precedence Tables</p>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-white">Prismatic Evolutions</p>
                    <ol className="list-decimal list-inside pl-1 space-y-1">
                      <li>SIR</li>
                      <li>Masterball</li>
                      <li>Ultra Rare</li>
                      <li>Pokeball</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Crown Zenith</p>
                    <ol className="list-decimal list-inside pl-1 space-y-1">
                      <li>Secret Rare</li>
                      <li>Ultra Rare (Non GG)</li>
                      <li>Ultra Rare (GG)</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Destined Rivals</p>
                    <ol className="list-decimal list-inside pl-1 space-y-1">
                      <li>SIR / Hyper Rare</li>
                      <li>IR</li>
                      <li>Ultra Rare / Double Rare</li>
                    </ol>
                  </div>
                </div>
                <p className="font-semibold text-white">Tie-Breaker Example</p>
                <p>
                  If a pack from Prismatic Evolutions contains both an SIR card and a Masterball card: SIR is the rarest hit. Therefore,
                  SIR sets the prize pool for that pack. Only users who entered the lottery for SIR are included in the random drawing.
                  The selected winner receives all cards in the pack (minus any chase slot cards). This tie-breaker system ensures
                  fairness and rewards users who choose the rarest—yet highest-risk—rarity types.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-white">3. Live Singles</p>
                <p>Live Singles are individual cards from the host’s personal collection.</p>
                <p>Key characteristics:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Bidding for Live Singles is open for the entire duration of the stream.</li>
                  <li>Users may place bids at any time up until the closing window.</li>
                  <li>A final 5-minute countdown will be announced before bidding closes.</li>
                  <li>During the countdown, a visible timer will appear within the site interface.</li>
                </ul>
                <p>The highest bidder at closing wins the selected single.</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-semibold text-sm sm:text-base">Caveats &amp; Important Nuances</h3>
            <div className="space-y-2">
              <p className="font-semibold text-white">1. Chase Slot Priority:</p>
              <p>
                Chase slot winners always receive the chase slot card, even if the pack is won by a lottery participant. This ensures
                clarity, fairness, and consistency.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">2. Credit Allocation Strategy:</p>
              <p>
                Credits must be allocated carefully. Unused credits at the end of a round do not backdate entries or affect previous
                outcomes. Users may distribute their 100 credits across mechanics in any way that best supports their strategy.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">3. Transparency of Odds:</p>
              <p>Lottery outcomes are determined strictly by the rarity pulled within each pack and the number of users who selected that rarity type.</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">4. Fair Play &amp; System Integrity:</p>
              <p>
                All randomizations (e.g., lottery winner selection) are handled programmatically to maintain fairness and consistency.
                All bids and entries are final once the bidding periods close.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">5. Communication &amp; Support:</p>
              <p>Any event clarifications, technical issues, or concerns can be addressed directly through the Dread’s Vault Discord community.</p>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};

const Footer: React.FC = () => {
  const [isTosOpen, setIsTosOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isReturnsOpen, setIsReturnsOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);

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
                  alt="dread's vault logo"
                  className="h-8 sm:h-10 w-auto"
                />
                <span className="text-lg sm:text-xl font-bold text-white font-pokemon">
                  dread&apos;s vault
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
                <li>
                  <button
                    type="button"
                    onClick={() => setIsContactOpen(true)}
                    className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon underline-offset-2 hover:underline"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsShippingOpen(true)}
                    className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon underline-offset-2 hover:underline"
                  >
                    Shipping Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsReturnsOpen(true)}
                    className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon underline-offset-2 hover:underline"
                  >
                    Returns Policy
                  </button>
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
                  <button
                    type="button"
                    onClick={() => setIsTosOpen(true)}
                    className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon underline-offset-2 hover:underline"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsPrivacyOpen(true)}
                    className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon underline-offset-2 hover:underline"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsProductOpen(true)}
                    className="w-full text-left text-white/60 hover:text-white transition-colors text-xs sm:text-sm font-pokemon underline-offset-2 hover:underline"
                  >
                    Product Experience
                  </button>
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
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      <ShippingPolicyModal isOpen={isShippingOpen} onClose={() => setIsShippingOpen(false)} />
      <ReturnsPolicyModal isOpen={isReturnsOpen} onClose={() => setIsReturnsOpen(false)} />
      <ProductExperienceModal isOpen={isProductOpen} onClose={() => setIsProductOpen(false)} />
    </>
  );
};

export default Footer;
