import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { forceSignOut } from '../lib/supabase';

const ResetSessionButton: React.FC = () => {
  const { signOut } = useAuth();

  const handleReset = async () => {
    console.log('[ui] ResetSessionButton clicked');
    try {
      await Promise.race([
        signOut('reset-session-click'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000)),
      ]);
      console.log('[ui] ResetSessionButton signOut resolved');
    } catch (e) {
      console.warn('Reset session fallback:', e);
      await forceSignOut();
      console.log('[ui] forcing hard reload after reset session fallback');
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleReset}
      className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all font-pokemon flex items-center space-x-2"
    >
      <LogOut className="h-4 w-4" />
      <span>Reset Session</span>
    </button>
  );
};

export default ResetSessionButton;
