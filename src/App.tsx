import React from 'react';
import HeroBanner from './components/HeroBanner';
import HowItWorks from './components/HowItWorks';
import StreamCountdown from './components/StreamCountdown';
import CurrentSetSection from './components/CurrentSetSection';
import PokemonSection from './components/PokemonSection';
import StreamDashboard from './components/StreamDashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminPortal from './components/AdminPortal';
import ResetSessionButton from './components/ResetSessionButton';
import { useAuth } from './auth/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Timeout for loading screen
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 5000) // don't spin forever
    return () => clearTimeout(id)
  }, [])

  // Check admin status when user changes
  useEffect(() => {
    if (user) {
      checkAdminStatus(user.id);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single();

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

  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-pokemon">Loading...</p>
          <div className="mt-4">
            <ResetSessionButton />
          </div>
        </div>
      </div>
    );
  }

  if (loading && timedOut) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-pokemon mb-4">Loading is taking longer than expected...</p>
          <ResetSessionButton />
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
        <StreamDashboard />
      </main>
      <Footer />
    </div>
  );
}

export default App;