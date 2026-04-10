import React from 'react';
import { authService } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.token && s.user);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/sketches');
    } else {
      authService.login();
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-default-0 p-4">
      <div className="text-center">
        <img src="/favicon.svg" alt="Skedoodle" className="w-12 h-12 mx-auto mb-6 animate-pulse" />
        <h1 className="text-2xl font-bold text-text-primary mb-2 italic">Redirecting to login...</h1>
      </div>
    </div>
  );
}
