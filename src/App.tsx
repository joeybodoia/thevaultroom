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
  const { user, loading, signOut, idleWarning } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [showStreamDashboard, setShowStreamDashboard] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Timeout for loading screen
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 12000); // cap at ~12s
    return () => clearTimeout(id);
  }, []);

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

  // Listen for navigation changes
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin' && isAdmin) {
        setShowAdminPortal(true);
        setShowStreamDashboard(false);
      } else if (window.location.hash === '#stream-dashboard') {
        setShowStreamDashboard(true);
        setShowAdminPortal(false);
      } else {
        setShowAdminPortal(false);
        setShowStreamDashboard(false);
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
          {idleWarning && (
            <p className="text-xs text-red-600 font-pokemon mt-2">Session will expire soon due to inactivity.</p>
          )}
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
          <p className="text-gray-600 font-pokemon mb-2">Loading is taking longer than expected...</p>
          <p className="text-gray-800 font-pokemon mb-4">Session may be expired. Please sign in again.</p>
          <div className="flex items-center justify-center space-x-2">
            <ResetSessionButton />
            <button
              onClick={() => {
                console.log('[ui] Sign Out button (timeout screen) clicked');
                signOut('timeout-screen', { reload: true });
              }}
              className="bg-gray-200 text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all font-pokemon"
            >
              Sign Out
            </button>
          </div>
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

  // Show stream dashboard if hash is #stream-dashboard
  if (showStreamDashboard) {
    return (
      <div className="min-h-screen bg-yellow-400">
        <Header />
        <StreamDashboard />
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
