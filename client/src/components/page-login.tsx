import React, { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { authService } from '@/services/auth.service';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { IconAlertCircle } from '@tabler/icons-react';
import { TextInput } from './ui/text-input';
export function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.token && s.user);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/sketches');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const options = await authService.getLoginOptions(username);
      const assertionResponse = await startAuthentication({ optionsJSON: options });
      await authService.verifyLogin(username, assertionResponse);
      navigate('/sketches');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-default-0 p-4">
      <div className="bg-default-1 rounded-xl shadow-2xl p-10 w-full max-w-sm border border-default-2">
        <img src="/favicon.svg" alt="Skedoodle Logo" className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-3xl font-extrabold text-text-primary mb-8 text-center tracking-tight">Skedoodle</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-text-primary mb-2">
              Username
            </label>
            <TextInput
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}

              placeholder="Enter your username"
              required
            />
          </div>
          {error && (
            <div className="flex items-center p-3 rounded-md bg-red-800/20 text-red-400 text-sm">
              <IconAlertCircle size={20} className="mr-2" />
              {error}
            </div>
          )}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-base font-semibold text-text-primary bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
            >
              Login with Passkey
            </button>
          </div>
          <div className="flex gap-2 justify-center  text-text-primary">
            Don't have an account?
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary-light hover:underline transition-colors duration-200"
            >
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
