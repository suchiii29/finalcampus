// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, getUserRole } from "../firebase";

export default function ProtectedRoute({ children, requiredRole }: any) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setAllowed(false);
        setUserRole(null);
        return;
      }

      try {
        const role = await getUserRole(user.uid);
        console.log("ProtectedRoute check - User role:", role, "Required:", requiredRole);
        setUserRole(role);
        
        // ✅ UPDATED: Handle both single role and array of roles
        let isAllowed = false;
        if (Array.isArray(requiredRole)) {
          // Check if user's role is in the array of allowed roles
          isAllowed = requiredRole.some(r => r?.toUpperCase() === role?.toUpperCase());
        } else {
          // Single role comparison (original behavior)
          isAllowed = role?.toUpperCase() === requiredRole?.toUpperCase();
        }
        
        setAllowed(isAllowed);
      } catch (error) {
        console.error("Error getting user role:", error);
        setAllowed(false);
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, [requiredRole]);

  // Show loading state
  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to appropriate login
  if (!allowed && !auth.currentUser) {
    // ✅ UPDATED: Handle array of required roles for redirect
    const roleToCheck = Array.isArray(requiredRole) ? requiredRole[0] : requiredRole;
    
    if (roleToCheck?.toUpperCase() === "ADMIN") {
      return <Navigate to="/admin/login" replace />;
    } else if (roleToCheck?.toUpperCase() === "DRIVER") {
      return <Navigate to="/driver/login" replace />;
    } else {
      return <Navigate to="/student/login" replace />;
    }
  }

  // Authenticated but wrong role - redirect to their correct dashboard
  if (!allowed && auth.currentUser && userRole) {
    console.log("Wrong role detected. User has:", userRole, "but needs:", requiredRole);
    if (userRole.toUpperCase() === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole.toUpperCase() === "DRIVER") {
      return <Navigate to="/driver/dashboard" replace />;
    } else if (userRole.toUpperCase() === "STUDENT" || userRole.toUpperCase() === "TEACHER") {
      return <Navigate to="/student/dashboard" replace />;
    }
    // If role is unknown, redirect to home
    return <Navigate to="/" replace />;
  }

  // Access granted
  return children;
}