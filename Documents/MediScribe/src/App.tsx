import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SmartRoute } from "@/components/SmartRoute";
import { RootRedirect } from "@/components/RootRedirect";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AccountTypeSelection from "./pages/AccountTypeSelection";
import SignupSolo from "./pages/SignupSolo";
import SignupCabinet from "./pages/SignupCabinet";
import Dashboard from "./pages/Dashboard";
import Consultations from "./pages/Consultations";
import Settings from "./pages/Settings";
import Organization from "./pages/Organization";
import RecordPage from "./pages/RecordPage";
import ReportViewer from "./pages/ReportViewer";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
              {/* Route racine intelligente */}
              <Route path="/" element={<RootRedirect />} />
              
              {/* Routes d'authentification (uniquement pour non-connectés) */}
              <Route path="/login" element={<SmartRoute type="auth-only"><Login /></SmartRoute>} />
              <Route path="/signup" element={<SmartRoute type="auth-only"><Signup /></SmartRoute>} />
              <Route path="/account-type" element={<SmartRoute type="auth-only"><AccountTypeSelection /></SmartRoute>} />
              <Route path="/signup-solo" element={<SmartRoute type="auth-only"><SignupSolo /></SmartRoute>} />
              <Route path="/signup-cabinet" element={<SmartRoute type="auth-only"><SignupCabinet /></SmartRoute>} />
              
              {/* Routes protégées (uniquement pour connectés) */}
              <Route path="/dashboard" element={<SmartRoute type="protected"><Dashboard /></SmartRoute>} />
              <Route path="/dashboard/settings" element={<SmartRoute type="protected"><Settings /></SmartRoute>} />
              <Route path="/dashboard/organization" element={<SmartRoute type="protected"><Organization /></SmartRoute>} />
              <Route path="/dashboard/record" element={<SmartRoute type="protected"><RecordPage /></SmartRoute>} />
              <Route path="/dashboard/report" element={<SmartRoute type="protected"><ReportViewer /></SmartRoute>} />
              <Route path="/dashboard/consultations" element={<SmartRoute type="protected"><Consultations /></SmartRoute>} />
              <Route path="/dashboard/admin" element={<SmartRoute type="protected"><SuperAdmin /></SmartRoute>} />
              
              {/* Redirections pour compatibilité */}
              <Route path="/consultations" element={<Navigate to="/dashboard/consultations" replace />} />
              
              {/* Page d'accueil publique (redirige si connecté) */}
              <Route path="/home" element={<SmartRoute type="public"><Index /></SmartRoute>} />
              
              {/* 404 - Gère aussi les URLs incorrectes pour les connectés */}
              <Route path="*" element={<SmartRoute type="public"><NotFound /></SmartRoute>} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
