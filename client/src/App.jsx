import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";

import Login from './pages/Login';
import Register from './pages/Register';
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const GroupDetail = lazy(() => import('./pages/GroupDetail'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#efeff4] dark:bg-[#1c1c1e]">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <PageFallback />;

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/groups/:id" element={
          <ProtectedRoute><GroupDetail /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" reverseOrder={false} />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  );
}
