import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface User {
    id: number;
    loginId: string;
    role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    name?: string;
    patientId?: number | null;
    patientCode?: string | null;
    doctorId?: number | null;
    doctorCode?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

/**
 * SECURITY TRADE-OFF DOCUMENTATION (Issue 4):
 * -----------------------------------------------------------------------------
 * 1. Token Storage: JWT is stored in state and persisted in browser `localStorage`.
 * 2. XSS Vulnerability Note: Storing JWT tokens in `localStorage` renders them accessible
 *    to JavaScript execution. If the application has an XSS vulnerability, an attacker could read the token.
 * 3. Enterprise Recommendation: High-security production healthcare systems should use `HttpOnly`, `SameSite`
 *    cookies combined with server-side refresh token rotation.
 * 4. Application Scope: For this REST API project architecture, client `localStorage` storage provides
 *    stateless session persistence. The backend Express API remains the true security boundary,
 *    verifying JWT signatures, active user status, and role authorization on every protected request.
 * 5. Passwords: Plaintext passwords are NEVER stored in state, `localStorage`, or context.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('medibook_token');
        const storedUser = localStorage.getItem('medibook_user');

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            } catch (e) {
                console.error('Failed to parse stored user auth state', e);
                localStorage.removeItem('medibook_token');
                localStorage.removeItem('medibook_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('medibook_token', newToken);
        localStorage.setItem('medibook_user', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('medibook_token');
        localStorage.removeItem('medibook_user');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
