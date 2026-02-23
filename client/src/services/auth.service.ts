import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { useAuthStore } from '@/stores/auth.store';

const OIDC_ISSUER_URL = import.meta.env.VITE_OIDC_ISSUER_URL as string;
const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID as string;

const userManager = new UserManager({
    authority: OIDC_ISSUER_URL,
    client_id: OIDC_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: `${window.location.origin}/auth/logout`,
    scope: 'openid profile',
    userStore: new WebStorageStateStore({ store: localStorage }),
});

// Keep Zustand token in sync when oidc-client-ts silently renews the access token
userManager.events.addUserLoaded((user) => {
    useAuthStore.getState().setToken(user.access_token);
});

userManager.events.addUserUnloaded(() => {
    useAuthStore.getState().logout();
});

class AuthService {
    login() {
        const returnTo = sessionStorage.getItem('returnTo');
        return userManager.signinRedirect(returnTo ? { state: returnTo } : undefined);
    }

    async handleCallback(): Promise<{ id: string; username: string; returnTo?: string }> {
        const user = await userManager.signinRedirectCallback();
        const returnTo = user.state as string | undefined;
        sessionStorage.removeItem('returnTo');
        useAuthStore.getState().setToken(user.access_token);

        // Fetch internal user record (server upserts on token validation)
        const API_BASE_URL = import.meta.env.VITE_API_URL as string;
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${user.access_token}` },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user after login');
        }
        const appUser: { id: string; username: string } = await response.json();
        useAuthStore.getState().setUser(appUser);
        return { ...appUser, returnTo };
    }

    async logout() {
        useAuthStore.getState().logout();
        await userManager.signoutRedirect();
    }

    async getToken(): Promise<string | null> {
        const user = await userManager.getUser();
        return user?.access_token ?? null;
    }
}

export const authService = new AuthService();
