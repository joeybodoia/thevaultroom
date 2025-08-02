import React from 'react';
import { Play, Mail, MessageCircle, Shield } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img 
                src="https://i.imgur.com/5ke3mJw.png" 
                alt="The Vault Room Logo" 
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold text-white font-pokemon">The Vault Room</span>
            </div>
            <p className="text-white/60 text-sm mb-4 font-pokemon">
              The premier destination for live Pokémon card opening experiences with guaranteed rewards.
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

          <div>
            <h3 className="text-white font-semibold mb-4 font-pokemon">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">How It Works</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Live Streams</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Past Results</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 font-pokemon">Support</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Contact Us</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Shipping Info</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Returns</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Help Center</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 font-pokemon">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Terms of Service</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Privacy Policy</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm font-pokemon">Product Experience</a></li>
              <li>
                <div className="flex items-center space-x-1 text-red-600 text-sm font-pokemon">
                  <Shield className="h-4 w-4" />
                  <span>Guaranteed Items</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center">
          <p className="text-white/60 text-sm font-pokemon">
            © 2025 The Vault Room. All rights reserved. • Licensed product experience platform with guaranteed tangible rewards.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;