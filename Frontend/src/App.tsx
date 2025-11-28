import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import CataloguePage from "./pages/CataloguePage";
import GlobalLoader from "./components/GlobalLoader";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
          <GlobalLoader />
          <Routes>
          <Route
            path="/"
            element={<Navigate to="/catalogue" replace />}
          />
          <Route
            path="/catalogue"
            element={<CataloguePage />}
          />
          <Route
            path="/ctable"
            element={<Navigate to="/catalogue" replace />}
          />
          <Route
            path="/ptable"
            element={<Navigate to="/catalogue" replace />}
          />
        </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

