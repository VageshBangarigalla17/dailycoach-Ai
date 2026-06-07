import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScheduleBuilder from './pages/ScheduleBuilder';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';
import GlobalReminder from './components/GlobalReminder';

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

function App() {
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
