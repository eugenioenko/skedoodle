import { ClientMessage, ServerMessage } from '../services/protocol';
import { syncService } from './sync.client';
import { useAuthStore } from '../stores/auth.store';

class AuthService {
    private ws: WebSocket | null = null;
    private messageQueue: ClientMessage[] = [];
    private authPromiseResolvers = new Map<string, Function>();

    constructor() {
        this.connectToAuthSocket();
    }

    private connectToAuthSocket() {
        // Use a separate WebSocket connection for auth to avoid circular dependencies with syncService
        this.ws = new WebSocket('ws://localhost:3003'); // Auth on the same port as sync

        this.ws.onopen = () => {
            console.log('[AuthService] WebSocket connected');
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                if (message) this.ws?.send(JSON.stringify(message));
            }
        };

        this.ws.onmessage = (event) => {
            const message: ServerMessage = JSON.parse(event.data);
            if (message.type === 'auth') {
                const resolver = this.authPromiseResolvers.get(message.action);
                if (resolver) {
                    resolver(message.payload);
                    this.authPromiseResolvers.delete(message.action);
                }
            }
        };

        this.ws.onclose = () => {
            console.log('[AuthService] WebSocket disconnected');
            // Implement reconnection logic if needed
        };

        this.ws.onerror = (err) => {
            console.error('[AuthService] WebSocket error:', err);
        };
    }

    private sendAuthMessage<T>(action: ClientMessage['action'], payload: any): Promise<T> {
        return new Promise((resolve, reject) => {
            const message: ClientMessage = { type: 'auth', action, payload };
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(message));
            } else {
                this.messageQueue.push(message);
            }
            this.authPromiseResolvers.set(action, (responsePayload: any) => {
                if (responsePayload.error) {
                    reject(new Error(responsePayload.error));
                } else {
                    resolve(responsePayload as T);
                }
            });
        });
    }

    async getRegistrationOptions(username: string): Promise<any> {
        return this.sendAuthMessage('register-options', { username });
    }

    async verifyRegistration(username: string, response: any): Promise<{ token: string; user: { id: string; username: string } }> {
        const result = await this.sendAuthMessage('register-verify', { username, response });
        useAuthStore.getState().setToken(result.token);
        useAuthStore.getState().setUser(result.user);
        return result;
    }

    async getLoginOptions(username: string): Promise<any> {
        return this.sendAuthMessage('login-options', { username });
    }

    async verifyLogin(username: string, response: any): Promise<{ token: string; user: { id: string; username: string } }> {
        const result = await this.sendAuthMessage('login-verify', { username, response });
        useAuthStore.getState().setToken(result.token);
        useAuthStore.getState().setUser(result.user);
        return result;
    }

    // You might want a way to get the current user, possibly via a JWT token sent in a future WS message
    // For now, the user info is stored in the Zustand store after login/registration.
}

export const authService = new AuthService();
