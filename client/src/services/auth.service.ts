import { useAuthStore } from '@/stores/auth.store';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/auth`;

class AuthService {

  async getRegistrationOptions(username: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/register/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get registration options');
    }
    return response.json();
  }

  async verifyRegistration(username: string, attestationResponse: any): Promise<{ token: string; user: { id: string; username: string } }> {
    const response = await fetch(`${API_BASE_URL}/register/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, response: attestationResponse }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration verification failed');
    }
    const result = await response.json();
    useAuthStore.getState().setToken(result.token);
    useAuthStore.getState().setUser(result.user);
    return result;
  }

  async getLoginOptions(username: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/login/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get login options');
    }
    return response.json();
  }

  async verifyLogin(username: string, assertionResponse: any): Promise<{ token: string; user: { id: string; username: string } }> {
    const response = await fetch(`${API_BASE_URL}/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, response: assertionResponse }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login verification failed');
    }
    const result = await response.json();
    useAuthStore.getState().setToken(result.token);
    useAuthStore.getState().setUser(result.user);
    return result;
  }

  async getCurrentUser(): Promise<{ id: string; username: string } | null> {
    const token = useAuthStore.getState().token;
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      useAuthStore.getState().logout(); // Token might be expired or invalid
      return null;
    }
    return response.json();
  }
}

export const authService = new AuthService();
