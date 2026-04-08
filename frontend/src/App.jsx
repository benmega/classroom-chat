import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import useAuthStore from './store/useAuthStore';

import Layout from './components/Layout/Layout';
import AdminLayout from './components/Layout/AdminLayout';

// Pages
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
import AdminSettings from './pages/Admin/AdminSettings';
import AccessDenied from './pages/Error/AccessDenied';


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
      background: '#0f172a', 
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
    }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={64} strokeWidth={1.5} color="#3b82f6" />
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
  }, []);

  return (
    <Router>
      <Toaster 
        position="bottom-right"
        toastOptions={{
            duration: 4000,
            style: {
                background: '#333',
                color: '#fff',
                borderRadius: '10px',
                padding: '12px 20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            success: {
                style: {
                    background: '#28a745',
                },
            },
            error: {
                style: {
                    background: '#dc3545',
                },
            },
        }}
      />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/" /> : <Signup />} />


        {/* User Routes (Wrapped in Layout) */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Chat />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile/:slug?" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
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

        {/* Admin Routes (Wrapped in AdminLayout) */}
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
                <Route path="settings" element={<AdminSettings />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
