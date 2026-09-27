import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

function lucideOptimize() {
  return {
    name: 'optimize-lucide',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules')) return;
      if (!code.includes('lucide-react')) return;
      
      return code.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g, (match, imports) => {
        const names = imports.split(',').map(n => n.trim()).filter(Boolean);
        return names.map(name => {
          let importName = name;
          let localName = name;
          if (name.includes(' as ')) {
            [importName, localName] = name.split(' as ').map(n => n.trim());
          }
          let baseName = importName;
          if (baseName.endsWith('Icon') && baseName !== 'Icon') {
            baseName = baseName.replace(/Icon$/, '');
          }
          const kebabName = baseName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase();
          return `import ${localName} from 'lucide-react/dist/esm/icons/${kebabName}';`;
        }).join('\n');
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), lucideOptimize()],
  build: {
    rollupOptions: {
      output: {
        // Rollup's default chunking is usually more memory efficient during build
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
      '/ai': 'http://localhost:8000',
      '/api/admin': 'http://localhost:8000',
      '/duck_trade': 'http://localhost:8000',
      '/api/achievements': 'http://localhost:8000',
      '/notes': 'http://localhost:8000',
      '/server': 'http://localhost:8000',
      '/api/dev-login': 'http://localhost:8000',
      '/api/docs': 'http://localhost:8000',
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
