import React from 'react';
import { Play, Users, Trophy } from 'lucide-react';
import WalletButton from './WalletButton';

const Header: React.FC = () => {
  return (
    <header className="bg-black border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <img 
              src="https://i.imgur.com/5ke3mJw.png" 
              alt="The Vault Room Logo" 
              className="h-12 w-auto"
            />
            <span className="text-xl font-bold text-white font-pokemon">The Vault Room</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors font-pokemon">
              How It Works
            </a>
            <a href="#bidding" className="text-white/80 hover:text-white transition-colors font-pokemon">
              Bidding
            </a>
            <a href="#" className="text-white/80 hover:text-white transition-colors font-pokemon">
              Past Streams
            </a>
          </nav>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-white/80">
              <Users className="h-4 w-4" />
              <span className="text-sm font-pokemon">1,247 online</span>
            </div>
            <WalletButton />
            <button className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-all font-pokemon">
              Sign Up
            </button>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all font-pokemon">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;