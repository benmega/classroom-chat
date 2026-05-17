import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import useAuthStore from './store/useAuthStore';
import { SidebarProvider } from './context/SidebarContext';
import { THEME } from './utils/theme';


import Layout from './components/Layout/Layout';
import AdminLayout from './components/Layout/AdminLayout';

import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Profile from './pages/Profile/index';
import Chat from './pages/Chat/Chat';
import Achievements from './pages/General/Achievements';
import BitShift from './pages/General/BitShift';
import SubmitCertificate from './pages/General/SubmitCertificate';
import SubmitChallenge from './pages/General/SubmitChallenge';
import History from './pages/General/History';
import EditProfile from './pages/User/EditProfile';
import ManageProject from './pages/User/ManageProject';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminProjects from './pages/Admin/AdminProjects';
import AdminCertificates from './pages/Admin/AdminCertificates';
import AdminAchievements from './pages/Admin/AdminAchievements';
import AdminDocuments from './pages/Admin/AdminDocuments';
import Users from './pages/Admin/Users';
import Analytics from './pages/Admin/Analytics';
import PendingTrades from './pages/Admin/PendingTrades';
import PendingUsers from './pages/Admin/PendingUsers';
import AdvancedPanel from './pages/Admin/AdvancedPanel';

import AdminCRUD from './admin/AdminPanel';
import AccessDenied from './pages/Error/AccessDenied';
// Development-only shortcut page — Vite's tree-shaking removes this module
// from production builds because it is only referenced inside the DEV guard below.
import DevLogin from './pages/Auth/DevLogin';


const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: 'var(--bg-primary)', 
      color: 'var(--text-primary)',
    }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={64} strokeWidth={1.5} color={THEME.colors.blue600} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '-0.025em' }}>Classroom Chat</h2>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.7, fontSize: '0.875rem' }}>Preparing your workspace...</p>
        </div>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !user?.is_admin) return <AccessDenied />;

  
  return children;
};

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <SidebarProvider>
        <Toaster 
            position="bottom-right"
            gutter={12}
            containerStyle={{
                top: 40,
                left: 40,
                bottom: 40,
                right: 40,
            }}
            toastOptions={{
                duration: 4500,
                style: {
                    background: THEME.colors.slate800,
                    color: '#ffffff',
                    borderRadius: THEME.radius.md,
                    padding: '16px 24px',
                    boxShadow: THEME.shadows.xl,
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    maxWidth: '420px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                },
                success: {
                    style: {
                        background: THEME.colors.success,
                        border: `1px solid ${THEME.colors.successDark}`,
                    },
                    iconTheme: {
                        primary: '#ffffff',
                        secondary: THEME.colors.success,
                    },
                },
                error: {
                    style: {
                        background: THEME.colors.error,
                        border: `1px solid ${THEME.colors.errorDark}`,
                    },
                    iconTheme: {
                        primary: '#ffffff',
                        secondary: THEME.colors.error,
                    },
                },
            }}
        />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/" /> : <Signup />} />

        {/* Development-only shortcut — guarded so browsers in production never see this route */}
        {import.meta.env.DEV && (
          <Route path="/dev-login" element={<DevLogin />} />
        )}


        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Chat />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/profile/:slug" element={
          <Layout>
            <Profile />
          </Layout>
        } />

        <Route path="/achievements" element={
          <ProtectedRoute>
            <Layout>
              <Achievements />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/bit-shift" element={
          <ProtectedRoute>
            <Layout>
              <BitShift />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/submit-certificate" element={
          <ProtectedRoute>
            <Layout>
              <SubmitCertificate />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/submit-challenge" element={
          <ProtectedRoute>
            <Layout>
              <SubmitChallenge />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute>
            <Layout>
              <History />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <EditProfile />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/project/new" element={
          <ProtectedRoute>
            <Layout>
              <ManageProject />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/project/edit/:projectId" element={
          <ProtectedRoute>
            <Layout>
              <ManageProject />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/admin/advanced-crud/*" element={
          <ProtectedRoute adminOnly={true}>
            <AdminLayout>
              <AdminCRUD />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/*" element={
          <ProtectedRoute adminOnly={true}>
            <AdminLayout>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="certificates" element={<AdminCertificates />} />
                <Route path="users" element={<Users />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="add-achievement" element={<AdminAchievements />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="pending-trades" element={<PendingTrades />} />
                <Route path="pending-users" element={<PendingUsers />} />
                <Route path="advanced" element={<AdvancedPanel />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </SidebarProvider>
    </Router>
  );
}

export default App;
