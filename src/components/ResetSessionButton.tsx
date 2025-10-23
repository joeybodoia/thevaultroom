import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const ResetSessionButton: React.FC = () => {
  const { signOut } = useAuth();

  return (
    <button
      onClick={signOut}
      className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all font-pokemon flex items-center space-x-2"
    >
      <LogOut className="h-4 w-4" />
      <span>Reset Session</span>
    </button>
  );
};

export default ResetSessionButton;