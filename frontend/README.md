## Testing

This project uses Vitest for unit/integration testing and Playwright for end-to-end (E2E) testing.

### Unit & Integration Tests (Vitest)
Unit tests are located alongside components and stores (e.g., `ComponentName.test.jsx`). We use [MSW (Mock Service Worker)](https://mswjs.io/) to mock backend API calls.

- **Run tests:** `npm run test`
- **Watch mode:** `npm run test -- --watch`

### End-to-End Tests (Playwright)
E2E tests are located in the `tests-e2e/` directory. They simulate real user interactions in a browser.

- **Run tests:** `npm run test:e2e`
- **UI Mode:** `npm run test:e2e:ui`

To install browsers (first time only):
```bash
npx playwright install
```
