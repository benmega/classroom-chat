import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.js',
    exclude: ['node_modules', 'dist', 'tests-e2e/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests-e2e/**',
        'tests/**',
        'static/**',          // legacy pre-React vanilla JS, not part of the Vite build
        'coverage/**',
        'src/test/**',        // test utilities themselves
        '**/*.config.*',
        'src/main.jsx',       // entry point, trivial to cover
        // Admin detail modules (separate CRUD panels)
        'src/pages/Admin/AdminAchievements.jsx',
        'src/pages/Admin/AdminCertificates.jsx',
        'src/pages/Admin/AdminChallenges.jsx',
        'src/pages/Admin/AdminConnections.jsx',
        'src/pages/Admin/AdminCourseInstances.jsx',
        'src/pages/Admin/AdminDocuments.jsx',
        'src/pages/Admin/AdminProjectTemplates.jsx',
        'src/pages/Admin/AdminProjects.jsx',
        'src/pages/Admin/AdminStudentActivity.jsx',
        'src/pages/Admin/AdminUserDashboard.jsx',
        'src/pages/Admin/AdvancedPanel.jsx',
        'src/pages/Admin/PendingTrades.jsx',
        // Parent feature views (non-student portal)
        'src/pages/Parent/**',
        // Error helper views
        'src/pages/Error/ServerOffline.jsx',
        // Legacy widgets / unused modules
        'src/components/common/ImageUpload.jsx',
        'src/components/common/ScreenRecorder.jsx',
        'src/components/common/SmartImage.jsx',
        'src/components/common/Tutorial.jsx',
        'src/components/common/UserSearchInput.jsx',
        'src/utils/video.js',
        // Complex student modules and legacy landing/game files
        'src/pages/General/Achievements.jsx',
        'src/pages/General/BitShift.jsx',
        'src/pages/General/CourseLevelBreakdown.jsx',
        'src/pages/General/CourseProgressTree.jsx',
        'src/pages/General/History.jsx',
        'src/pages/General/Landing.jsx',
        'src/pages/General/LandingDesktop.jsx',
        'src/pages/General/LandingMobile.jsx',
        'src/pages/General/SubmitWork.jsx',
        // Unused/legacy hooks
        'src/hooks/useFeedLogic.js',
        'src/hooks/useProfile.js',
        'src/hooks/useViewport.js',
      ],
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/track-requests': 'http://localhost:8000',
      '/admin/track-requests': 'http://localhost:8000',
      '/message': 'http://localhost:8000',
      '/user': 'http://localhost:8000',
      '/session': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/challenge': 'http://localhost:8000',
      '/ai': 'http://localhost:8000',
      '/api/admin': 'http://localhost:8000',
      '/duck_trade': 'http://localhost:8000',
      '/api/achievements': 'http://localhost:8000',
      '/notes': 'http://localhost:8000',
      '/server': 'http://localhost:8000',
      '/api/dev-login': 'http://localhost:8000',
      '/api/docs': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
