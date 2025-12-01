// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, getUserRole } from "../firebase";

export default function ProtectedRoute({ children, requiredRole }: any) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return setAllowed(false);

      const role = await getUserRole(user.uid);
      setAllowed(role === requiredRole);
    });

    return () => unsubscribe();
  }, []);

  if (allowed === null) return null;

  if (!allowed) return <Navigate to="/student/login" replace />;

  return children;
}
