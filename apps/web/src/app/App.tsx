import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { LandingPage } from '../features/landing/LandingPage';
import { ChatWorkspace } from '../features/chat/ChatWorkspace';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: false,
    },
  },
});

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/app', element: <ChatWorkspace /> },
]);

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
