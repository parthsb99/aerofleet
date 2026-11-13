import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BookService from './pages/BookService.jsx';
import ServiceHistory from './pages/ServiceHistory.jsx';
import MyVehicles from './pages/MyVehicles.jsx';
import MonthlyExpenditure from './pages/MonthlyExpenditure.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminVehicles from './pages/admin/AdminVehicles.jsx';
import AdminBookings from './pages/admin/AdminBookings.jsx';
import AdminServiceHistory from './pages/admin/AdminServiceHistory.jsx';
import AdminPackages from './pages/admin/AdminPackages.jsx';
import AdminGarages from './pages/admin/AdminGarages.jsx';
import AdminExpenditure from './pages/admin/AdminExpenditure.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminActivity from './pages/admin/AdminActivity.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';

/**
 * Intelligent home route:
 * - If user is logged in as admin, redirect directly to /admin
 * - If user is logged in as customer, redirect directly to /dashboard
 * - If not logged in, show the public Landing Page
 */
function HomeRoute() {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (user?.token) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return <LandingPage />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <Router>
              <Routes>
                {/* Public & Landing */}
                <Route path="/" element={<HomeRoute />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Customer Routes */}
                <Route path="/dashboard" element={<ProtectedRoute requiredRole="customer"><Dashboard /></ProtectedRoute>} />
                <Route path="/book-service" element={<ProtectedRoute requiredRole="customer"><BookService /></ProtectedRoute>} />
                <Route path="/service-history" element={<ProtectedRoute requiredRole="customer"><ServiceHistory /></ProtectedRoute>} />
                <Route path="/my-vehicles" element={<ProtectedRoute requiredRole="customer"><MyVehicles /></ProtectedRoute>} />
                <Route path="/expenditure" element={<ProtectedRoute requiredRole="customer"><MonthlyExpenditure /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/vehicles" element={<ProtectedRoute requiredRole="admin"><AdminVehicles /></ProtectedRoute>} />
                <Route path="/admin/bookings" element={<ProtectedRoute requiredRole="admin"><AdminBookings /></ProtectedRoute>} />
                <Route path="/admin/service-history" element={<ProtectedRoute requiredRole="admin"><AdminServiceHistory /></ProtectedRoute>} />
                <Route path="/admin/packages" element={<ProtectedRoute requiredRole="admin"><AdminPackages /></ProtectedRoute>} />
                <Route path="/admin/garages" element={<ProtectedRoute requiredRole="admin"><AdminGarages /></ProtectedRoute>} />
                <Route path="/admin/expenditure" element={<ProtectedRoute requiredRole="admin"><AdminExpenditure /></ProtectedRoute>} />
                <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><AdminReports /></ProtectedRoute>} />
                <Route path="/admin/activity" element={<ProtectedRoute requiredRole="admin"><AdminActivity /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
