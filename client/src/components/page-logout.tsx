import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function LogoutPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-default-0 p-4">
      <div className="bg-default-1 rounded-xl shadow-2xl p-10 w-full max-w-sm border border-default-2 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/favicon.svg" alt="Skedoodle" className="w-8 h-8" />
          <span className="text-xl font-semibold text-white">Skedoodle</span>
        </div>
        <p className="text-text-secondary mb-6">You have been signed out.</p>
        <button
          onClick={() => navigate('/')}
          className="w-full px-4 py-2 rounded-lg bg-primary text-text-primary text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
