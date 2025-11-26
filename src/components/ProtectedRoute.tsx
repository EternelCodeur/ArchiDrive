import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<"agent" | "admin" | "super_admin">;
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, booting } = useAuth();

  if (booting) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as "agent" | "admin" | "super_admin")) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
