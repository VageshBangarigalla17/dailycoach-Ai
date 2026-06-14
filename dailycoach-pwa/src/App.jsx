import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScheduleBuilder from './pages/ScheduleBuilder';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';
import GlobalReminder from './components/GlobalReminder';

// ── Capacitor Native Bridge ──────────────────────────────────────────────────
// registerPlugin is a no-op when running in a browser, so this import is safe.
import { registerPlugin } from '@capacitor/core';
const NotificationService = registerPlugin('NotificationService');
// ────────────────────────────────────────────────────────────────────────────

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-white">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div className="pb-20">
      <GlobalReminder />
      {children}
      <Navbar />
    </div>
  );
}

import { initSQLiteDB } from './services/sqliteService';

function App() {
  useEffect(() => {
    // Initialize SQLite Database
    const setupDB = async () => {
      await initSQLiteDB();
    };
    setupDB();

    // Only run inside the native Android Capacitor wrapper — not in browser/PWA
    if (window.Capacitor?.isNativePlatform()) {
      const startNativeService = async () => {
        try {
          const result = await NotificationService.startBackgroundService();
          console.log('✅ [Capacitor] Background service started:', result);
        } catch (err) {
          console.error('❌ [Capacitor] Failed to start background service:', err);
        }
      };
      startNativeService();
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/schedule" element={
          <ProtectedRoute>
            <ScheduleBuilder />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
