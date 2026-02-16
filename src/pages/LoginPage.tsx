import React, { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { authService } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { IconAlertCircle } from '@tabler/icons-react';

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
            const assertionResponse = await startAuthentication(options);
            await authService.verifyLogin(username, assertionResponse);
            navigate('/sketches');
        } catch (err: any) {
            console.error('Login failed:', err);
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-default-0 p-4">
            <div className="bg-default-1 rounded-lg shadow-xl p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">Login</h1>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-default-5">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-default-2 border border-default-3 rounded-md text-white placeholder-default-4 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Login with Passkey
                        </button>
                    </div>
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            className="font-medium text-primary hover:text-primary-light"
                        >
                            Don't have an account? Register
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
