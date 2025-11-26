import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { forceSignOut } from '../lib/supabase';

const ResetSessionButton: React.FC = () => {
  const { signOut } = useAuth();

  const handleReset = async () => {
    try {
      await Promise.race([
        signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000)),
      ]);
    } catch (e) {
      console.warn('Reset session fallback:', e);
      await forceSignOut();
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
