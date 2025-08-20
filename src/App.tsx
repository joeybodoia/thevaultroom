import React from 'react';
import { useState, useEffect } from 'react';
import HeroBanner from './components/HeroBanner';
import HowItWorks from './components/HowItWorks';
import StreamCountdown from './components/StreamCountdown';
import CurrentSetSection from './components/CurrentSetSection';
import PokemonSection from './components/PokemonSection';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminPortal from './components/AdminPortal';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Force logout and clear all auth state
    console.log('Force clearing auth state...');
    setUser(null);
    setIsAdmin(false);
    setShowAdminPortal(false);
    setLoading(false);
    
    // Clear any stored session data
    localStorage.removeItem('sb-bzqnxgohxamuqgyrjwls-auth-token');
    sessionStorage.clear();
    
    // Try to sign out from Supabase (but don't wait for it)
    supabase.auth.signOut().catch(err => {
      console.log('Server signout failed (expected):', err.message);
    });
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      console.log('Checking admin status for user:', userId);
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single();

      console.log('Admin status result:', userData);
      setIsAdmin(userData?.is_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Listen for admin portal navigation
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin' && isAdmin) {
        setShowAdminPortal(true);
      } else {
        setShowAdminPortal(false);
      }
    };

    handleHashChange(); // Check initial hash
    window.addEventListener('hashchange', handleHashChange);
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-pokemon">Loading...</p>
        </div>
      </div>
    );
  }

  // Show admin portal if user is admin and hash is #admin
  if (showAdminPortal && isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AdminPortal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroBanner />
        <HowItWorks />
        <StreamCountdown />
        <CurrentSetSection />
        <PokemonSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;