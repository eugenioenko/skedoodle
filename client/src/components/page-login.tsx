import React from 'react';
import { authService } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { IconSpiral } from '@tabler/icons-react';

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
      <IconSpiral size={64} stroke={1} className="text-text-primary animate-spin" />
    </div>
  );
}
