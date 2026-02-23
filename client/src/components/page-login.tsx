import React from 'react';
import { authService } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

const SIGNUP_URL = `${import.meta.env.VITE_OIDC_ISSUER_URL as string}/signup`;

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.token && s.user);
  const [signedUp, setSignedUp] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/sketches');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-default-0 p-4">
      <div className="bg-default-1 rounded-xl shadow-2xl p-10 w-full max-w-sm border border-default-2 text-center">
        <img src="/favicon.svg" alt="Skedoodle" className="w-12 h-12 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Skedoodle</h1>
        <p className="text-text-secondary text-sm mb-10">Collaborative sketching</p>
        {signedUp && (
          <p className="text-sm text-text-secondary bg-default-2 rounded-lg px-4 py-3 mb-4">
            Once your account is ready, come back here and sign in.
          </p>
        )}
        <button
          onClick={() => authService.login()}
          className="w-full bg-primary text-white rounded-lg py-2 px-4 font-medium hover:opacity-90 transition-opacity mb-6"
        >
          Sign in
        </button>
        <p className="text-text-secondary text-base font-semibold">
          No account?{' '}
          <a
            href={SIGNUP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
            onClick={() => setSignedUp(true)}
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
