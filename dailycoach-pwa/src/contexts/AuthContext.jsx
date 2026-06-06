import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signUp(email, password, name) {
    try {
      const response = await api.post('/auth/register', { email, password, name });
      const { user, token } = response.data;
      const userWithToken = { ...user, token };
      setCurrentUser(userWithToken);
      localStorage.setItem('dailycoach_user', JSON.stringify(userWithToken));
      return userWithToken;
    } catch (error) {
      throw error.response?.data?.message || 'Error signing up';
    }
  }

  async function signIn(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;
      const userWithToken = { ...user, token };
      setCurrentUser(userWithToken);
      localStorage.setItem('dailycoach_user', JSON.stringify(userWithToken));
      return userWithToken;
    } catch (error) {
      throw error.response?.data?.message || 'Error signing in';
    }
  }

  function signOut() {
    return new Promise((resolve) => {
      setCurrentUser(null);
      localStorage.removeItem('dailycoach_user');
      resolve();
    });
  }

  useEffect(() => {
    async function checkAuth() {
      const storedUser = localStorage.getItem('dailycoach_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // Only verify if we have a token
          if (parsed.token) {
            const response = await api.get('/users/profile');
            if (response.data.success) {
              const validatedUser = { ...response.data.user, token: parsed.token };
              setCurrentUser(validatedUser);
              localStorage.setItem('dailycoach_user', JSON.stringify(validatedUser));
            } else {
              setCurrentUser(null);
            }
          } else {
             setCurrentUser(null);
          }
        } catch (err) {
          console.error("Token invalid or expired", err);
          setCurrentUser(null);
          localStorage.removeItem('dailycoach_user');
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
