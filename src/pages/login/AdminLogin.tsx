// src/pages/login/AdminLogin.tsx
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loginEmail, loginGoogle, getUserRole, logout } from "../../firebase";
import { auth } from "../../firebase";
import { Shield } from "lucide-react";

// ⚠️ AUTHORIZED ADMIN EMAIL - Only this email can access admin portal
const AUTHORIZED_ADMIN_EMAIL = "24ug1byai311@bmsit.in";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAndClear = async () => {
      if (auth.currentUser) {
        console.log("Clearing existing session for fresh admin login");
        await logout().catch(console.error);
      }
    };
    checkAndClear();
  }, []);

  const isAuthorizedAdmin = (userEmail: string | null): boolean => {
    if (!userEmail) return false;
    return userEmail.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();
  };

  const handleSuccess = async (user: any) => {
    if (!user || !user.email) {
      setErr("Login failed—no user returned.");
      setLoading(false);
      return;
    }

    try {
      console.log("User signed in:", user.uid, user.email);

      if (!isAuthorizedAdmin(user.email)) {
        setErr(`Unauthorized access.`);
        await logout();
        setLoading(false);
        return;
      }

      setSuccess("Verifying admin access...");
      await user.getIdToken(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      let role = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          role = await getUserRole(user.uid);
          if (role) {
            console.log("Found role:", role);
            break;
          }
        } catch (e: any) {
          console.log(`Attempt ${attempts + 1} failed:`, e);
        }

        attempts++;
        if (!role && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      if (!role) {
        setErr("Admin profile not found. Please contact system administrator.");
        await logout();
        setLoading(false);
        return;
      }

      if (role.toUpperCase() === "ADMIN") {
        console.log("✅ Admin access granted - redirecting to admin dashboard");
        setSuccess("Access granted! Redirecting to admin dashboard...");
        await new Promise(resolve => setTimeout(resolve, 500));

        window.location.replace("/admin/dashboard");
      } else {
        setErr(`This account does not have admin access.`);
        await logout();
        setLoading(false);
      }
    } catch (e: any) {
      console.error("Error during login:", e);
      setErr(e.message || "An error occurred during login.");
      try {
        await logout();
      } catch (signOutError) {
        console.error("Sign out error:", signOutError);
      }
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setErr("Please enter both email and password.");
      return;
    }

    if (!isAuthorizedAdmin(email)) {
      setErr("Unauthorized access.");
      return;
    }

    setErr(null);
    setSuccess(null);
    setLoading(true);

    try {
      setSuccess("Signing in...");
      const user = await loginEmail(email, password);
      await handleSuccess(user);
    } catch (e: any) {
      console.error("Sign in error:", e);

      let errorMessage = "Sign in failed.";
      if (e.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (e.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (e.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (e.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      } else if (e.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (e.message) {
        errorMessage = e.message;
      }

      setErr(errorMessage);
      setSuccess(null);
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErr(null);
    setSuccess(null);
    setLoading(true);

    try {
      setSuccess("Opening Google sign-in...");
      const user = await loginGoogle();

      if (!isAuthorizedAdmin(user.email)) {
        setErr("Unauthorized access.");
        await logout();
        setLoading(false);
        return;
      }

      await handleSuccess(user);
    } catch (e: any) {
      console.error("Google sign in error:", e);

      let errorMessage = "Google sign-in failed.";
      if (e.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed.";
      } else if (e.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in was cancelled.";
      } else if (e.message) {
        errorMessage = e.message;
      }

      setErr(errorMessage);
      setSuccess(null);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="max-w-md w-full p-8 shadow-2xl border-2">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-primary">BMSIT</h1>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Admin Portal</h2>
          <p className="text-sm text-muted-foreground mt-2">Authorized Access Only</p>
        </div>

        {err && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg">
            {err}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg">
            {success}
          </div>
        )}

        <label className="block text-sm mb-2 font-medium">Admin Email</label>
        <input
          className="w-full p-3 border rounded-lg mb-4 bg-background"
          placeholder="Enter admin email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <label className="block text-sm mb-2 font-medium">Password</label>
        <input
          className="w-full p-3 border rounded-lg mb-6 bg-background"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSignIn();
            }
          }}
        />

        <Button 
          onClick={handleSignIn} 
          disabled={loading}
          className="w-full mb-3 h-12 text-base font-semibold"
        >
          {loading ? "Signing in..." : "Sign In as Admin"}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">OR</span>
          </div>
        </div>

        <Button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 font-semibold"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? "Please wait..." : "Sign in with Google"}
        </Button>

        {/* UPDATED: Email removed */}
        <div className="mt-6 p-4 text-xs text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <strong className="text-yellow-800 dark:text-yellow-400">Security Notice</strong>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300">
            Only authorized admin accounts can access this portal.
          </p>
        </div>

        <div className="text-xs text-center text-muted-foreground mt-4">
          For support, contact: transport@bmsit.in
        </div>

      </Card>
    </div>
  );
}
