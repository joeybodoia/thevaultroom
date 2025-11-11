import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Shield, Coins } from 'lucide-react';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const Header: React.FC = () => {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'signin' | 'signup' }>({
    isOpen: false,
    mode: 'signin',
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteCredits, setSiteCredits] = useState<number>(0);
  const { user, signOut } = useAuth();

  const isLoggedIn = !!user;

  // Start "Loading..." only when a user is present
  const [loadingCredits, setLoadingCredits] = useState<boolean>(!!user);

  /** Fetch avatar + admin flag + credits for a user */
  const fetchUserRow = useCallback(
    async (userId: string) => {
      setLoadingCredits(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('avatar, is_admin, site_credit')
          .eq('id', userId)
          .single();

        if (error) throw error;

        setAvatarUrl(data?.avatar ?? null);
        setIsAdmin(!!data?.is_admin);
        setSiteCredits(Number(data?.site_credit ?? 0));
      } catch (e) {
        console.error('Error loading user row:', e);
        setAvatarUrl(null);
        setIsAdmin(false);
        setSiteCredits(0);
      } finally {
        setLoadingCredits(false);
      }
    },
    []
  );

  /** Refetch when auth user changes */
  useEffect(() => {
    if (!user?.id) {
      setAvatarUrl(null);
      setIsAdmin(false);
      setSiteCredits(0);
      setLoadingCredits(false);
      return;
    }
    fetchUserRow(user.id);
  }, [user?.id, fetchUserRow]);

  /** Auth listener as backup */
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const authedUser = session?.user;
      if (!authedUser?.id) {
        setAvatarUrl(null);
        setIsAdmin(false);
        setSiteCredits(0);
        setLoadingCredits(false);
      } else {
        fetchUserRow(authedUser.id);
      }
    });

    return () => {
      // compatibility with different supabase-js versions
      // @ts-expect-error
      sub?.subscription?.unsubscribe?.();
      sub?.unsubscribe?.();
    };
  }, [fetchUserRow]);

  /** Realtime updates to current user's row */
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('users_site_credit')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as any;
          if (next?.site_credit !== undefined) {
            setSiteCredits(Number(next.site_credit));
          }
          if (next?.avatar !== undefined) {
            setAvatarUrl(next.avatar ?? null);
          }
          if (next?.is_admin !== undefined) {
            setIsAdmin(!!next.is_admin);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  /** UI handlers */
  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthModal({ isOpen: true, mode });
    setMobileMenuOpen(false);
  };
  const closeAuthModal = () => setAuthModal({ isOpen: false, mode: 'signin' });

  const openProfileModal = () => setProfileModal(true);
  const closeProfileModal = () => setProfileModal(false);

  const handleAvatarUpdate = (newAvatarUrl: string | null) => setAvatarUrl(newAvatarUrl);

  const handleLogoClick = () => {
    if (isLoggedIn) openProfileModal();
  };

  /** Smooth scroll helper for internal sections */
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (!el) {
      window.location.hash = id;
      return;
    }
    const headerOffset = 72; // approx header height
    const rect = el.getBoundingClientRect();
    const offsetTop = rect.top + window.scrollY - headerOffset;

    window.scrollTo({
      top: offsetTop,
      behavior: 'smooth',
    });
  };

  const creditsLabel = useMemo(() => {
    if (loadingCredits) return 'Loading...';
    const amount = Number.isFinite(siteCredits) ? siteCredits : 0;
    return `$${amount.toFixed(2)} credits`;
  }, [loadingCredits, siteCredits]);

  return (
    <>
      <header className="bg-black border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className={`flex items-center space-x-2 ${
                isLoggedIn ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
              }`}
              onClick={handleLogoClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.imgur.com/5ke3mJw.png"
                alt="Dread's Vault Logo"
                className="h-8 sm:h-12 w-auto"
              />
              <span className="text-lg sm:text-xl font-bold text-white font-pokemon">
                Dread&apos;s Vault
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-white/80 hover:text-white transition-colors font-pokemon"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('bidding')}
                className="text-white/80 hover:text-white transition-colors font-pokemon"
              >
                Bidding
              </button>
              <button
                onClick={() => scrollToSection('stream-dashboard')}
                className="text-white/80 hover:text-white transition-colors font-pokemon"
              >
                Stream Dashboard
              </button>
              {/* Future feature:
              <button
                onClick={(e) => e.preventDefault()}
                className="text-white/40 cursor-not-allowed font-pokemon"
              >
                Past Streams
              </button>
              */}
              {isLoggedIn && isAdmin && (
                <a
                  href="#admin"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors font-pokemon flex items-center space-x-1"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Portal</span>
                </a>
              )}
            </nav>

            {/* Desktop Right Side */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              {isLoggedIn && (
                <div className="hidden lg:flex items-center space-x-1 text-white/80">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs lg:text-sm font-pokemon">{creditsLabel}</span>
                </div>
              )}

              {isLoggedIn && (
                <button
                  onClick={signOut}
                  className="hidden lg:block bg-gray-600 text-white px-3 py-1 rounded text-sm font-pokemon hover:bg-gray-700 transition-all"
                >
                  Force Logout
                </button>
              )}

              {isLoggedIn ? (
                <button
                  onClick={openProfileModal}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-600 to-yellow-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform border-2 border-white/20"
                  title="User Profile"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="User avatar"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-white font-bold font-pokemon text-lg">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="bg-yellow-400 text-black px-2 sm:px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-all font-pokemon text-sm sm:text-base"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => openAuthModal('signin')}
                    className="bg-red-600 text-white px-2 sm:px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all font-pokemon text-sm sm:text-base"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>

            {/* Mobile Right Side */}
            <div className="md:hidden flex items-center space-x-2">
              {isLoggedIn && (
                <button
                  onClick={openProfileModal}
                  className="w-8 h-8 bg-gradient-to-br from-red-600 to-yellow-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform border-2 border-white/20"
                  title="User Profile"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="User avatar"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-white font-bold font-pokemon text-sm">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-gray-900 border-t border-gray-700">
              <div className="px-4 py-3 space-y-3">
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="block w-full text-left text-white/80 hover:text-white transition-colors font-pokemon"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection('bidding')}
                  className="block w-full text-left text-white/80 hover:text-white transition-colors font-pokemon"
                >
                  Bidding
                </button>
                <button
                  onClick={() => scrollToSection('stream-dashboard')}
                  className="block w-full text-left text-white/80 hover:text-white transition-colors font-pokemon"
                >
                  Stream Dashboard
                </button>
                {/* Future feature:
                <button
                  onClick={(e) => e.preventDefault()}
                  className="block w-full text-left text-white/40 cursor-not-allowed font-pokemon"
                >
                  Past Streams
                </button>
                */}
                {isLoggedIn && isAdmin && (
                  <a
                    href="#admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-yellow-400 hover:text-yellow-300 transition-colors font-pokemon flex items-center space-x-1"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin Portal</span>
                  </a>
                )}

                {isLoggedIn && (
                  <div className="flex items-center space-x-1 text-white/80 pt-2 border-t border-gray-700">
                    <Coins className="h-4 w-4" />
                    <span className="text-sm font-pokemon">{creditsLabel}</span>
                  </div>
                )}

                {!isLoggedIn && (
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="flex-1 bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-all font-pokemon text-center"
                    >
                      Sign Up
                    </button>
                    <button
                      onClick={() => openAuthModal('signin')}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all font-pokemon text-center"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {isLoggedIn && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm font-pokemon hover:bg-gray-700 transition-all"
                  >
                    Force Logout
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        mode={authModal.mode}
      />

      <ProfileModal
        isOpen={profileModal && !!user}
        onClose={closeProfileModal}
        user={user!}
        currentAvatarUrl={avatarUrl}
        onAvatarUpdate={handleAvatarUpdate}
      />
    </>
  );
};

export default Header;


