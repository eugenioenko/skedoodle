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
    <div className="flex items-center justify-center min-h-screen bg-default-0">
      <p className="text-text-primary">Redirecting to sign in…</p>
    </div>
  );
}
