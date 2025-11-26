import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/login", element: <Login /> },
    { path: "/", element: <Navigate to="/login" replace /> },
    {
      path: "/agent",
      element: (
        <ProtectedRoute allowedRoles={["agent"]}>
          <Index />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      ),
    },
    {
      path: "/super-admin",
      element: (
        <ProtectedRoute allowedRoles={["super_admin"]}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      ),
    },
    {
      path: "/profile",
      element: (
        <ProtectedRoute allowedRoles={["agent", "admin", "super_admin"]}>
          <Profile />
        </ProtectedRoute>
      ),
    },
    { path: "*", element: <NotFound /> },
  ]
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
