import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { IconSpiral } from '@tabler/icons-react';

export function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    authService
      .handleCallback()
      .then(({ returnTo }) => navigate(returnTo ?? '/sketches', { replace: true }))
      .catch((err: unknown) => {
        console.error('OIDC callback failed:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-default-0 p-4">
        <div className="bg-default-1 rounded-xl shadow-2xl p-10 w-full max-w-sm border border-default-2 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="text-primary hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-default-0">
      <IconSpiral size={64} stroke={1} className="text-text-primary animate-spin" />
    </div>
  );
}
