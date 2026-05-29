'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// ─── Cognito OAuth2 Config ──────────────────────────────────────────────────
const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? '';
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '';
const REDIRECT_URI =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
const SCOPES = 'openid profile aws.cognito.signin.user.admin';
const IDP_NAME = 'AzureAD';

// ─── PKCE helpers ───────────────────────────────────────────────────────────

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePKCE() {
  const verifier = generateRandomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  return { verifier, challenge };
}

// ─── Token storage ──────────────────────────────────────────────────────────

const TOKEN_KEYS = {
  idToken: 'cloudletters_id_token',
  accessToken: 'cloudletters_access_token',
  refreshToken: 'cloudletters_refresh_token',
  expiry: 'cloudletters_token_expiry',
} as const;

function storeTokens(tokens: {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}) {
  localStorage.setItem(TOKEN_KEYS.idToken, tokens.id_token);
  localStorage.setItem(TOKEN_KEYS.accessToken, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(TOKEN_KEYS.refreshToken, tokens.refresh_token);
  }
  const expiry = Date.now() + tokens.expires_in * 1000;
  localStorage.setItem(TOKEN_KEYS.expiry, String(expiry));
}

function clearTokens() {
  Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem('pkce_verifier');
  sessionStorage.removeItem('autoLoginAttempted');
}

function getStoredIdToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.idToken);
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.refreshToken);
}

function isTokenExpired(): boolean {
  const expiry = localStorage.getItem(TOKEN_KEYS.expiry);
  if (!expiry) return true;
  return Date.now() > Number(expiry) - 5 * 60_000; // 5 min buffer — refresh before actual expiry
}

// ─── JWT decode (no verification — done server-side) ────────────────────────

function decodeJwtPayload(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload));
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  email: string;
  displayName: string;
  sub: string;
  groups?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  getIdToken: () => string | null;
  getValidToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Token exchange with Cognito ────────────────────────────────────────────

async function exchangeCodeForTokens(code: string, verifier: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code,
    code_verifier: verifier,
  });

  const res = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) throw new Error('Token refresh failed');
  return res.json();
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const extractUser = useCallback((idToken: string): AuthUser => {
    const payload = decodeJwtPayload(idToken);
    return {
      email: payload.email ?? '',
      displayName:
        payload.name ?? payload.given_name ?? payload['custom:displayName'] ?? payload.email ?? '',
      sub: payload.sub ?? '',
      groups: payload['custom:groups']
        ? (() => {
            try {
              const g = JSON.parse(payload['custom:groups']);
              return Array.isArray(g) ? g : [payload['custom:groups']];
            } catch {
              return [payload['custom:groups']];
            }
          })()
        : undefined,
    };
  }, []);

  const setAuthFromToken = useCallback(
    (idToken: string) => {
      tokenRef.current = idToken;
      setUser(extractUser(idToken));
    },
    [extractUser],
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    // Check every 4 minutes and refresh if within 5 minutes of expiry
    refreshTimerRef.current = setInterval(
      async () => {
        if (!isTokenExpired()) return; // Still valid, skip
        const rt = getStoredRefreshToken();
        if (!rt) return;
        try {
          const tokens = await refreshAccessToken(rt);
          storeTokens({ ...tokens, refresh_token: rt });
          setAuthFromToken(tokens.id_token);
        } catch {
          clearTokens();
          setUser(null);
          tokenRef.current = null;
        }
      },
      4 * 60 * 1000, // Check every 4 minutes
    );
  }, [setAuthFromToken]);

  // Handle OAuth callback or restore session on mount
  useEffect(() => {
    const init = async () => {
      // 1. Check for OAuth callback code in URL
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const verifier = sessionStorage.getItem('pkce_verifier');

      if (code && verifier) {
        try {
          const tokens = await exchangeCodeForTokens(code, verifier);
          storeTokens(tokens);
          setAuthFromToken(tokens.id_token);
          sessionStorage.removeItem('pkce_verifier');
          sessionStorage.removeItem('autoLoginAttempted');
          window.history.replaceState({}, '', url.pathname);
          scheduleRefresh();
          setIsLoading(false);
          return;
        } catch (err) {
          console.error('OAuth callback error:', err);
          sessionStorage.removeItem('pkce_verifier');
        }
      }

      // 2. Try to restore from stored tokens
      const storedToken = getStoredIdToken();
      if (storedToken) {
        if (isTokenExpired()) {
          const rt = getStoredRefreshToken();
          if (rt) {
            try {
              const tokens = await refreshAccessToken(rt);
              storeTokens({ ...tokens, refresh_token: rt });
              setAuthFromToken(tokens.id_token);
              scheduleRefresh();
              setIsLoading(false);
              return;
            } catch {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        } else {
          setAuthFromToken(storedToken);
          scheduleRefresh();
          setIsLoading(false);
          return;
        }
      }

      // 3. Auto-login via Azure AD (with loop prevention)
      const alreadyAttempted = sessionStorage.getItem('autoLoginAttempted');
      if (!alreadyAttempted && COGNITO_DOMAIN && CLIENT_ID) {
        sessionStorage.setItem('autoLoginAttempted', 'true');
        const { verifier: newVerifier, challenge } = await generatePKCE();
        sessionStorage.setItem('pkce_verifier', newVerifier);

        const authUrl = new URL(`https://${COGNITO_DOMAIN}/oauth2/authorize`);
        authUrl.searchParams.set('identity_provider', IDP_NAME);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.set('scope', SCOPES);
        authUrl.searchParams.set('code_challenge', challenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');

        window.location.href = authUrl.toString();
        return;
      }

      // 4. Auto-login already attempted and failed — show as unauthenticated
      setIsLoading(false);
    };

    init();

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [setAuthFromToken, scheduleRefresh]);

  const login = useCallback(async () => {
    const { verifier, challenge } = await generatePKCE();
    sessionStorage.setItem('pkce_verifier', verifier);

    const authUrl = new URL(`https://${COGNITO_DOMAIN}/oauth2/authorize`);
    authUrl.searchParams.set('identity_provider', IDP_NAME);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    tokenRef.current = null;
    setUser(null);
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);

    if (COGNITO_DOMAIN && CLIENT_ID) {
      const logoutUrl = new URL(`https://${COGNITO_DOMAIN}/logout`);
      logoutUrl.searchParams.set('client_id', CLIENT_ID);
      logoutUrl.searchParams.set('logout_uri', REDIRECT_URI);
      window.location.href = logoutUrl.toString();
    }
  }, []);

  const getIdToken = useCallback(() => {
    // Prefer the ref (latest token), fall back to localStorage
    if (tokenRef.current && !isTokenExpired()) return tokenRef.current;
    const stored = getStoredIdToken();
    if (stored && !isTokenExpired()) {
      tokenRef.current = stored;
      return stored;
    }
    // Token expired — trigger background refresh but return current token
    // (API will retry with fresh token if 401)
    const rt = getStoredRefreshToken();
    if (rt) {
      refreshAccessToken(rt).then((tokens) => {
        storeTokens({ ...tokens, refresh_token: rt });
        setAuthFromToken(tokens.id_token);
      }).catch(() => { /* handled by getValidToken or next interval */ });
    }
    // Return potentially stale token — let API retry handle it
    return tokenRef.current || getStoredIdToken();
  }, [setAuthFromToken]);

  // Async version: ensures a valid token before returning (use for critical API calls)
  const getValidToken = useCallback(async (): Promise<string | null> => {
    const stored = getStoredIdToken();
    if (stored && !isTokenExpired()) {
      tokenRef.current = stored;
      return stored;
    }
    // Token expired — refresh now
    const rt = getStoredRefreshToken();
    if (!rt) return null;
    try {
      const tokens = await refreshAccessToken(rt);
      storeTokens({ ...tokens, refresh_token: rt });
      setAuthFromToken(tokens.id_token);
      return tokens.id_token;
    } catch {
      clearTokens();
      setUser(null);
      tokenRef.current = null;
      return null;
    }
  }, [setAuthFromToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        getIdToken,
        getValidToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
