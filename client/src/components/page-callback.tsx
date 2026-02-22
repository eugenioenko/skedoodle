import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';

export function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    authService
      .handleCallback()
      .then(() => navigate('/sketches', { replace: true }))
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
      <p className="text-text-primary">Signing in…</p>
    </div>
  );
}
