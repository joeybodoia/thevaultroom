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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        console.log('Checking initial session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session:', session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkAdminStatus(session.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
        console.log('Loading set to false');
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
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