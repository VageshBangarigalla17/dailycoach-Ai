import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock sign up
  function signUp(email, password, name) {
    return new Promise((resolve) => {
      const user = { uid: 'mock-uid-123', email, name: name || 'User' };
      setCurrentUser(user);
      localStorage.setItem('dailycoach_user', JSON.stringify(user));
      resolve(user);
    });
  }

  // Mock sign in
  function signIn(email, password) {
    return new Promise((resolve) => {
      const user = { uid: 'mock-uid-123', email, name: 'User' };
      setCurrentUser(user);
      localStorage.setItem('dailycoach_user', JSON.stringify(user));
      resolve(user);
    });
  }

  // Mock sign out
  function signOut() {
    return new Promise((resolve) => {
      setCurrentUser(null);
      localStorage.removeItem('dailycoach_user');
      resolve();
    });
  }

  useEffect(() => {
    // Check local storage for mock persistent login
    const storedUser = localStorage.getItem('dailycoach_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
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
