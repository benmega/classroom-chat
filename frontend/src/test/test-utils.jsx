import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider } from '../context/SidebarContext';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export function renderWithProviders(ui, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route);
  const queryClient = createTestQueryClient();

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SidebarProvider>
            {ui}
          </SidebarProvider>
        </BrowserRouter>
      </QueryClientProvider>
    ),
    queryClient,
  };
}
