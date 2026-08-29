import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import useAuthStore from './store/useAuthStore';
import { SidebarProvider } from './context/SidebarContext';
import { THEME } from './utils/theme';


import Layout from './components/Layout/Layout';
import AdminLayout from './components/Layout/AdminLayout';

// --- Core pages: eagerly loaded (needed on first render for all users) ---
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Landing from './pages/General/Landing';
import Chat from './pages/Chat/Chat';
import Profile from './pages/Profile/index';
import AccessDenied from './pages/Error/AccessDenied';
import ServerOffline from './pages/Error/ServerOffline';

// --- Student pages: lazily loaded ---
const Achievements = React.lazy(() => import('./pages/General/Achievements'));
const BitShift = React.lazy(() => import('./pages/General/BitShift'));

const Activity = React.lazy(() => import('./pages/General/Activity'));
const CourseProgressTree = React.lazy(() => import('./pages/General/CourseProgressTree'));
const CourseLevelBreakdown = React.lazy(() => import('./pages/General/CourseLevelBreakdown'));
const Shop = React.lazy(() => import('./pages/General/Shop'));
const ProjectInfo = React.lazy(() => import('./pages/General/ProjectInfo'));
const EditProfile = React.lazy(() => import('./pages/User/EditProfile'));
const ManageProject = React.lazy(() => import('./pages/User/ManageProject'));

// --- Admin pages: lazily loaded (students never need these) ---
const ToReview = React.lazy(() => import('./pages/Admin/ToReview'));
const AdminDashboard = React.lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminAssignProject = React.lazy(() => import('./pages/Admin/AdminAssignProject'));
const AdminLibrary = React.lazy(() => import('./pages/Admin/AdminLibrary'));
const AdminSubmissions = React.lazy(() => import('./pages/Admin/AdminSubmissions'));
const Users = React.lazy(() => import('./pages/Admin/Users'));
const Classes = React.lazy(() => import('./pages/Admin/Classes'));
const AdminUserDashboard = React.lazy(() => import('./pages/Admin/AdminUserDashboard'));
const AdminClassDashboard = React.lazy(() => import('./pages/Admin/AdminClassDashboard'));
const AdvancedPanel = React.lazy(() => import('./pages/Admin/AdvancedPanel'));
const DuckTransactions = React.lazy(() => import('./pages/Admin/DuckTransactions'));
const AdminStudentActivity = React.lazy(() => import('./pages/Admin/AdminStudentActivity'));
const AdminCRUD = React.lazy(() => import('./admin/AdminPanel'));
const KioskUpload = React.lazy(() => import('./pages/Admin/KioskUpload'));

// --- Parent pages: lazily loaded (students never need these) ---
const ParentDashboard = React.lazy(() => import('./pages/Parent/ParentDashboard'));
const ParentReportCard = React.lazy(() => import('./pages/Parent/ParentReportCard'));
const ConnectChild = React.lazy(() => import('./pages/Parent/ConnectChild'));
const JoinClassroomLink = React.lazy(() => import('./pages/General/JoinClassroomLink'));

// Development-only shortcut page — Vite's tree-shaking removes this module
// from production builds because it is only referenced inside the DEV guard below.
import DevLogin from './pages/Auth/DevLogin';

/**
 * Catches chunk-load errors (e.g. after a deploy that invalidates old JS hashes).
 * Instead of silently force-refreshing in a `React.lazy` wrapper (which can cause
 * infinite reload loops), we surface a user-friendly "Reload" prompt.
 */
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Chunk load error caught by boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          padding: '2rem',
        }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-2xl)' }}>A new version is available</h2>
          <p style={{ opacity: 0.7, fontSize: 'var(--font-sm)', margin: 0 }}>
            Please reload the page to get the latest update.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: 'none',
              background: 'var(--primary-color)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'var(--font-sm)',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fallback spinner shown while lazy chunks are loading
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'var(--bg-primary)',
  }}>
    <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={40} strokeWidth={1.5} color={THEME.colors.blue600} />
  </div>
);


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
  if (adminOnly && user?.role !== 'admin') return <AccessDenied />;

  if (user?.role === 'parent' && 
      !location.pathname.startsWith('/parent/') && 
      !location.pathname.startsWith('/chat') && 
      !location.pathname.startsWith('/profile') && 
      !location.pathname.startsWith('/settings') &&
      !location.pathname.startsWith('/join-class')) {
    return <Navigate to="/parent/dashboard" replace />;
  }

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

  let authRedirect = '/chat';
  if (user?.role === 'parent') {
    authRedirect = '/parent/dashboard';
  } else if (user?.role === 'admin') {
    authRedirect = '/admin/dashboard';
  } else if (user?.role === 'student' && user?.slug) {
    authRedirect = `/course-progress/${user.slug}`;
  }

  return (
    <Router>
      <SidebarProvider>
        <Toaster 
            position="bottom-right"
            gutter={12}
            containerStyle={{
                bottom: 24,
                right: 24,
            }}
            toastOptions={{
                duration: 4500,
                style: {
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px 20px',
                    boxShadow: 'var(--shadow-xl)',
                    fontSize: 'var(--font-sm)',
                    fontWeight: '600',
                    maxWidth: '420px',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-body)',
                },
                success: {
                    style: {
                        borderLeft: '4px solid var(--success-color)',
                    },
                    iconTheme: {
                        primary: 'var(--success-color)',
                        secondary: 'var(--bg-primary)',
                    },
                },
                error: {
                    style: {
                        borderLeft: '4px solid var(--error-color)',
                    },
                    iconTheme: {
                        primary: 'var(--error-color)',
                        secondary: 'var(--bg-primary)',
                    },
                },
            }}
        />
      <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
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

        <Route path="/project-info/:projectId" element={
          <ProtectedRoute>
            <Layout>
              <ProjectInfo />
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



        <Route path="/activity" element={
          <ProtectedRoute>
            <Layout>
              <Activity />
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

        <Route path="/admin/classes/:classId/kiosk" element={
          <ProtectedRoute adminOnly={true}>
            <KioskUpload />
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
                <Route path="to-review" element={<ToReview />} />
                <Route path="assign-project" element={<AdminAssignProject />} />
                <Route path="library" element={<AdminLibrary />} />
                <Route path="users" element={<Users />} />
                <Route path="students" element={<Navigate to="/admin/users?role=student" replace />} />
                <Route path="parents" element={<Navigate to="/admin/users?role=parent" replace />} />
                <Route path="classes" element={<Classes />} />
                <Route path="classes/:classId" element={<AdminClassDashboard />} />
                <Route path="users/:userId" element={<AdminUserDashboard />} />
                <Route path="connections" element={<Navigate to="/admin/users?role=parent" replace />} />
                <Route path="analytics" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="submissions" element={<AdminSubmissions />} />
                <Route path="projects" element={<Navigate to="/admin/to-review" replace />} />
                <Route path="certificates" element={<Navigate to="/admin/to-review" replace />} />
                <Route path="pending-trades" element={<Navigate to="/admin/to-review" replace />} />
                <Route path="pending-users" element={<Navigate to="/admin/to-review" replace />} />
                <Route path="standard-projects" element={<Navigate to="/admin/library" replace />} />
                <Route path="add-achievement" element={<Navigate to="/admin/library" replace />} />
                <Route path="add-challenges" element={<Navigate to="/admin/library" replace />} />
                <Route path="documents" element={<Navigate to="/admin/library" replace />} />
                <Route path="advanced" element={<AdvancedPanel />} />
                <Route path="transactions" element={<DuckTransactions />} />
                <Route path="student-activity" element={<AdminStudentActivity />} />
                <Route path="review" element={<Navigate to="/admin/to-review" replace />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />

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
        <Route path="/parent/connect" element={
          <ProtectedRoute parentOnly={true}>
            <Layout>
              <ConnectChild />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/join-class" element={<JoinClassroomLink />} />
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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </Suspense>
      </ChunkErrorBoundary>
      </SidebarProvider>
    </Router>
  );
}

export default App;
