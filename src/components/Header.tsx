import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Shield, Coins } from 'lucide-react';
import WalletButton from './WalletButton';
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

  // Single fetch for avatar, admin, and credits
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

  // Refetch whenever the authenticated user changes
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

  // Auth listener (helps if your context updates slightly later or you want belt & suspenders)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const authedUser = session?.user;
      if (!authedUser?.id) {
        setAvatarUrl(null);
        setIsAdmin(false);
        setSiteCredits(0);
        setLoadingCredits(false);
      } else {
        // Either rely on the [user?.id] effect, or fetch directly here:
        fetchUserRow(authedUser.id);
      }
    });

    return () => {
      // @ts-expect-error - older supabase-js typing differs
      sub?.subscription?.unsubscribe?.();
      // v2 style:
      sub?.unsubscribe?.();
    };
  }, [fetchUserRow]);

  // Realtime updates to credits for the current user
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('users_site_credit')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload) => {
          const nextCredits = (payload.new as any)?.site_credit;
          if (nextCredits !== undefined) {
            setSiteCredits(Number(nextCredits));
          }
          const nextAvatar = (payload.new as any)?.avatar;
          if (nextAvatar !== undefined) {
            setAvatarUrl(nextAvatar ?? null);
          }
          const nextAdmin = (payload.new as any)?.is_admin;
          if (nextAdmin !== undefined) {
            setIsAdmin(!!nextAdmin);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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

  const creditsLabel = useMemo(() => {
    if (loadingCredits) return 'Loading...';
    // guard against NaN just in case
    const amount = Number.isFinite(siteCredits) ? siteCredits : 0;
    return `$${amount.toFixed(2)} credits`;
  }, [loadingCredits, siteCredits]);

  return (
    <>
      <header className="bg-black border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div
              className={`flex items-center space-x-2 ${
                isLoggedIn ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
              }`}
              onClick={handleLogoClick}
            >
              <img
                src="https://i.imgur.com/5ke3mJw.png"
                alt="Dread's Vault Logo"
                className="h-8 sm:h-12 w-auto"
              />
              <span className="text-lg sm:text-xl font-bold text-white font-pokemon">Dread&apos;s Vault</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors font-pokemon">
                How It Works
              </a>
              <a href="#bidding" className="text-white/80 hover:text-white transition-colors font-pokemon">
                Bidding
              </a>
              <a href="#" className="text-white/80 hover:text-white transition-colors font-pokemon">
                Past Streams
              </a>
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

              <WalletButton />

              {isLoggedIn ? (
                <button
                  onClick={openProfileModal}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-600 to-yellow-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform border-2 border-white/20"
                  title="User Profile"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User avatar" className="w-full h-full object-cover rounded-full" />
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

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              {isLoggedIn ? (
                <button
                  onClick={openProfileModal}
                  className="w-8 h-8 bg-gradient-to-br from-red-600 to-yellow-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform border-2 border-white/20"
                  title="User Profile"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white font-bold font-pokemon text-sm">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </button>
              ) : null}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-gray-900 border-t border-gray-700">
              <div className="px-4 py-3 space-y-3">
                <a href="#how-it-works" className="block text-white/80 hover:text-white transition-colors font-pokemon">
                  How It Works
                </a>
                <a href="#bidding" className="block text-white/80 hover:text-white transition-colors font-pokemon">
                  Bidding
                </a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors font-pokemon">
                  Past Streams
                </a>
                {isLoggedIn && isAdmin && (
                  <a
                    href="#admin"
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
                      onClick={() => {
                        openAuthModal('signup');
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-all font-pokemon text-center"
                    >
                      Sign Up
                    </button>
                    <button
                      onClick={() => {
                        openAuthModal('signin');
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all font-pokemon text-center"
                    >
                      Sign In
                    </button>
                  </div>
                )}
                {isLoggedIn && (
                  <button
                    onClick={signOut}
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

      <AuthModal isOpen={authModal.isOpen} onClose={closeAuthModal} mode={authModal.mode} />

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
