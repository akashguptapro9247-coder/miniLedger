import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'miniledger_auth_token';
const USER_KEY = 'miniledger_user_data';

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to safely write to SecureStore with localStorage fallback for web
  const setSecureItem = async (key: string, value: string) => {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.setItemAsync(key, value);
      } else {
        // Web fallback: use localStorage
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('SecureStore set error:', e);
    }
  };

  // Helper to safely read from SecureStore with localStorage fallback for web
  const getSecureItem = async (key: string): Promise<string | null> => {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        return await SecureStore.getItemAsync(key);
      }
      // Web fallback: use localStorage
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('SecureStore get error:', e);
      return null;
    }
  };

  // Helper to safely delete from SecureStore with localStorage fallback for web
  const deleteSecureItem = async (key: string) => {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(key);
      } else {
        // Web fallback: use localStorage
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('SecureStore delete error:', e);
    }
  };

  const logout = async () => {
    await deleteSecureItem(TOKEN_KEY);
    await deleteSecureItem(USER_KEY);
    api.setToken(null);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    // Configure API unauthorized handler
    api.setOnUnauthorized(() => {
      logout();
    });

    // Restore persisted session
    const restoreSession = async () => {
      try {
        const storedToken = await getSecureItem(TOKEN_KEY);
        const storedUserJson = await getSecureItem(USER_KEY);

        if (storedToken && storedUserJson) {
          const parsedUser = JSON.parse(storedUserJson);
          api.setToken(storedToken);
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await setSecureItem(TOKEN_KEY, newToken);
    await setSecureItem(USER_KEY, JSON.stringify(newUser));
    api.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
