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
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);

  // Force logout function
  const forceLogout = async () => {
    console.log('Force logout initiated...');
    try {
      // Clear local state immediately
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      
      // Clear any stored session data
      localStorage.removeItem('sb-bzqnxgohxamuqgyrjwls-auth-token');
      sessionStorage.clear();
      
      // Try to sign out from Supabase (but don't wait for it)
      supabase.auth.signOut().catch(err => {
        console.log('Server signout failed (expected for stale tokens):', err.message);
      });
      
      console.log('Force logout completed');
    } catch (error) {
      console.error('Force logout error:', error);
      // Force local logout even if server call fails
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  // Auto-logout after 1 hour
  useEffect(() => {
    let logoutTimer: NodeJS.Timeout;
    
    if (user) {
      // Set timer for 1 hour (3600000 ms)
      logoutTimer = setTimeout(() => {
        console.log('Auto-logout due to 1 hour timeout');
        forceLogout();
      }, 60 * 60 * 1000); // 1 hour
    }

    return () => {
      if (logoutTimer) {
        clearTimeout(logoutTimer);
      }
    };
  }, [user]);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        console.log('Checking initial session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session:', session);
        
        if (session?.user) {
          // Check if token is expired or will expire soon (within 5 minutes)
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const fiveMinutesFromNow = now + (5 * 60);
          
          if (expiresAt && expiresAt < fiveMinutesFromNow) {
            console.log('Token expired or expiring soon, forcing logout');
            await forceLogout();
            return;
          }
          
          setUser(session.user);
          try {
            await checkAdminStatus(session.user.id);
          } catch (error) {
            console.error('Error checking admin status, forcing logout:', error);
            await forceLogout();
            return;
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        console.log('Session error, forcing logout');
        await forceLogout();
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
        
        if (session?.user) {
          setUser(session.user);
          try {
            await checkAdminStatus(session.user.id);
          } catch (error) {
            console.error('Error in auth state change, forcing logout:', error);
            await forceLogout();
          }
        } else {
          setUser(null);
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
      throw error; // Re-throw to trigger logout in calling function
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
    <div className="min-h-screen bg-white bolt-scale-fix">
      <Header />
      <main>
        <HeroBanner />
        <HowItWorks />
        <StreamCountdown onStreamChange={setCurrentStreamId} />
        <CurrentSetSection />
        <PokemonSection currentStreamId={currentStreamId} />
      </main>
      <Footer />
    </div>
  );
}

export default App;