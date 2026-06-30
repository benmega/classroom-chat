import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import useAuthStore from './store/useAuthStore';
import { SidebarProvider } from './context/SidebarContext';
import { THEME } from './utils/theme';


import Layout from './components/Layout/Layout';
import AdminLayout from './components/Layout/AdminLayout';

import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Profile from './pages/Profile/index';
import Chat from './pages/Chat/Chat';
import Achievements from './pages/General/Achievements';
import BitShift from './pages/General/BitShift';
import SubmitWork from './pages/General/SubmitWork';
import Landing from './pages/General/Landing';
import CourseProgressTree from './pages/General/CourseProgressTree';
import CourseLevelBreakdown from './pages/General/CourseLevelBreakdown';
import Shop from './pages/General/Shop';
import EditProfile from './pages/User/EditProfile';
import ManageProject from './pages/User/ManageProject';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminProjects from './pages/Admin/AdminProjects';
import AdminCertificates from './pages/Admin/AdminCertificates';
import AdminAchievements from './pages/Admin/AdminAchievements';
import AdminChallenges from './pages/Admin/AdminChallenges';
import AdminDocuments from './pages/Admin/AdminDocuments';
import Users from './pages/Admin/Users';
import Analytics from './pages/Admin/Analytics';
import PendingTrades from './pages/Admin/PendingTrades';
import PendingUsers from './pages/Admin/PendingUsers';
import AdvancedPanel from './pages/Admin/AdvancedPanel';
import AdminCourseInstances from './pages/Admin/AdminCourseInstances';
import DuckTransactions from './pages/Admin/DuckTransactions';
import ParentDashboard from './pages/Parent/ParentDashboard';
import ParentReportCard from './pages/Parent/ParentReportCard';
import ConnectChild from './pages/Parent/ConnectChild';

import AdminCRUD from './admin/AdminPanel';
import AccessDenied from './pages/Error/AccessDenied';
import ServerOffline from './pages/Error/ServerOffline';
// Development-only shortcut page — Vite's tree-shaking removes this module
// from production builds because it is only referenced inside the DEV guard below.
import DevLogin from './pages/Auth/DevLogin';


const ProtectedRoute = ({ children, adminOnly = false, parentOnly = false }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();
  
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
          <h2 style={{ margin: 0, fontSize: 'var(--font-2xl)', fontWeight: 'bold', letterSpacing: '-0.025em' }}>Classroom Chat</h2>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.7, fontSize: 'var(--font-sm)' }}>Preparing your workspace...</p>
        </div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !user?.is_admin) return <AccessDenied />;

  // Redirect parents away from student/admin routes to their dashboard
  if (user?.role === 'parent' && !location.pathname.startsWith('/parent/')) {
    return <Navigate to="/parent/dashboard" replace />;
  }

  // Restrict parent-only routes to parent role
  if (parentOnly && user?.role !== 'parent') {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

function App() {
  const { checkAuth, isAuthenticated, isServerOffline, user } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isServerOffline) {
    return <ServerOffline />;
  }

  const authRedirect = user?.role === 'parent' ? '/parent/dashboard' : '/chat';

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
                    color: 'var(--bg-primary)',
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
                        primary: 'var(--bg-primary)',
                        secondary: THEME.colors.success,
                    },
                },
                error: {
                    style: {
                        background: THEME.colors.error,
                        border: `1px solid ${THEME.colors.errorDark}`,
                    },
                    iconTheme: {
                        primary: 'var(--bg-primary)',
                        secondary: THEME.colors.error,
                    },
                },
            }}
        />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={authRedirect} /> : <Login />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to={authRedirect} /> : <Signup />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to={authRedirect} /> : <ForgotPassword />} />
        <Route path="/reset-password" element={isAuthenticated ? <Navigate to={authRedirect} /> : <ResetPassword />} />


        {/* Development-only shortcut — guarded so browsers in production never see this route */}
        {import.meta.env.DEV && (
          <Route path="/dev-login" element={<DevLogin />} />
        )}


        <Route path="/" element={<Landing />} />

        <Route path="/chat" element={
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

        <Route path="/course-progress/:slug" element={
          <ProtectedRoute>
            <Layout>
              <CourseProgressTree />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/course-progress/:slug/breakdown" element={
          <ProtectedRoute>
            <Layout>
              <CourseLevelBreakdown />
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

        <Route path="/shop" element={
          <ProtectedRoute>
            <Layout>
              <Shop />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/submit-certificate" element={<Navigate to="/submit-work" replace />} />
        <Route path="/submit-challenge" element={<Navigate to="/submit-work" replace />} />

        <Route path="/submit-work" element={
          <ProtectedRoute>
            <Layout>
              <SubmitWork />
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
                <Route path="add-challenges" element={<AdminChallenges />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="pending-trades" element={<PendingTrades />} />
                <Route path="pending-users" element={<PendingUsers />} />
                <Route path="course-instances" element={<AdminCourseInstances />} />
                <Route path="advanced" element={<AdvancedPanel />} />
                <Route path="transactions" element={<DuckTransactions />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Parent Routes */}
        <Route path="/parent/dashboard" element={
          <ProtectedRoute parentOnly={true}>
            <Layout>
              <ParentDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/parent/report/:studentId" element={
          <ProtectedRoute parentOnly={true}>
            <Layout>
              <ParentReportCard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/parent/connect" element={<ConnectChild />} />
        <Route path="/parent/course-progress/:slug" element={
          <ProtectedRoute parentOnly={true}>
            <Layout>
              <CourseProgressTree />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/parent/course-progress/:slug/breakdown" element={
          <ProtectedRoute parentOnly={true}>
            <Layout>
              <CourseLevelBreakdown />
            </Layout>
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
