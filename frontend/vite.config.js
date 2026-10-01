import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libs into separate cached chunks.
        // Each chunk is independently cached — an app code change no longer
        // busts the MUI / react-admin / chart.js cache in the browser.
        //
        // Function form on purpose: the object form drags every transitive
        // dependency of a listed package into its chunk, so react/jsx-runtime
        // landed in vendor-charts and @tanstack/react-query (imported eagerly by
        // main.jsx) in vendor-react-admin. Every page then statically imported
        // the admin/chart/MUI stack (~300 kB gzip) and /login preloaded it all.
        // Here each module is assigned by package path, so only the packages the
        // app shell needs (react, react-dom, react-router, react-query) sit in
        // the eagerly loaded vendor-react chunk; the others are lazy-only.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@tanstack)\//.test(id)) return 'vendor-react'
          if (/node_modules\/(@mui|@emotion)\//.test(id)) return 'vendor-mui'
          if (/node_modules\/(chart\.js|react-chartjs-2|@kurkle)\//.test(id)) return 'vendor-charts'
          if (/node_modules\/(react-admin|ra-[a-z0-9-]+)\//.test(id)) return 'vendor-react-admin'
          if (/node_modules\/emoji-picker-react\//.test(id)) return 'vendor-emoji'
        },
      },
    },
  },
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
        'static/**',
        'coverage/**',
        'src/test/**',
        '**/*.config.*',
        'src/main.jsx',
        'src/pages/Admin/AdminAchievements.jsx',
        'src/pages/Admin/AdminChallenges.jsx',
        'src/pages/Admin/AdminConnections.jsx',
        'src/pages/Admin/AdminCourseInstances.jsx',
        'src/pages/Admin/AdminDocuments.jsx',
        'src/pages/Admin/AdminStudentActivity.jsx',
        'src/pages/Admin/AdminUserDashboard.jsx',
        'src/pages/Admin/AdvancedPanel.jsx',
        'src/pages/Parent/**',
        'src/pages/Error/ServerOffline.jsx',
        'src/components/common/ImageUpload.jsx',
        'src/components/common/ScreenRecorder.jsx',
        'src/components/common/SmartImage.jsx',
        'src/components/common/Tutorial.jsx',
        'src/components/common/UserSearchInput.jsx',
        'src/utils/video.js',
        'src/pages/General/Achievements.jsx',
        'src/pages/General/BitShift.jsx',
        'src/pages/General/CourseLevelBreakdown.jsx',
        'src/pages/General/CourseProgressTree.jsx',
        'src/pages/General/History.jsx',
        'src/pages/General/Landing.jsx',
        'src/pages/General/LandingDesktop.jsx',
        'src/pages/General/LandingMobile.jsx',
        'src/pages/General/SubmitWork.jsx',
        'src/hooks/useFeedLogic.js',
        'src/hooks/useProfile.js',
        'src/hooks/useViewport.js',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 80,
        functions: 55,
      },
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
      '/api/admin': 'http://localhost:8000',
      '/duck_trade': 'http://localhost:8000',
      '/api/achievements': 'http://localhost:8000',
      '/notes': 'http://localhost:8000',
      '/server': 'http://localhost:8000',
      '/api/dev-login': 'http://localhost:8000',
      '/api/project-templates': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
