import React from 'react';
import { useState, useEffect } from 'react';
import { Play, Users, Trophy } from 'lucide-react';
import WalletButton from './WalletButton';
import AuthModal from './AuthModal';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const Header: React.FC = () => {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'signin' | 'signup' }>({
    isOpen: false,
    mode: 'signin'
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN') {
          closeAuthModal();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthModal({ isOpen: true, mode });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, mode: 'signin' });
  };

  const handleAvatarClick = () => {
    // TODO: Open user menu/profile
    console.log('Avatar clicked');
  };
  return (
    <>
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
            {!loading && (
              user ? (
                <button
                  onClick={handleAvatarClick}
                  className="w-10 h-10 bg-gradient-to-br from-red-600 to-yellow-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform border-2 border-white/20"
                  title="User Profile"
                >
                  <span className="text-white font-bold font-pokemon text-lg">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => openAuthModal('signup')}
                    className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-all font-pokemon"
                  >
                    Sign Up
                  </button>
                  <button 
                    onClick={() => openAuthModal('signin')}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all font-pokemon"
                  >
                    Sign In
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </div>
      </header>
      
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        mode={authModal.mode}
      />
    </>
  );
};

export default Header;